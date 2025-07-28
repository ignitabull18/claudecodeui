import express from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import db from '../database/db.js';

const router = express.Router();
const execAsync = promisify(exec);

// Initialize database tables
db.run(`
  CREATE TABLE IF NOT EXISTS web_search_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    query TEXT NOT NULL,
    search_type TEXT NOT NULL,
    result_count INTEGER DEFAULT 0,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS web_search_bookmarks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    snippet TEXT,
    search_type TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, url)
  )
`);

// Check Claude availability for web search
router.get('/check', async (req, res) => {
  try {
    // Check if Claude CLI is available
    const { stdout } = await execAsync('which claude');
    
    // Check if Claude has web search capabilities (simplified check)
    // In reality, this would check MCP servers or Claude's actual capabilities
    const available = !!stdout.trim();
    
    res.json({ 
      available,
      message: available ? 'Claude web search is available' : 'Claude CLI not found'
    });
  } catch (error) {
    res.json({ 
      available: false,
      message: 'Claude is not available for web search'
    });
  }
});

// Perform web search using Claude
router.post('/search', async (req, res) => {
  try {
    const { query, type = 'web', filters = {}, projectContext } = req.body;
    const userId = req.user.id;
    
    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }
    
    console.log(`🔍 Performing ${type} search for: "${query}"`);
    
    // Build the Claude command based on search type
    let claudePrompt = '';
    
    switch (type) {
      case 'web':
        claudePrompt = `Search the web for information about: "${query}". Provide the top 10 relevant results with titles, URLs, and brief snippets.`;
        break;
      case 'docs':
        claudePrompt = `Search technical documentation for: "${query}". Focus on official documentation, API references, and developer guides. Provide structured results.`;
        break;
      case 'code':
        claudePrompt = `Find code examples and snippets for: "${query}". Include repository links, code samples, and implementation details.`;
        break;
      case 'tutorials':
        claudePrompt = `Find tutorials and guides about: "${query}". Focus on step-by-step tutorials, how-to guides, and learning resources.`;
        break;
      default:
        claudePrompt = `Search for: "${query}"`;
    }
    
    // Add filters to the prompt
    if (filters.timeRange && filters.timeRange !== 'anytime') {
      claudePrompt += ` Filter results from the last ${filters.timeRange}.`;
    }
    if (filters.language !== 'en') {
      claudePrompt += ` Prioritize results in ${filters.language} language.`;
    }
    
    // Add project context if available
    if (projectContext) {
      claudePrompt += ` Context: Working on project "${projectContext.name}" at ${projectContext.path}.`;
    }
    
    // Format the prompt for JSON output
    claudePrompt += ' Return results as a JSON array with objects containing: title, url, snippet, source, and metadata (optional: date, readTime, language).';
    
    // Execute Claude search
    // Note: In production, this would use Claude's actual web search capabilities
    // For now, we'll simulate with a Claude prompt
    const command = `claude --json "${claudePrompt.replace(/"/g, '\\"')}"`;
    
    try {
      const { stdout, stderr } = await execAsync(command, { 
        maxBuffer: 1024 * 1024 * 10 // 10MB buffer for large results
      });
      
      if (stderr) {
        console.error('Claude stderr:', stderr);
      }
      
      // Parse Claude's response
      let results = [];
      try {
        const response = JSON.parse(stdout);
        results = Array.isArray(response) ? response : response.results || [];
      } catch (parseError) {
        console.error('Error parsing Claude response:', parseError);
        // Fallback: try to extract results from text
        results = [{
          title: 'Search Results',
          url: '#',
          snippet: stdout.substring(0, 200) + '...',
          source: 'Claude'
        }];
      }
      
      // Store in history
      db.run(
        'INSERT INTO web_search_history (user_id, query, search_type, result_count) VALUES (?, ?, ?, ?)',
        [userId, query, type, results.length]
      );
      
      res.json({
        success: true,
        results,
        query,
        type,
        timestamp: new Date().toISOString()
      });
      
    } catch (execError) {
      console.error('Error executing Claude:', execError);
      
      // Fallback: Return mock results for development
      const mockResults = getMockResults(query, type);
      
      res.json({
        success: true,
        results: mockResults,
        query,
        type,
        timestamp: new Date().toISOString(),
        mock: true
      });
    }
    
  } catch (error) {
    console.error('Error performing search:', error);
    res.status(500).json({ 
      error: 'Failed to perform search',
      details: error.message 
    });
  }
});

// Get search history
router.get('/history', async (req, res) => {
  try {
    const userId = req.user.id;
    
    const history = await new Promise((resolve, reject) => {
      db.all(
        `SELECT * FROM web_search_history 
         WHERE user_id = ? 
         ORDER BY timestamp DESC 
         LIMIT 50`,
        [userId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
    
    res.json({ 
      success: true,
      history 
    });
  } catch (error) {
    console.error('Error fetching search history:', error);
    res.status(500).json({ 
      error: 'Failed to fetch search history' 
    });
  }
});

// Add to search history
router.post('/history', async (req, res) => {
  try {
    const userId = req.user.id;
    const { query, type, resultCount = 0 } = req.body;
    
    db.run(
      'INSERT INTO web_search_history (user_id, query, search_type, result_count) VALUES (?, ?, ?, ?)',
      [userId, query, type, resultCount],
      (err) => {
        if (err) {
          console.error('Error adding to history:', err);
          return res.status(500).json({ error: 'Failed to add to history' });
        }
        res.json({ success: true });
      }
    );
  } catch (error) {
    console.error('Error adding to history:', error);
    res.status(500).json({ error: 'Failed to add to history' });
  }
});

// Clear search history
router.delete('/history', async (req, res) => {
  try {
    const userId = req.user.id;
    
    db.run(
      'DELETE FROM web_search_history WHERE user_id = ?',
      [userId],
      (err) => {
        if (err) {
          console.error('Error clearing history:', err);
          return res.status(500).json({ error: 'Failed to clear history' });
        }
        res.json({ success: true });
      }
    );
  } catch (error) {
    console.error('Error clearing history:', error);
    res.status(500).json({ error: 'Failed to clear history' });
  }
});

// Get bookmarks
router.get('/bookmarks', async (req, res) => {
  try {
    const userId = req.user.id;
    
    const bookmarks = await new Promise((resolve, reject) => {
      db.all(
        `SELECT * FROM web_search_bookmarks 
         WHERE user_id = ? 
         ORDER BY created_at DESC`,
        [userId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
    
    res.json({ 
      success: true,
      bookmarks 
    });
  } catch (error) {
    console.error('Error fetching bookmarks:', error);
    res.status(500).json({ 
      error: 'Failed to fetch bookmarks' 
    });
  }
});

// Add bookmark
router.post('/bookmarks', async (req, res) => {
  try {
    const userId = req.user.id;
    const { title, url, snippet, type } = req.body;
    
    if (!title || !url) {
      return res.status(400).json({ error: 'Title and URL are required' });
    }
    
    db.run(
      `INSERT OR REPLACE INTO web_search_bookmarks 
       (user_id, title, url, snippet, search_type) 
       VALUES (?, ?, ?, ?, ?)`,
      [userId, title, url, snippet, type],
      (err) => {
        if (err) {
          console.error('Error adding bookmark:', err);
          return res.status(500).json({ error: 'Failed to add bookmark' });
        }
        res.json({ success: true });
      }
    );
  } catch (error) {
    console.error('Error adding bookmark:', error);
    res.status(500).json({ error: 'Failed to add bookmark' });
  }
});

// Delete bookmark
router.delete('/bookmarks/:url', async (req, res) => {
  try {
    const userId = req.user.id;
    const url = decodeURIComponent(req.params.url);
    
    db.run(
      'DELETE FROM web_search_bookmarks WHERE user_id = ? AND url = ?',
      [userId, url],
      (err) => {
        if (err) {
          console.error('Error deleting bookmark:', err);
          return res.status(500).json({ error: 'Failed to delete bookmark' });
        }
        res.json({ success: true });
      }
    );
  } catch (error) {
    console.error('Error deleting bookmark:', error);
    res.status(500).json({ error: 'Failed to delete bookmark' });
  }
});

// Mock results for development/fallback
function getMockResults(query, type) {
  const baseResults = [
    {
      title: `${query} - Official Documentation`,
      url: `https://docs.example.com/${query.toLowerCase().replace(/\s+/g, '-')}`,
      snippet: `Comprehensive documentation about ${query}. Learn how to implement and use ${query} in your projects with detailed examples and best practices.`,
      source: 'Official Docs',
      metadata: { date: new Date().toISOString(), language: 'en' }
    },
    {
      title: `Getting Started with ${query}`,
      url: `https://tutorial.example.com/${query.toLowerCase().replace(/\s+/g, '-')}`,
      snippet: `A beginner-friendly guide to ${query}. This tutorial covers the basics and provides step-by-step instructions for common use cases.`,
      source: 'Tutorial Site',
      metadata: { readTime: '10 min', date: new Date().toISOString() }
    },
    {
      title: `${query} on Stack Overflow`,
      url: `https://stackoverflow.com/questions/tagged/${query.toLowerCase().replace(/\s+/g, '-')}`,
      snippet: `Questions tagged with ${query}. Find solutions to common problems and learn from the community's collective knowledge.`,
      source: 'Stack Overflow',
      metadata: { date: new Date().toISOString() }
    }
  ];
  
  // Add type-specific results
  switch (type) {
    case 'code':
      baseResults.push({
        title: `${query} Code Examples - GitHub`,
        url: `https://github.com/search?q=${encodeURIComponent(query)}`,
        snippet: `Repository search results for ${query}. Find open-source implementations and code samples.`,
        source: 'GitHub',
        metadata: { language: 'Multiple' }
      });
      break;
    case 'docs':
      baseResults.push({
        title: `${query} API Reference`,
        url: `https://api.example.com/${query.toLowerCase()}`,
        snippet: `Complete API reference for ${query}. Detailed documentation of all methods, parameters, and return values.`,
        source: 'API Docs',
        metadata: { date: new Date().toISOString() }
      });
      break;
    case 'tutorials':
      baseResults.push({
        title: `Video Tutorial: ${query} in 30 Minutes`,
        url: `https://video.example.com/watch/${query.toLowerCase()}`,
        snippet: `Learn ${query} through this comprehensive video tutorial. Perfect for visual learners who prefer hands-on demonstrations.`,
        source: 'Video Platform',
        metadata: { readTime: '30 min video' }
      });
      break;
  }
  
  return baseResults;
}

export default router; 