import express from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

const router = express.Router();

// Get both project and user commands
router.get('/list', async (req, res) => {
  try {
    const projectCommands = await getCommands('.claude/commands', 'project');
    const userCommands = await getCommands(path.join(os.homedir(), '.claude/commands'), 'user');
    
    res.json({
      project: projectCommands,
      user: userCommands
    });
  } catch (error) {
    console.error('Error listing slash commands:', error);
    res.status(500).json({ error: 'Failed to list slash commands' });
  }
});

// Get command content
router.get('/content', async (req, res) => {
  try {
    const { type, path: commandPath } = req.query;
    
    if (!type || !commandPath) {
      return res.status(400).json({ error: 'Type and path are required' });
    }
    
    const baseDir = type === 'user' 
      ? path.join(os.homedir(), '.claude/commands')
      : '.claude/commands';
      
    const fullPath = path.join(baseDir, commandPath);
    
    // Security: ensure path doesn't escape base directory
    if (!fullPath.startsWith(path.resolve(baseDir))) {
      return res.status(403).json({ error: 'Invalid path' });
    }
    
    const content = await fs.readFile(fullPath, 'utf8');
    res.json({ content });
  } catch (error) {
    console.error('Error reading command:', error);
    res.status(500).json({ error: 'Failed to read command' });
  }
});

// Create or update command
router.post('/save', async (req, res) => {
  try {
    const { type, name, content, category } = req.body;
    
    if (!type || !name || !content) {
      return res.status(400).json({ error: 'Type, name, and content are required' });
    }
    
    // Sanitize name (remove special chars except hyphens and underscores)
    const safeName = name.replace(/[^a-zA-Z0-9-_]/g, '-');
    
    const baseDir = type === 'user' 
      ? path.join(os.homedir(), '.claude/commands')
      : '.claude/commands';
      
    let filePath = baseDir;
    
    // Handle category/subdirectory
    if (category && category.trim()) {
      const safeCategory = category.replace(/[^a-zA-Z0-9-_]/g, '-');
      filePath = path.join(filePath, safeCategory);
    }
    
    // Ensure directory exists
    await fs.mkdir(filePath, { recursive: true });
    
    // Write the command file
    filePath = path.join(filePath, `${safeName}.md`);
    await fs.writeFile(filePath, content, 'utf8');
    
    res.json({ 
      success: true, 
      message: `Command saved successfully`,
      path: path.relative(baseDir, filePath)
    });
  } catch (error) {
    console.error('Error saving command:', error);
    res.status(500).json({ error: 'Failed to save command' });
  }
});

// Delete command
router.delete('/delete', async (req, res) => {
  try {
    const { type, path: commandPath } = req.body;
    
    if (!type || !commandPath) {
      return res.status(400).json({ error: 'Type and path are required' });
    }
    
    const baseDir = type === 'user' 
      ? path.join(os.homedir(), '.claude/commands')
      : '.claude/commands';
      
    const fullPath = path.join(baseDir, commandPath);
    
    // Security: ensure path doesn't escape base directory
    if (!fullPath.startsWith(path.resolve(baseDir))) {
      return res.status(403).json({ error: 'Invalid path' });
    }
    
    await fs.unlink(fullPath);
    
    // Try to remove empty parent directories
    try {
      const parentDir = path.dirname(fullPath);
      if (parentDir !== baseDir) {
        const files = await fs.readdir(parentDir);
        if (files.length === 0) {
          await fs.rmdir(parentDir, { recursive: false });
        }
      }
    } catch (e) {
      // Ignore errors when cleaning up directories
    }
    
    res.json({ success: true, message: 'Command deleted successfully' });
  } catch (error) {
    console.error('Error deleting command:', error);
    res.status(500).json({ error: 'Failed to delete command' });
  }
});

// Helper function to recursively get commands from a directory
async function getCommands(basePath, type) {
  const commands = [];
  
  try {
    await fs.access(basePath);
  } catch (error) {
    // Directory doesn't exist, return empty array
    return commands;
  }
  
  async function scanDir(dir, prefix = '') {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.relative(basePath, fullPath);
        
        if (entry.isDirectory()) {
          // Recursively scan subdirectories
          await scanDir(fullPath, prefix ? `${prefix}:${entry.name}` : entry.name);
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          // Get command name without .md extension
          const commandName = entry.name.slice(0, -3);
          const fullCommand = prefix ? `${prefix}:${commandName}` : commandName;
          
          commands.push({
            name: commandName,
            fullCommand: `/${type}:${fullCommand}`,
            path: relativePath,
            category: prefix || null
          });
        }
      }
    } catch (error) {
      console.error(`Error scanning directory ${dir}:`, error);
    }
  }
  
  await scanDir(basePath);
  return commands;
}

export default router; 