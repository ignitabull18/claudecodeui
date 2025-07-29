import express from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { spawn } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/db.js';

const router = express.Router();

// Active Claude Code sessions for subagent work
const activeClaudeSessions = new Map();
const subagentTasks = new Map();

// Agent Roles and Status (for UI organization only - Claude manages the actual agents)
const AGENT_ROLES = {
  ORCHESTRATOR: 'orchestrator',
  WORKER: 'worker',
  SPECIALIST: 'specialist',
  COORDINATOR: 'coordinator',
  MONITOR: 'monitor'
};

const AGENT_STATUS = {
  IDLE: 'idle',
  WORKING: 'working',
  WAITING: 'waiting',
  COMPLETED: 'completed',
  ERROR: 'error',
  OFFLINE: 'offline'
};

const TASK_STATUS = {
  PENDING: 'pending',
  ASSIGNED: 'assigned',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
};

// Helper function to get project directory
function getProjectDir(projectName) {
  return path.join(process.cwd(), 'projects', projectName);
}

// Start a Claude Code session for subagent work
async function startClaudeSession(projectName, sessionId) {
  return new Promise((resolve, reject) => {
    const projectDir = getProjectDir(projectName);
    
    console.log(`🚀 Starting Claude Code session for project: ${projectName}`);
    console.log(`📁 Project directory: ${projectDir}`);
    
    // Start Claude Code in the project directory
    const claudeProcess = spawn('claude', [], {
      cwd: projectDir,
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true
    });
    
    let outputBuffer = '';
    let errorBuffer = '';
    let isReady = false;
    
    claudeProcess.stdout.on('data', (data) => {
      const output = data.toString();
      outputBuffer += output;
      
      console.log(`📤 Claude Output: ${output.trim()}`);
      
      // Look for Claude's ready prompt or initial message
      if (!isReady && (output.includes('How can I help') || output.includes('What would you like'))) {
        isReady = true;
        console.log('✅ Claude Code session is ready');
        resolve(claudeProcess);
      }
      
      // Parse Task output
      parseTaskOutput(sessionId, output);
    });
    
    claudeProcess.stderr.on('data', (data) => {
      const error = data.toString();
      errorBuffer += error;
      console.log(`📤 Claude Error: ${error.trim()}`);
    });
    
    claudeProcess.on('error', (error) => {
      console.error(`💥 Failed to start Claude Code: ${error.message}`);
      reject(error);
    });
    
    claudeProcess.on('close', (code) => {
      console.log(`🔴 Claude Code session closed with code: ${code}`);
      activeClaudeSessions.delete(sessionId);
    });
    
    // Store the session
    activeClaudeSessions.set(sessionId, {
      process: claudeProcess,
      projectName,
      sessionId,
      startTime: Date.now(),
      outputBuffer: '',
      tasks: new Map()
    });
    
    // Timeout if Claude doesn't start
    setTimeout(() => {
      if (!isReady) {
        console.error('❌ Claude Code session timeout');
        claudeProcess.kill();
        reject(new Error('Claude Code session timeout'));
      }
    }, 30000);
  });
}

// Send a prompt to Claude Code to create subagents
async function createSubagents(sessionId, subagentPrompt) {
  const session = activeClaudeSessions.get(sessionId);
  if (!session) {
    throw new Error('No active Claude Code session');
  }
  
  console.log(`📝 Sending subagent prompt to Claude: ${subagentPrompt}`);
  
  // Send the prompt to Claude Code
  session.process.stdin.write(subagentPrompt + '\n');
  
  return { success: true, message: 'Subagent prompt sent to Claude Code' };
}

// Parse Claude's Task() output to track subagents
function parseTaskOutput(sessionId, output) {
  const session = activeClaudeSessions.get(sessionId);
  if (!session) return;
  
  // Look for Task lines like: ● Task(Explore backend structure)
  const taskStartRegex = /● Task\(([^)]+)\)/g;
  const taskCompleteRegex = /⎿\s+Done \((\d+) tool uses · ([\d.]+k) tokens · ([^)]+)\)/g;
  
  let match;
  
  // Parse task starts
  while ((match = taskStartRegex.exec(output)) !== null) {
    const taskDescription = match[1];
    const taskId = uuidv4();
    
    console.log(`🎯 Detected new subagent task: ${taskDescription}`);
    
    const task = {
      id: taskId,
      description: taskDescription,
      status: TASK_STATUS.IN_PROGRESS,
      startTime: Date.now(),
      sessionId,
      toolUses: 0,
      tokens: 0,
      duration: null
    };
    
    session.tasks.set(taskId, task);
    subagentTasks.set(taskId, task);
    
    // Store in database
    try {
      const stmt = db.prepare(`
        INSERT INTO agent_tasks (id, agent_id, title, description, status, project_id, session_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(taskId, 'claude-subagent', taskDescription, taskDescription, TASK_STATUS.IN_PROGRESS, session.projectName, sessionId);
    } catch (error) {
      console.warn('Failed to store task in database:', error.message);
    }
  }
  
  // Parse task completions
  while ((match = taskCompleteRegex.exec(output)) !== null) {
    const toolUses = parseInt(match[1]);
    const tokens = match[2];
    const duration = match[3];
    
    console.log(`✅ Subagent task completed: ${toolUses} tools, ${tokens} tokens, ${duration}`);
    
    // Find the most recent in-progress task and mark it complete
    for (const [taskId, task] of session.tasks) {
      if (task.status === TASK_STATUS.IN_PROGRESS) {
        task.status = TASK_STATUS.COMPLETED;
        task.toolUses = toolUses;
        task.tokens = tokens;
        task.duration = duration;
        task.endTime = Date.now();
        
        // Update database
        try {
          const stmt = db.prepare(`
            UPDATE agent_tasks 
            SET status = ?, result = ?, completed_at = CURRENT_TIMESTAMP 
            WHERE id = ?
          `);
          stmt.run(TASK_STATUS.COMPLETED, JSON.stringify({
            toolUses,
            tokens,
            duration,
            completed: true
          }), taskId);
  } catch (error) {
          console.warn('Failed to update task in database:', error.message);
        }
        
        break;
      }
    }
  }
}

// Initialize database tables (simplified for Claude CLI wrapper)
function initializeSubagentsTables() {
  try {
    // Keep minimal tables for tracking Claude's subagents
    db.exec(`
      CREATE TABLE IF NOT EXISTS claude_sessions (
        id TEXT PRIMARY KEY,
        project_name TEXT NOT NULL,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS agent_tasks (
        id TEXT PRIMARY KEY,
        agent_id TEXT DEFAULT 'claude-subagent',
        title TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'pending',
        result TEXT,
        project_id TEXT,
        session_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME
      )
    `);

    console.log('✅ Subagents database tables initialized');
  } catch (error) {
    console.error('❌ Failed to initialize subagents tables:', error);
  }
}

// Initialize tables
initializeSubagentsTables();

// GET /api/subagents/sessions - List active Claude Code sessions
router.get('/sessions', async (req, res) => {
  try {
    const sessions = [];
    
    for (const [sessionId, session] of activeClaudeSessions) {
      sessions.push({
        id: sessionId,
        projectName: session.projectName,
        startTime: session.startTime,
        status: 'active',
        tasksCount: session.tasks.size
      });
    }
    
    res.json({
      success: true,
      sessions
    });
  } catch (error) {
    console.error('Failed to list sessions:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/subagents/sessions - Start new Claude Code session
router.post('/sessions', async (req, res) => {
  try {
    const { projectName } = req.body;
    
    if (!projectName) {
      return res.status(400).json({
        success: false,
        error: 'Project name is required'
      });
    }
    
    const sessionId = uuidv4();
    
    // Start Claude Code session
    await startClaudeSession(projectName, sessionId);
    
    // Store in database
    const stmt = db.prepare(`
      INSERT INTO claude_sessions (id, project_name)
      VALUES (?, ?)
    `);
    stmt.run(sessionId, projectName);
    
    res.json({
      success: true,
      sessionId,
      message: 'Claude Code session started'
    });
    
  } catch (error) {
    console.error('Failed to start session:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/subagents/sessions/:sessionId/prompt - Send subagent creation prompt
router.post('/sessions/:sessionId/prompt', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { prompt } = req.body;
    
    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: 'Prompt is required'
      });
    }
    
    await createSubagents(sessionId, prompt);
    
    res.json({
      success: true,
      message: 'Prompt sent to Claude Code'
    });
    
  } catch (error) {
    console.error('Failed to send prompt:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/subagents/sessions/:sessionId/tasks - Get tasks for session
router.get('/sessions/:sessionId/tasks', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = activeClaudeSessions.get(sessionId);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }
    
    const tasks = Array.from(session.tasks.values());
    
    res.json({
      success: true,
      tasks
    });
    
  } catch (error) {
    console.error('Failed to get tasks:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/subagents/sessions/:sessionId - Close Claude Code session
router.delete('/sessions/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = activeClaudeSessions.get(sessionId);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }
    
    // Close Claude Code process
    session.process.kill('SIGTERM');
    activeClaudeSessions.delete(sessionId);
    
    // Update database
    const stmt = db.prepare(`
      UPDATE claude_sessions 
      SET status = 'closed', updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `);
    stmt.run(sessionId);
    
    res.json({
      success: true,
      message: 'Claude Code session closed'
    });
    
  } catch (error) {
    console.error('Failed to close session:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Cleanup on process exit
process.on('SIGTERM', () => {
  console.log('🔴 Shutting down Claude Code sessions...');
  for (const [sessionId, session] of activeClaudeSessions) {
    session.process.kill('SIGTERM');
  }
});

process.on('SIGINT', () => {
  console.log('🔴 Shutting down Claude Code sessions...');
  for (const [sessionId, session] of activeClaudeSessions) {
    session.process.kill('SIGTERM');
  }
  process.exit(0);
});

export default router; 