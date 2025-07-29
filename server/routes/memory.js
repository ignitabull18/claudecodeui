import express from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/db.js';

const router = express.Router();

const MEMORY_SCOPES = {
  GLOBAL: 'global',
  PROJECT: 'project', 
  SESSION: 'session'
};

const MEMORY_TYPES = {
  INSTRUCTIONS: 'instructions',
  CONTEXT: 'context',
  PREFERENCES: 'preferences',
  COMMANDS: 'commands',
  TEMPLATES: 'templates'
};

// Helper function to get memory data directory
function getMemoryDataDir() {
  return path.join(os.homedir(), '.claude-code-ui', 'memory');
}

// Helper function to ensure directory exists
async function ensureDir(dirPath) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
  }
}

// Initialize memory database tables
function initializeMemoryTables() {
  try {
    // Memory items table
    db.exec(`
      CREATE TABLE IF NOT EXISTS memory_items (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        type TEXT NOT NULL,
        scope TEXT NOT NULL,
        project_id TEXT,
        session_id TEXT,
        auto_inject BOOLEAN DEFAULT 1,
        tags TEXT DEFAULT '[]',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Memory history table
    db.exec(`
      CREATE TABLE IF NOT EXISTS memory_history (
        id TEXT PRIMARY KEY,
        memory_id TEXT NOT NULL,
        action TEXT NOT NULL,
        changes TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (memory_id) REFERENCES memory_items (id)
      )
    `);

    // Context injection log
    db.exec(`
      CREATE TABLE IF NOT EXISTS memory_context_log (
        id TEXT PRIMARY KEY,
        memory_id TEXT NOT NULL,
        session_id TEXT,
        injected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        context_hash TEXT,
        FOREIGN KEY (memory_id) REFERENCES memory_items (id)
      )
    `);

    // Indexes for better performance
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_memory_scope ON memory_items(scope);
      CREATE INDEX IF NOT EXISTS idx_memory_project ON memory_items(project_id);
      CREATE INDEX IF NOT EXISTS idx_memory_session ON memory_items(session_id);
      CREATE INDEX IF NOT EXISTS idx_memory_type ON memory_items(type);
      CREATE INDEX IF NOT EXISTS idx_memory_auto_inject ON memory_items(auto_inject);
      CREATE INDEX IF NOT EXISTS idx_history_memory ON memory_history(memory_id);
      CREATE INDEX IF NOT EXISTS idx_context_session ON memory_context_log(session_id);
    `);

    console.log('Memory tables initialized successfully');
  } catch (error) {
    console.error('Failed to initialize memory tables:', error);
  }
}

// Initialize tables on module load
initializeMemoryTables();

// Generate CLAUDE.md file path for different scopes
function getClaudeMdPath(scope, projectPath = null) {
  switch (scope) {
    case MEMORY_SCOPES.GLOBAL:
      return path.join(os.homedir(), '.claude', 'CLAUDE.md');
    case MEMORY_SCOPES.PROJECT:
      return projectPath ? path.join(projectPath, 'CLAUDE.md') : './CLAUDE.md';
    case MEMORY_SCOPES.SESSION:
      return projectPath ? path.join(projectPath, '.claude', 'session.md') : './.claude/session.md';
    default:
      return './CLAUDE.md';
  }
}

// Save memory history entry
function saveMemoryHistory(memoryId, action, changes = null) {
  try {
    const historyId = uuidv4();
    const stmt = db.prepare(`
      INSERT INTO memory_history (id, memory_id, action, changes)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(historyId, memoryId, action, changes);
  } catch (error) {
    console.error('Failed to save memory history:', error);
  }
}

// GET /api/memory/list - Get all memories with stats
router.post('/list', async (req, res) => {
  try {
    const { projectId, sessionId } = req.body;

    // Get all memories organized by scope
    const memories = {};
    const stats = {};

    for (const scope of Object.values(MEMORY_SCOPES)) {
      let query = 'SELECT * FROM memory_items WHERE scope = ?';
      let params = [scope];

      // Add project/session filtering
      if (scope === MEMORY_SCOPES.PROJECT && projectId) {
        query += ' AND (project_id = ? OR project_id IS NULL)';
        params.push(projectId);
      } else if (scope === MEMORY_SCOPES.SESSION && sessionId) {
        query += ' AND (session_id = ? OR session_id IS NULL)';
        params.push(sessionId);
      }

      query += ' ORDER BY updated_at DESC';

      const stmt = db.prepare(query);
      const results = stmt.all(...params);

      memories[scope] = {};
      results.forEach(memory => {
        memories[scope][memory.id] = {
          ...memory,
          tags: JSON.parse(memory.tags || '[]'),
          auto_inject: Boolean(memory.auto_inject)
        };
      });

      // Get stats for this scope
      const countStmt = db.prepare('SELECT COUNT(*) as count FROM memory_items WHERE scope = ?');
      const countResult = countStmt.get(scope);
      stats[scope] = { count: countResult.count };
    }

    res.json({ memories, stats });
  } catch (error) {
    console.error('Failed to list memories:', error);
    res.status(500).json({ error: 'Failed to list memories' });
  }
});

// POST /api/memory/save - Save or update memory
router.post('/save', async (req, res) => {
  try {
    const {
      id,
      title,
      content,
      type,
      scope,
      projectId,
      sessionId,
      autoInject = true,
      tags = []
    } = req.body;

    const memoryId = id || uuidv4();
    const now = new Date().toISOString();
    const tagsJson = JSON.stringify(tags);

    if (id) {
      // Update existing memory
      const stmt = db.prepare(`
        UPDATE memory_items 
        SET title = ?, content = ?, type = ?, scope = ?, project_id = ?, 
            session_id = ?, auto_inject = ?, tags = ?, updated_at = ?
        WHERE id = ?
      `);
      stmt.run(title, content, type, scope, projectId || null, sessionId || null, 
               autoInject ? 1 : 0, tagsJson, now, id);
      
      saveMemoryHistory(memoryId, 'updated', 'Memory content updated');
    } else {
      // Create new memory
      const stmt = db.prepare(`
        INSERT INTO memory_items 
        (id, title, content, type, scope, project_id, session_id, auto_inject, tags, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(memoryId, title, content, type, scope, projectId || null, sessionId || null, 
               autoInject ? 1 : 0, tagsJson, now, now);
      
      saveMemoryHistory(memoryId, 'created', 'Memory created');
    }

    // Auto-generate CLAUDE.md file if enabled
    if (autoInject) {
      await updateClaudeMdFile(scope, projectId);
    }

    // Get the saved memory
    const stmt = db.prepare('SELECT * FROM memory_items WHERE id = ?');
    const savedMemory = stmt.get(memoryId);
    
    res.json({
      ...savedMemory,
      tags: JSON.parse(savedMemory.tags || '[]'),
      auto_inject: Boolean(savedMemory.auto_inject)
    });
  } catch (error) {
    console.error('Failed to save memory:', error);
    res.status(500).json({ error: 'Failed to save memory' });
  }
});

// DELETE /api/memory/delete/:id - Delete memory
router.delete('/delete/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Get memory info before deletion
    const stmt = db.prepare('SELECT * FROM memory_items WHERE id = ?');
    const memory = stmt.get(id);

    if (!memory) {
      return res.status(404).json({ error: 'Memory not found' });
    }

    // Delete memory
    const deleteStmt = db.prepare('DELETE FROM memory_items WHERE id = ?');
    deleteStmt.run(id);

    // Save history
    saveMemoryHistory(id, 'deleted', 'Memory deleted');

    // Update CLAUDE.md file if it was auto-injected
    if (memory.auto_inject) {
      await updateClaudeMdFile(memory.scope, memory.project_id);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete memory:', error);
    res.status(500).json({ error: 'Failed to delete memory' });
  }
});

// GET /api/memory/history/:id - Get memory history
router.get('/history/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const stmt = db.prepare(`
      SELECT * FROM memory_history 
      WHERE memory_id = ? 
      ORDER BY timestamp DESC 
      LIMIT 50
    `);
    const history = stmt.all(id);

    res.json(history);
  } catch (error) {
    console.error('Failed to get memory history:', error);
    res.status(500).json({ error: 'Failed to get memory history' });
  }
});

// POST /api/memory/generate-claude-md - Generate CLAUDE.md file
router.post('/generate-claude-md', async (req, res) => {
  try {
    const { scope, projectId, sessionId } = req.body;

    const content = await generateClaudeMdContent(scope, projectId, sessionId);
    const filePath = getClaudeMdPath(scope);

    res.json({ content, path: filePath });
  } catch (error) {
    console.error('Failed to generate CLAUDE.md:', error);
    res.status(500).json({ error: 'Failed to generate CLAUDE.md' });
  }
});

// POST /api/memory/auto-update - Auto-update memory from context
router.post('/auto-update', async (req, res) => {
  try {
    const { context, type, scope, projectId, sessionId } = req.body;

    // Extract meaningful information from context
    const insights = await extractContextInsights(context, type);
    
    if (insights.length === 0) {
      return res.json({ updated: false, message: 'No actionable insights found' });
    }

    // Update or create memories based on insights
    let updatedCount = 0;
    
    for (const insight of insights) {
      const memoryId = uuidv4();
      const now = new Date().toISOString();

      const stmt = db.prepare(`
        INSERT INTO memory_items 
        (id, title, content, type, scope, project_id, session_id, auto_inject, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
      `);
      
      stmt.run(
        memoryId,
        insight.title,
        insight.content,
        type,
        scope,
        projectId || null,
        sessionId || null,
        now,
        now
      );

      saveMemoryHistory(memoryId, 'auto-created', 'Auto-created from context');
      updatedCount++;
    }

    // Update CLAUDE.md file
    await updateClaudeMdFile(scope, projectId);

    res.json({ 
      updated: true, 
      count: updatedCount,
      message: `Auto-updated ${updatedCount} memories from context`
    });
  } catch (error) {
    console.error('Failed to auto-update memory:', error);
    res.status(500).json({ error: 'Failed to auto-update memory' });
  }
});

// GET /api/memory/context/:sessionId - Get context for injection
router.get('/context/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { projectId, scope = 'all' } = req.query;

    let query = 'SELECT * FROM memory_items WHERE auto_inject = 1';
    let params = [];

    if (scope !== 'all') {
      query += ' AND scope = ?';
      params.push(scope);
    }

    if (projectId) {
      query += ' AND (project_id = ? OR project_id IS NULL)';
      params.push(projectId);
    }

    query += ' ORDER BY scope, updated_at DESC';

    const stmt = db.prepare(query);
    const memories = stmt.all(...params);

    // Log context injection
    const contextHash = generateContextHash(memories);
    memories.forEach(memory => {
      const logStmt = db.prepare(`
        INSERT INTO memory_context_log (id, memory_id, session_id, context_hash)
        VALUES (?, ?, ?, ?)
      `);
      logStmt.run(uuidv4(), memory.id, sessionId, contextHash);
    });

    // Format memories for context injection
    const contextData = memories.map(memory => ({
      id: memory.id,
      title: memory.title,
      content: memory.content,
      type: memory.type,
      scope: memory.scope,
      tags: JSON.parse(memory.tags || '[]')
    }));

    res.json({ context: contextData, hash: contextHash });
  } catch (error) {
    console.error('Failed to get context:', error);
    res.status(500).json({ error: 'Failed to get context' });
  }
});

// Helper function to generate CLAUDE.md content
async function generateClaudeMdContent(scope, projectId = null, sessionId = null) {
  let query = 'SELECT * FROM memory_items WHERE scope = ? AND auto_inject = 1';
  let params = [scope];

  if (scope === MEMORY_SCOPES.PROJECT && projectId) {
    query += ' AND (project_id = ? OR project_id IS NULL)';
    params.push(projectId);
  } else if (scope === MEMORY_SCOPES.SESSION && sessionId) {
    query += ' AND (session_id = ? OR session_id IS NULL)';
    params.push(sessionId);
  }

  query += ' ORDER BY type, updated_at DESC';

  const stmt = db.prepare(query);
  const memories = stmt.all(...params);

  // Generate markdown content
  let content = `# CLAUDE.md - ${scope.toUpperCase()} Memory\n\n`;
  content += `Generated on: ${new Date().toISOString()}\n\n`;

  // Group by type
  const groupedMemories = {};
  memories.forEach(memory => {
    if (!groupedMemories[memory.type]) {
      groupedMemories[memory.type] = [];
    }
    groupedMemories[memory.type].push(memory);
  });

  // Generate sections
  for (const [type, typeMemories] of Object.entries(groupedMemories)) {
    content += `## ${type.charAt(0).toUpperCase() + type.slice(1)}\n\n`;
    
    typeMemories.forEach(memory => {
      content += `### ${memory.title}\n\n`;
      content += `${memory.content}\n\n`;
      
      const tags = JSON.parse(memory.tags || '[]');
      if (tags.length > 0) {
        content += `*Tags: ${tags.join(', ')}*\n\n`;
      }
      
      content += '---\n\n';
    });
  }

  return content;
}

// Helper function to update CLAUDE.md file
async function updateClaudeMdFile(scope, projectId = null) {
  try {
    const content = await generateClaudeMdContent(scope, projectId);
    const filePath = getClaudeMdPath(scope);
    
    // Ensure directory exists
    await ensureDir(path.dirname(filePath));
    
    // Write file
    await fs.writeFile(filePath, content, 'utf8');
    
    console.log(`Updated CLAUDE.md file: ${filePath}`);
  } catch (error) {
    console.error('Failed to update CLAUDE.md file:', error);
  }
}

// Helper function to extract insights from context
async function extractContextInsights(context, type) {
  const insights = [];
  
  // Simple pattern-based extraction (can be enhanced with AI)
  const patterns = {
    [MEMORY_TYPES.COMMANDS]: [
      /(?:run|execute|use)\s+`([^`]+)`/gi,
      /(?:command|cmd):\s*([^\n]+)/gi
    ],
    [MEMORY_TYPES.PREFERENCES]: [
      /(?:prefer|use|always|never)\s+([^\n]+)/gi,
      /(?:setting|config|preference):\s*([^\n]+)/gi
    ],
    [MEMORY_TYPES.INSTRUCTIONS]: [
      /(?:remember|note|important):\s*([^\n]+)/gi,
      /(?:always|never|when)?\s*([^\n.!?]{20,})/gi
    ]
  };

  if (patterns[type]) {
    patterns[type].forEach(pattern => {
      const matches = context.matchAll(pattern);
      for (const match of matches) {
        if (match[1] && match[1].trim().length > 10) {
          insights.push({
            title: `Auto-extracted ${type}`,
            content: match[1].trim()
          });
        }
      }
    });
  }

  // Remove duplicates and limit count
  const uniqueInsights = insights.filter((insight, index, self) => 
    index === self.findIndex(i => i.content === insight.content)
  ).slice(0, 5);

  return uniqueInsights;
}

// Helper function to generate context hash
function generateContextHash(memories) {
  const content = memories.map(m => `${m.id}:${m.updated_at}`).join('|');
  return Buffer.from(content).toString('base64').substring(0, 16);
}

export default router; 