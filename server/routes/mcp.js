import express from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';

const router = express.Router();
const execAsync = promisify(exec);

// Helper function to ensure claude command works in different environments
async function getClaudeCommand(subcommand) {
  // Most of the time, 'claude' will just work if it's in PATH
  // But we add PATH locations where package managers commonly install binaries
  const pathAdditions = [
    `${process.env.HOME}/.bun/bin`,
    `${process.env.HOME}/.npm/bin`,
    `${process.env.HOME}/.local/bin`,
    '/usr/local/bin',
    '/opt/homebrew/bin'
  ].join(':');
  
  return `PATH=$PATH:${pathAdditions} claude ${subcommand}`;
}

// List MCP servers
router.get('/list', async (req, res) => {
  try {
    const command = await getClaudeCommand('mcp list');
    const { stdout, stderr } = await execAsync(command);
    
    console.log('Raw MCP output:', stdout); // Debug log
    
    // Parse the text output from claude mcp list
    const lines = stdout.trim().split('\n');
    const servers = {};
    
    let currentServer = null;
    
    for (const line of lines) {
      // Skip empty lines and header lines
      if (!line.trim() || line.includes('Checking') || line.includes('MCP server')) {
        continue;
      }
      
      // Check if this is a server name line (starts with a non-whitespace character)
      if (line.match(/^[^\s]/)) {
        // Extract server name and status - format: "servername: command - ✓ Connected"
        const match = line.match(/^([^:]+):\s+(.+?)\s+-\s+([✓✗])\s+(.+)$/);
        if (match) {
          const [, name, command, statusSymbol, statusText] = match;
          currentServer = name;
          servers[name] = {
            name,
            command: command.trim(),
            status: statusSymbol === '✓' ? 'connected' : 'disconnected'
          };
        } else {
          console.log('Failed to parse line:', line); // Debug log
        }
      }
    }
    
    console.log('Parsed servers:', servers); // Debug log
    res.json(servers);
  } catch (error) {
    console.error('Error listing MCP servers:', error);
    console.error('Error details:', error.message, error.stack); // More detailed error
    res.status(500).json({ error: 'Failed to list MCP servers' });
  }
});

// Add MCP server
router.post('/add', async (req, res) => {
  try {
    const { name, command } = req.body;
    
    if (!name || !command) {
      return res.status(400).json({ error: 'Name and command are required' });
    }
    
    // Execute claude mcp add command
    const { stdout, stderr } = await execAsync(`claude mcp add "${name}" ${command}`);
    
    if (stderr && !stderr.includes('Successfully')) {
      throw new Error(stderr);
    }
    
    res.json({ 
      success: true, 
      message: `Successfully added MCP server: ${name}`,
      output: stdout 
    });
  } catch (error) {
    console.error('Error adding MCP server:', error);
    res.status(500).json({ 
      error: 'Failed to add MCP server', 
      details: error.message 
    });
  }
});

// Remove MCP server
router.delete('/remove/:name', async (req, res) => {
  try {
    const { name } = req.params;
    
    if (!name) {
      return res.status(400).json({ error: 'Server name is required' });
    }
    
    // Execute claude mcp remove command
    const { stdout, stderr } = await execAsync(`claude mcp remove "${name}"`);
    
    if (stderr && !stderr.includes('Successfully')) {
      throw new Error(stderr);
    }
    
    res.json({ 
      success: true, 
      message: `Successfully removed MCP server: ${name}`,
      output: stdout 
    });
  } catch (error) {
    console.error('Error removing MCP server:', error);
    res.status(500).json({ 
      error: 'Failed to remove MCP server', 
      details: error.message 
    });
  }
});

export default router;