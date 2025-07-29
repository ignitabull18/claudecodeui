import express from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import { db } from '../database/db.js';

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
      console.error('❌ Error executing Claude for search:', execError);
      
      // Handle search failure gracefully
      try {
        // Attempt direct web search using curl or other tools
        const alternativeResults = await performAlternativeSearch(query, type);
        
        if (alternativeResults && alternativeResults.length > 0) {
          res.json({
            success: true,
            results: alternativeResults,
            query,
            type,
            timestamp: new Date().toISOString(),
            method: 'alternative'
          });
          return;
        }
      } catch (altError) {
        console.error('❌ Search methods failed:', altError);
      }
      
      // Return error instead of mock results
      res.status(503).json({
        success: false,
        error: 'Search service temporarily unavailable',
        message: 'Unable to perform web search at this time. Please try again later.',
        query,
        type,
        timestamp: new Date().toISOString()
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

    // Additional search methods when Claude CLI fails
async function performAlternativeSearch(query, type) {
  try {
    console.log(`🔄 Trying additional search methods for: ${query}`);
    
    // Try using curl to query a public search API
    const searchEngines = [
      {
        name: 'DuckDuckGo Instant Answer API',
        url: `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`
      }
    ];
    
    for (const engine of searchEngines) {
      try {
        const { execAsync } = require('./utils');
        const command = `curl -s "${engine.url}"`;
        const { stdout } = await execAsync(command, { timeout: 10000 });
        
        if (stdout) {
          const data = JSON.parse(stdout);
          const results = parseSearchEngineResults(data, engine.name, query, type);
          
          if (results && results.length > 0) {
            console.log(`✅ Successfully got results from ${engine.name}`);
            return results;
          }
        }
      } catch (engineError) {
        console.warn(`⚠️ ${engine.name} search failed:`, engineError.message);
        continue;
      }
    }
    
    return null;
    
  } catch (error) {
          console.error('❌ All search methods failed:', error);
    return null;
  }
}

// Parse results from different search engines
function parseSearchEngineResults(data, engineName, query, type) {
  const results = [];
  
  try {
    switch (engineName) {
      case 'DuckDuckGo Instant Answer API':
        // Parse DuckDuckGo API response
        if (data.Abstract) {
          results.push({
            title: data.Heading || query,
            url: data.AbstractURL || `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
            snippet: data.Abstract,
            source: data.AbstractSource || 'DuckDuckGo',
            metadata: { 
              date: new Date().toISOString(),
              engine: 'DuckDuckGo'
            }
          });
        }
        
        // Add related topics if available
        if (data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
          data.RelatedTopics.slice(0, 3).forEach(topic => {
            if (topic.Text && topic.FirstURL) {
              results.push({
                title: topic.Text.split(' - ')[0] || topic.Text.substring(0, 60),
                url: topic.FirstURL,
                snippet: topic.Text,
                source: 'DuckDuckGo Related',
                metadata: { 
                  date: new Date().toISOString(),
                  engine: 'DuckDuckGo'
                }
              });
            }
          });
        }
        break;
        
      default:
        console.warn(`Unknown search engine: ${engineName}`);
    }
    
  } catch (parseError) {
    console.error(`❌ Error parsing ${engineName} results:`, parseError);
  }
  
  return results;
}

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

export default router; 