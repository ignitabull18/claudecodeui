import express from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';
import { getSessions, getSessionMessages } from '../projects.js';

const router = express.Router();

// Helper function to get session tags directory
function getSessionTagsDir() {
  const homeDir = os.homedir();
  return path.join(homeDir, '.claude', 'session-tags');
}

// Helper function to get session templates directory
function getSessionTemplatesDir() {
  const homeDir = os.homedir();
  return path.join(homeDir, '.claude', 'session-templates');
}

// Helper function to ensure directory exists
async function ensureDir(dirPath) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
}

// Helper function to get project session tags file
function getProjectSessionTagsFile(projectName) {
  return path.join(getSessionTagsDir(), `${projectName}.json`);
}

// Helper function to load session tags for a project
async function loadSessionTags(projectName) {
  try {
    const tagsFile = getProjectSessionTagsFile(projectName);
    const data = await fs.readFile(tagsFile, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { sessionTags: {}, availableTags: [] };
    }
    throw error;
  }
}

// Helper function to save session tags for a project
async function saveSessionTags(projectName, sessionTags, availableTags) {
  const tagsDir = getSessionTagsDir();
  await ensureDir(tagsDir);
  
  const tagsFile = getProjectSessionTagsFile(projectName);
  const data = {
    sessionTags,
    availableTags,
    lastUpdated: new Date().toISOString()
  };
  
  await fs.writeFile(tagsFile, JSON.stringify(data, null, 2), 'utf-8');
}

// Helper function to create a branch session
async function createBranchSession(projectName, originalSessionId, fromMessageIndex, newPrompt, branchName) {
  const newSessionId = uuidv4();
  const projectDir = path.join(os.homedir(), '.claude', 'projects', projectName);
  
  // Get original session messages up to the branch point
  const originalMessages = await getSessionMessages(projectName, originalSessionId);
  const branchMessages = originalMessages.slice(0, fromMessageIndex + 1);
  
  // Create new JSONL file for the branch
  const timestamp = new Date().toISOString();
  const branchFileName = `${timestamp.replace(/:/g, '-')}.jsonl`;
  const branchFilePath = path.join(projectDir, branchFileName);
  
  // Write branch metadata and messages
  const branchEntries = [
    // Mark as branched session
    {
      type: 'branch',
      sessionId: newSessionId,
      parentSessionId: originalSessionId,
      branchPoint: fromMessageIndex,
      branchName: branchName,
      newPrompt: newPrompt,
      timestamp: timestamp
    },
    // Copy messages up to branch point
    ...branchMessages.map(msg => ({
      ...msg,
      sessionId: newSessionId,
      timestamp: msg.timestamp || timestamp
    })),
    // Add the new prompt as first message in branch
    {
      sessionId: newSessionId,
      message: {
        role: 'user',
        content: newPrompt
      },
      timestamp: timestamp,
      type: 'message'
    }
  ];
  
  // Write to JSONL file
  const jsonlContent = branchEntries.map(entry => JSON.stringify(entry)).join('\n');
  await fs.writeFile(branchFilePath, jsonlContent + '\n', 'utf-8');
  
  return { newSessionId, branchFilePath };
}

// GET /api/projects/:projectName/session-tags - Get session tags for a project
router.get('/:projectName/session-tags', async (req, res) => {
  try {
    const { projectName } = req.params;
    const tagsData = await loadSessionTags(projectName);
    
    res.json({
      success: true,
      sessionTags: tagsData.sessionTags || {},
      lastUpdated: tagsData.lastUpdated
    });
  } catch (error) {
    console.error('Error loading session tags:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load session tags',
      details: error.message
    });
  }
});

// GET /api/projects/:projectName/available-tags - Get available tags for a project
router.get('/:projectName/available-tags', async (req, res) => {
  try {
    const { projectName } = req.params;
    const tagsData = await loadSessionTags(projectName);
    
    res.json({
      success: true,
      tags: tagsData.availableTags || []
    });
  } catch (error) {
    console.error('Error loading available tags:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load available tags',
      details: error.message
    });
  }
});

// POST /api/projects/:projectName/sessions/:sessionId/tags - Add tag to session
router.post('/:projectName/sessions/:sessionId/tags', async (req, res) => {
  try {
    const { projectName, sessionId } = req.params;
    const { tag } = req.body;
    
    if (!tag || typeof tag !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Tag is required and must be a string'
      });
    }
    
    const tagsData = await loadSessionTags(projectName);
    const sessionTags = tagsData.sessionTags || {};
    const availableTags = tagsData.availableTags || [];
    
    // Add tag to session
    if (!sessionTags[sessionId]) {
      sessionTags[sessionId] = [];
    }
    
    if (!sessionTags[sessionId].includes(tag)) {
      sessionTags[sessionId].push(tag);
    }
    
    // Add to available tags if not already there
    if (!availableTags.includes(tag)) {
      availableTags.push(tag);
    }
    
    await saveSessionTags(projectName, sessionTags, availableTags);
    
    res.json({
      success: true,
      sessionTags: sessionTags[sessionId],
      availableTags
    });
  } catch (error) {
    console.error('Error adding session tag:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add session tag',
      details: error.message
    });
  }
});

// DELETE /api/projects/:projectName/sessions/:sessionId/tags - Remove tag from session
router.delete('/:projectName/sessions/:sessionId/tags', async (req, res) => {
  try {
    const { projectName, sessionId } = req.params;
    const { tag } = req.body;
    
    if (!tag || typeof tag !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Tag is required and must be a string'
      });
    }
    
    const tagsData = await loadSessionTags(projectName);
    const sessionTags = tagsData.sessionTags || {};
    const availableTags = tagsData.availableTags || [];
    
    // Remove tag from session
    if (sessionTags[sessionId]) {
      sessionTags[sessionId] = sessionTags[sessionId].filter(t => t !== tag);
      
      // Remove session entry if no tags left
      if (sessionTags[sessionId].length === 0) {
        delete sessionTags[sessionId];
      }
    }
    
    await saveSessionTags(projectName, sessionTags, availableTags);
    
    res.json({
      success: true,
      sessionTags: sessionTags[sessionId] || [],
      availableTags
    });
  } catch (error) {
    console.error('Error removing session tag:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove session tag',
      details: error.message
    });
  }
});

// POST /api/projects/:projectName/sessions/:sessionId/branch - Create a branch from a session
router.post('/:projectName/sessions/:sessionId/branch', async (req, res) => {
  try {
    const { projectName, sessionId } = req.params;
    const { fromMessageIndex, newPrompt, branchName } = req.body;
    
    if (typeof fromMessageIndex !== 'number' || !newPrompt || !branchName) {
      return res.status(400).json({
        success: false,
        error: 'fromMessageIndex, newPrompt, and branchName are required'
      });
    }
    
    console.log(`🌿 Creating branch from session ${sessionId} at message ${fromMessageIndex}`);
    
    const { newSessionId, branchFilePath } = await createBranchSession(
      projectName, 
      sessionId, 
      fromMessageIndex, 
      newPrompt, 
      branchName
    );
    
    // Add branch metadata to tags (for tracking)
    const tagsData = await loadSessionTags(projectName);
    const sessionTags = tagsData.sessionTags || {};
    const availableTags = tagsData.availableTags || [];
    
    // Add 'branched' tag to new session
    sessionTags[newSessionId] = ['branched'];
    if (!availableTags.includes('branched')) {
      availableTags.push('branched');
    }
    
    await saveSessionTags(projectName, sessionTags, availableTags);
    
    res.json({
      success: true,
      newSessionId,
      branchName,
      parentSessionId: sessionId,
      branchPoint: fromMessageIndex,
      message: 'Branch created successfully'
    });
  } catch (error) {
    console.error('Error creating branch:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create branch',
      details: error.message
    });
  }
});

// POST /api/projects/:projectName/sessions/export - Export sessions
router.post('/:projectName/sessions/export', async (req, res) => {
  try {
    const { projectName } = req.params;
    const { sessionIds, format = 'json' } = req.body;
    
    if (!sessionIds || !Array.isArray(sessionIds)) {
      return res.status(400).json({
        success: false,
        error: 'sessionIds array is required'
      });
    }
    
    console.log(`📤 Exporting ${sessionIds.length} sessions in ${format} format`);
    
    // Get session data and messages
    const exportData = {
      exportInfo: {
        projectName,
        exportDate: new Date().toISOString(),
        format,
        sessionCount: sessionIds.length,
        version: '1.0'
      },
      sessions: []
    };
    
    // Load session tags
    const tagsData = await loadSessionTags(projectName);
    const sessionTags = tagsData.sessionTags || {};
    
    // Get all sessions for the project
    const allSessions = await getSessions(projectName, 1000, 0); // Get many sessions
    
    for (const sessionId of sessionIds) {
      const session = allSessions.sessions.find(s => s.id === sessionId);
      if (session) {
        const messages = await getSessionMessages(projectName, sessionId);
        
        exportData.sessions.push({
          ...session,
          messages,
          tags: sessionTags[sessionId] || [],
          exported: new Date().toISOString()
        });
      }
    }
    
    let exportContent;
    let contentType;
    let fileExtension;
    
    switch (format) {
      case 'json':
        exportContent = JSON.stringify(exportData, null, 2);
        contentType = 'application/json';
        fileExtension = 'json';
        break;
        
      case 'markdown':
        exportContent = generateMarkdownExport(exportData);
        contentType = 'text/markdown';
        fileExtension = 'md';
        break;
        
      case 'csv':
        exportContent = generateCSVExport(exportData);
        contentType = 'text/csv';
        fileExtension = 'csv';
        break;
        
      case 'txt':
        exportContent = generateTextExport(exportData);
        contentType = 'text/plain';
        fileExtension = 'txt';
        break;
        
      default:
        return res.status(400).json({
          success: false,
          error: 'Unsupported export format'
        });
    }
    
    const fileName = `${projectName}-sessions-${new Date().toISOString().split('T')[0]}.${fileExtension}`;
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(exportContent);
    
  } catch (error) {
    console.error('Error exporting sessions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export sessions',
      details: error.message
    });
  }
});

// Helper functions for different export formats
function generateMarkdownExport(exportData) {
  let markdown = `# Session Export: ${exportData.exportInfo.projectName}\n\n`;
  markdown += `**Export Date:** ${new Date(exportData.exportInfo.exportDate).toLocaleDateString()}\n`;
  markdown += `**Sessions:** ${exportData.exportInfo.sessionCount}\n\n`;
  
  exportData.sessions.forEach((session, index) => {
    markdown += `## Session ${index + 1}: ${session.summary}\n\n`;
    markdown += `**Session ID:** ${session.id}\n`;
    markdown += `**Last Activity:** ${new Date(session.lastActivity).toLocaleDateString()}\n`;
    markdown += `**Message Count:** ${session.messageCount || 0}\n`;
    
    if (session.tags && session.tags.length > 0) {
      markdown += `**Tags:** ${session.tags.join(', ')}\n`;
    }
    
    markdown += '\n### Messages\n\n';
    
    session.messages.forEach((message, msgIndex) => {
      if (message.message) {
        const role = message.message.role === 'user' ? '**User**' : '**Assistant**';
        markdown += `${msgIndex + 1}. ${role}: ${message.message.content}\n\n`;
      }
    });
    
    markdown += '---\n\n';
  });
  
  return markdown;
}

function generateCSVExport(exportData) {
  const csvLines = [];
  csvLines.push('Session ID,Summary,Last Activity,Message Count,Tags');
  
  exportData.sessions.forEach(session => {
    const line = [
      session.id,
      `"${session.summary.replace(/"/g, '""')}"`,
      session.lastActivity,
      session.messageCount || 0,
      `"${(session.tags || []).join(', ')}"`
    ].join(',');
    csvLines.push(line);
  });
  
  return csvLines.join('\n');
}

function generateTextExport(exportData) {
  let text = `SESSION EXPORT: ${exportData.exportInfo.projectName.toUpperCase()}\n`;
  text += `Export Date: ${new Date(exportData.exportInfo.exportDate).toLocaleDateString()}\n`;
  text += `Sessions: ${exportData.exportInfo.sessionCount}\n`;
  text += '='.repeat(60) + '\n\n';
  
  exportData.sessions.forEach((session, index) => {
    text += `SESSION ${index + 1}: ${session.summary}\n`;
    text += '-'.repeat(40) + '\n';
    text += `ID: ${session.id}\n`;
    text += `Last Activity: ${new Date(session.lastActivity).toLocaleDateString()}\n`;
    text += `Messages: ${session.messageCount || 0}\n`;
    
    if (session.tags && session.tags.length > 0) {
      text += `Tags: ${session.tags.join(', ')}\n`;
    }
    
    text += '\nMESSAGES:\n';
    
    session.messages.forEach((message, msgIndex) => {
      if (message.message) {
        const role = message.message.role === 'user' ? 'USER' : 'ASSISTANT';
        text += `${msgIndex + 1}. ${role}: ${message.message.content}\n\n`;
      }
    });
    
    text += '='.repeat(60) + '\n\n';
  });
  
  return text;
}

// GET /api/projects/:projectName/sessions/search - Advanced session search
router.get('/:projectName/sessions/search', async (req, res) => {
  try {
    const { projectName } = req.params;
    const { 
      query = '', 
      timeRange = 'all',
      messageCount = '',
      sessionType = '',
      tags = '',
      sortBy = 'lastActivity',
      sortOrder = 'desc',
      limit = 50,
      offset = 0
    } = req.query;
    
    console.log(`🔍 Searching sessions for project: ${projectName}`);
    
    // Get all sessions
    const allSessions = await getSessions(projectName, 1000, 0);
    const tagsData = await loadSessionTags(projectName);
    const sessionTags = tagsData.sessionTags || {};
    
    // Apply filters
    let filteredSessions = allSessions.sessions.filter(session => {
      // Text search
      if (query) {
        const queryLower = query.toLowerCase();
        const summaryMatch = session.summary.toLowerCase().includes(queryLower);
        const tagMatch = (sessionTags[session.id] || []).some(tag => 
          tag.toLowerCase().includes(queryLower)
        );
        
        if (!summaryMatch && !tagMatch) {
          return false;
        }
      }
      
      // Time range filter
      if (timeRange !== 'all') {
        const sessionDate = new Date(session.lastActivity);
        const now = new Date();
        const daysDiff = Math.floor((now - sessionDate) / (1000 * 60 * 60 * 24));
        
        switch (timeRange) {
          case 'today':
            if (daysDiff > 0) return false;
            break;
          case 'week':
            if (daysDiff > 7) return false;
            break;
          case 'month':
            if (daysDiff > 30) return false;
            break;
          case 'quarter':
            if (daysDiff > 90) return false;
            break;
          case 'year':
            if (daysDiff > 365) return false;
            break;
        }
      }
      
      // Message count filter
      if (messageCount) {
        const msgCount = session.messageCount || 0;
        switch (messageCount) {
          case 'short':
            if (msgCount > 10) return false;
            break;
          case 'medium':
            if (msgCount <= 10 || msgCount > 50) return false;
            break;
          case 'long':
            if (msgCount <= 50) return false;
            break;
        }
      }
      
      // Tags filter
      if (tags) {
        const filterTags = tags.split(',').map(t => t.trim());
        const sessionTagList = sessionTags[session.id] || [];
        
        if (!filterTags.some(filterTag => sessionTagList.includes(filterTag))) {
          return false;
        }
      }
      
      return true;
    });
    
    // Sort sessions
    filteredSessions.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'lastActivity':
          comparison = new Date(b.lastActivity) - new Date(a.lastActivity);
          break;
        case 'summary':
          comparison = a.summary.localeCompare(b.summary);
          break;
        case 'messageCount':
          comparison = (b.messageCount || 0) - (a.messageCount || 0);
          break;
        case 'created':
          comparison = new Date(b.created || b.lastActivity) - new Date(a.created || a.lastActivity);
          break;
      }
      
      return sortOrder === 'desc' ? comparison : -comparison;
    });
    
    // Apply pagination
    const total = filteredSessions.length; 
    const paginatedSessions = filteredSessions.slice(parseInt(offset), parseInt(offset) + parseInt(limit));
    
    // Enhance sessions with tags
    const enhancedSessions = paginatedSessions.map(session => ({
      ...session,
      tags: sessionTags[session.id] || []
    }));
    
    res.json({
      success: true,
      sessions: enhancedSessions,
      total,
      hasMore: parseInt(offset) + parseInt(limit) < total,
      searchQuery: query,
      filters: {
        timeRange,
        messageCount,
        sessionType,
        tags: tags ? tags.split(',') : []
      }
    });
    
  } catch (error) {
    console.error('Error searching sessions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search sessions',
      details: error.message
    });
  }
});

// GET /api/session-templates - Get available session templates
router.get('/templates', async (req, res) => {
  try {
    const templates = [
      {
        id: 'code-review',
        name: 'Code Review',
        description: 'Template for reviewing code changes and pull requests',
        category: 'Development',
        initialPrompt: 'I need you to review the following code changes. Please focus on:\n\n1. Code quality and best practices\n2. Potential bugs or security issues\n3. Performance considerations\n4. Maintainability and readability\n\nHere\'s the code:',
        tags: ['code-review', 'development', 'quality'],
        estimatedTime: '15-30 min'
      },
      {
        id: 'debugging',
        name: 'Debug Session',
        description: 'Systematic debugging workflow template',
        category: 'Development',
        initialPrompt: 'I\'m encountering an issue that needs debugging. Let\'s work through this systematically:\n\n1. Problem description\n2. Expected vs actual behavior\n3. Error messages or logs\n4. Steps to reproduce\n\nProblem details:',
        tags: ['debugging', 'troubleshooting', 'development'],
        estimatedTime: '30-60 min'
      },
      {
        id: 'brainstorming',
        name: 'Brainstorming',
        description: 'Creative ideation and problem-solving session',
        category: 'Creative',
        initialPrompt: 'Let\'s brainstorm ideas for the following topic. I\'d like you to help me explore different angles and generate creative solutions:\n\nTopic:',
        tags: ['brainstorming', 'creative', 'ideation'],
        estimatedTime: '20-45 min'
      },
      {
        id: 'learning',
        name: 'Learning Session',
        description: 'Structured learning and educational discussion',
        category: 'Education',
        initialPrompt: 'I want to learn about the following topic. Please provide a structured explanation with examples and help me understand the key concepts:\n\nTopic:',
        tags: ['learning', 'education', 'tutorial'],
        estimatedTime: '30-60 min'
      },
      {
        id: 'documentation',
        name: 'Documentation',
        description: 'Creating comprehensive project documentation',
        category: 'Documentation',
        initialPrompt: 'I need help creating documentation for my project. Let\'s structure this to include:\n\n1. Overview and purpose\n2. Installation/setup instructions\n3. Usage examples\n4. API reference (if applicable)\n5. Contributing guidelines\n\nProject details:',
        tags: ['documentation', 'writing', 'project'],
        estimatedTime: '45-90 min'
      },
      {
        id: 'architecture',
        name: 'Architecture Design',
        description: 'System architecture and design discussions',
        category: 'Architecture',
        initialPrompt: 'Let\'s design the architecture for this system. I\'d like to discuss:\n\n1. System requirements and constraints\n2. Component design and relationships\n3. Data flow and storage\n4. Scalability considerations\n5. Technology choices\n\nProject requirements:',
        tags: ['architecture', 'design', 'system', 'planning'],
        estimatedTime: '60-120 min'
      }
    ];
    
    res.json({
      success: true,
      templates
    });
  } catch (error) {
    console.error('Error getting session templates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get session templates',
      details: error.message
    });
  }
});

// POST /api/projects/:projectName/sessions/from-template - Create session from template
router.post('/:projectName/sessions/from-template', async (req, res) => {
  try {
    const { projectName } = req.params;
    const { templateId, customPrompt, sessionName } = req.body;
    
    if (!templateId) {
      return res.status(400).json({
        success: false,
        error: 'templateId is required'
      });
    }
    
    console.log(`📋 Creating session from template ${templateId} for project: ${projectName}`);
    
    // This would integrate with the main session creation flow
    // For now, we'll return the data needed to create the session
    res.json({
      success: true,
      sessionData: {
        templateId,
        customPrompt,
        sessionName: sessionName || `Session from ${templateId}`,
        projectName,
        created: new Date().toISOString()
      },
      message: 'Session template data prepared'
    });
    
  } catch (error) {
    console.error('Error creating session from template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create session from template',
      details: error.message
    });
  }
});

export default router; 