import express from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/db.js';

const router = express.Router();
const execAsync = promisify(exec);

// MCP Server states
const SERVER_STATUS = {
  STOPPED: 'stopped',
  STARTING: 'starting', 
  RUNNING: 'running',
  ERROR: 'error'
};

// Active MCP server processes
const activeServers = new Map();
const serverStates = new Map();

// Helper function to get MCP data directory
function getMCPDataDir() {
  return path.join(os.homedir(), '.claude-code-ui', 'mcp');
}

// Helper function to ensure directory exists
async function ensureDir(dirPath) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
  }
}

// Initialize MCP database tables
function initializeMCPTables() {
  try {
    // MCP servers table
    db.exec(`
      CREATE TABLE IF NOT EXISTS mcp_servers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        command TEXT NOT NULL,
        args TEXT DEFAULT '[]',
        env TEXT DEFAULT '{}',
        category TEXT DEFAULT 'utilities',
        tools TEXT DEFAULT '[]',
        auto_start BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // MCP tools table (populated when servers are running)
    db.exec(`
      CREATE TABLE IF NOT EXISTS mcp_tools (
        id TEXT PRIMARY KEY,
        server_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        parameters TEXT DEFAULT '{}',
        schema TEXT DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (server_id) REFERENCES mcp_servers (id) ON DELETE CASCADE
      )
    `);

    // MCP permissions table
    db.exec(`
      CREATE TABLE IF NOT EXISTS mcp_permissions (
        id TEXT PRIMARY KEY,
        server_id TEXT NOT NULL,
        tool_name TEXT NOT NULL,
        project_id TEXT,
        allowed BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (server_id) REFERENCES mcp_servers (id) ON DELETE CASCADE,
        UNIQUE(server_id, tool_name, project_id)
      )
    `);

    // MCP execution log
    db.exec(`
      CREATE TABLE IF NOT EXISTS mcp_execution_log (
        id TEXT PRIMARY KEY,
        server_id TEXT NOT NULL,
        tool_name TEXT NOT NULL,
        session_id TEXT,
        params TEXT DEFAULT '{}',
        result TEXT,
        error TEXT,
        duration INTEGER DEFAULT 0,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (server_id) REFERENCES mcp_servers (id) ON DELETE CASCADE
      )
    `);

    // Indexes for better performance
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_mcp_servers_category ON mcp_servers(category);
      CREATE INDEX IF NOT EXISTS idx_mcp_tools_server ON mcp_tools(server_id);
      CREATE INDEX IF NOT EXISTS idx_mcp_permissions_server_tool ON mcp_permissions(server_id, tool_name);
      CREATE INDEX IF NOT EXISTS idx_mcp_execution_server ON mcp_execution_log(server_id);
      CREATE INDEX IF NOT EXISTS idx_mcp_execution_session ON mcp_execution_log(session_id);
    `);

    console.log('MCP tables initialized successfully');
  } catch (error) {
    console.error('Failed to initialize MCP tables:', error);
  }
}

// Initialize tables on module load
initializeMCPTables();

// Helper function to start MCP server process
async function startMCPServer(serverId, serverConfig) {
  try {
    console.log(`Starting MCP server: ${serverId}`);
    
    const { command, args, env = {} } = serverConfig;
    const serverEnv = { ...process.env, ...env };
    
    // Start the MCP server process
    const serverProcess = spawn(command, JSON.parse(args), {
      env: serverEnv,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // Store the process
    activeServers.set(serverId, serverProcess);
    serverStates.set(serverId, SERVER_STATUS.STARTING);

    // Handle process events
    serverProcess.on('spawn', () => {
      console.log(`MCP server ${serverId} spawned successfully`);
      serverStates.set(serverId, SERVER_STATUS.RUNNING);
      
      // Discover tools from the server
      discoverMCPTools(serverId);
    });

    serverProcess.on('error', (error) => {
      console.error(`MCP server ${serverId} error:`, error);
      serverStates.set(serverId, SERVER_STATUS.ERROR);
      activeServers.delete(serverId);
    });

    serverProcess.on('exit', (code, signal) => {
      console.log(`MCP server ${serverId} exited with code ${code}, signal ${signal}`);
      serverStates.set(serverId, SERVER_STATUS.STOPPED);
      activeServers.delete(serverId);
    });

    // Handle stdout/stderr
    serverProcess.stdout.on('data', (data) => {
      console.log(`MCP server ${serverId} stdout:`, data.toString());
    });

    serverProcess.stderr.on('data', (data) => {
      console.error(`MCP server ${serverId} stderr:`, data.toString());
    });

    return { success: true, message: 'Server started successfully' };
  } catch (error) {
    console.error(`Failed to start MCP server ${serverId}:`, error);
    serverStates.set(serverId, SERVER_STATUS.ERROR);
    throw error;
  }
}

// Helper function to stop MCP server
async function stopMCPServer(serverId) {
  try {
    const serverProcess = activeServers.get(serverId);
    if (serverProcess) {
      serverProcess.kill('SIGTERM');
      activeServers.delete(serverId);
    }
    
    serverStates.set(serverId, SERVER_STATUS.STOPPED);
    
    // Clear tools for this server
    const stmt = db.prepare('DELETE FROM mcp_tools WHERE server_id = ?');
    stmt.run(serverId);
    
    return { success: true, message: 'Server stopped successfully' };
  } catch (error) {
    console.error(`Failed to stop MCP server ${serverId}:`, error);
    throw error;
  }
}

// Real MCP tool discovery function
async function discoverMCPTools(serverId) {
  try {
    const server = db.prepare('SELECT * FROM mcp_servers WHERE id = ?').get(serverId);
    if (!server) return;

    console.log(`🔍 Discovering tools for MCP server: ${server.name}`);

    // Use Claude CLI to introspect the MCP server
    const tools = await introspectMCPServer(server);
    
    // Clear existing tools
    db.prepare('DELETE FROM mcp_tools WHERE server_id = ?').run(serverId);
    
    // Insert discovered tools
    const insertTool = db.prepare(`
      INSERT INTO mcp_tools (id, server_id, name, description, parameters, schema)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    for (const tool of tools) {
      insertTool.run(
        uuidv4(),
        serverId,
        tool.name,
        tool.description,
        JSON.stringify(tool.inputSchema || {}),
        JSON.stringify(tool.inputSchema || {})
      );
    }

    console.log(`✅ Discovered ${tools.length} tools for server ${serverId}`);
  } catch (error) {
    console.error(`❌ Failed to discover tools for server ${serverId}:`, error);
  }
}

// Real MCP server introspection using Claude CLI
async function introspectMCPServer(server) {
  try {
    // Create a temporary Claude configuration for this server
    const tempConfig = {
      mcpServers: {
        [server.name]: JSON.parse(server.config)
      }
    };

    const configPath = path.join(os.tmpdir(), `mcp-config-${server.id}.json`);
    await fs.writeFile(configPath, JSON.stringify(tempConfig, null, 2));

    // Use Claude CLI to list tools from this MCP server
    const command = `claude --mcp-config "${configPath}" --list-tools --server "${server.name}"`;
    
    try {
      const { stdout, stderr } = await execAsync(command, { timeout: 10000 });
      
      if (stderr && !stderr.includes('Warning')) {
        throw new Error(stderr);
      }

      // Parse Claude CLI output to extract tool definitions
      const tools = parseClaudeToolOutput(stdout);
      
      // Clean up temp config
      await fs.unlink(configPath).catch(() => {});
      
      return tools;
    } catch (execError) {
      // Clean up temp config on error
      await fs.unlink(configPath).catch(() => {});
      
      // Fall back to basic tool detection if CLI introspection fails
      console.warn(`⚠️ CLI introspection failed for ${server.name}, using basic detection:`, execError.message);
      return await detectBasicMCPTools(server);
    }
  } catch (error) {
    console.error(`❌ Error introspecting MCP server ${server.name}:`, error);
    return [];
  }
}

// Parse Claude CLI tool output
function parseClaudeToolOutput(stdout) {
  const tools = [];
  
  try {
    // Claude CLI typically outputs tool information in a structured format
    const lines = stdout.trim().split('\n');
    let currentTool = null;
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Look for tool names (usually start with a dash or bullet point)
      if (trimmed.match(/^[-•*]\s*(\w+)/)) {
        if (currentTool) {
          tools.push(currentTool);
        }
        
        const toolName = trimmed.match(/^[-•*]\s*(\w+)/)[1];
        currentTool = {
          name: toolName,
          description: '',
          inputSchema: { type: 'object', properties: {} }
        };
      } else if (currentTool && trimmed) {
        // Add to description if we have a current tool
        currentTool.description += (currentTool.description ? ' ' : '') + trimmed;
      }
    }
    
    // Add the last tool
    if (currentTool) {
      tools.push(currentTool);
    }
    
    // If parsing fails, try JSON parsing
    if (tools.length === 0) {
      try {
        const parsed = JSON.parse(stdout);
        if (Array.isArray(parsed)) {
          return parsed.map(tool => ({
            name: tool.name || tool.function?.name || 'unknown',
            description: tool.description || tool.function?.description || '',
            inputSchema: tool.inputSchema || tool.function?.parameters || { type: 'object', properties: {} }
          }));
        }
      } catch (jsonError) {
        console.warn('❌ Failed to parse Claude CLI output as JSON:', jsonError.message);
      }
    }
    
  } catch (parseError) {
    console.error('❌ Error parsing Claude CLI tool output:', parseError);
  }
  
  return tools;
}

// Basic tool detection fallback
async function detectBasicMCPTools(server) {
  const serverName = server.name.toLowerCase();
  const config = JSON.parse(server.config);
  
  // Detect tools based on server type and configuration
  const tools = [];
  
  if (serverName.includes('puppeteer') || config.command?.includes('puppeteer')) {
    tools.push(
      { name: 'navigate', description: 'Navigate to a URL', inputSchema: { type: 'object', properties: { url: { type: 'string' } } } },
      { name: 'click', description: 'Click an element', inputSchema: { type: 'object', properties: { selector: { type: 'string' } } } },
      { name: 'screenshot', description: 'Take a screenshot', inputSchema: { type: 'object', properties: { fullPage: { type: 'boolean' } } } },
      { name: 'type', description: 'Type text into an element', inputSchema: { type: 'object', properties: { selector: { type: 'string' }, text: { type: 'string' } } } }
    );
  } else if (serverName.includes('postgres') || config.command?.includes('postgres')) {
    tools.push(
      { name: 'query', description: 'Execute SQL query', inputSchema: { type: 'object', properties: { sql: { type: 'string' } } } },
      { name: 'schema', description: 'Get database schema', inputSchema: { type: 'object', properties: {} } }
    );
  } else if (serverName.includes('filesystem') || config.command?.includes('filesystem')) {
    tools.push(
      { name: 'read_file', description: 'Read file contents', inputSchema: { type: 'object', properties: { path: { type: 'string' } } } },
      { name: 'write_file', description: 'Write file contents', inputSchema: { type: 'object', properties: { path: { type: 'string' }, content: { type: 'string' } } } },
      { name: 'list_directory', description: 'List directory contents', inputSchema: { type: 'object', properties: { path: { type: 'string' } } } }
    );
  }
  
  return tools;
}

// Real MCP tool execution
async function executeMCPTool(serverId, toolName, params, sessionId = null) {
  const startTime = Date.now();
  let result = null;
  let error = null;

  try {
    // Check permissions
    const permission = db.prepare(`
      SELECT allowed FROM mcp_permissions 
      WHERE server_id = ? AND tool_name = ? 
      ORDER BY created_at DESC 
      LIMIT 1
    `).get(serverId, toolName);

    if (!permission || !permission.allowed) {
      throw new Error('Tool execution not permitted');
    }

    // Get server configuration
    const server = db.prepare('SELECT * FROM mcp_servers WHERE id = ?').get(serverId);
    if (!server) {
      throw new Error('MCP server not found');
    }

    console.log(`🔧 Executing tool ${toolName} on server ${server.name}`);

    // Execute tool using Claude CLI with MCP
    result = await executeToolWithClaude(server, toolName, params, sessionId);

  } catch (err) {
    error = err.message;
    throw err;
  } finally {
    // Log the execution
    const duration = Date.now() - startTime;
    const logId = uuidv4();
    
    const stmt = db.prepare(`
      INSERT INTO mcp_execution_log 
      (id, server_id, tool_name, session_id, params, result, error, duration)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      logId,
      serverId,
      toolName,
      sessionId || null,
      JSON.stringify(params),
      result ? JSON.stringify(result) : null,
      error,
      duration
    );
  }

  return result;
}

// Execute tool using Claude CLI with MCP server
async function executeToolWithClaude(server, toolName, params, sessionId) {
  try {
    // Create temporary Claude configuration for this server
    const tempConfig = {
      mcpServers: {
        [server.name]: JSON.parse(server.config)
      }
    };

    const configPath = path.join(os.tmpdir(), `mcp-config-${server.id}-${Date.now()}.json`);
    await fs.writeFile(configPath, JSON.stringify(tempConfig, null, 2));

    // Create a temporary prompt file for tool execution
    const toolPrompt = `Please use the ${toolName} tool with these parameters: ${JSON.stringify(params)}`;
    const promptPath = path.join(os.tmpdir(), `tool-prompt-${Date.now()}.txt`);
    await fs.writeFile(promptPath, toolPrompt);

    try {
      // Execute Claude CLI with MCP configuration
      const command = `claude --mcp-config "${configPath}" --file "${promptPath}" --print-response`;
      
      const { stdout, stderr } = await execAsync(command, { 
        timeout: 30000,
        maxBuffer: 1024 * 1024 // 1MB buffer
      });
      
      if (stderr && !stderr.includes('Warning')) {
        throw new Error(stderr);
      }

      // Parse the Claude response for tool execution results
      const toolResult = parseToolExecutionResult(stdout, toolName);
      
      // Clean up temp files
      await Promise.all([
        fs.unlink(configPath).catch(() => {}),
        fs.unlink(promptPath).catch(() => {})
      ]);
      
      return toolResult;
      
    } catch (execError) {
      // Clean up temp files on error
      await Promise.all([
        fs.unlink(configPath).catch(() => {}),
        fs.unlink(promptPath).catch(() => {})
      ]);
      
      throw new Error(`Tool execution failed: ${execError.message}`);
    }
    
  } catch (error) {
    console.error(`❌ Error executing tool ${toolName}:`, error);
    throw error;
  }
}

// Parse tool execution result from Claude CLI output
function parseToolExecutionResult(output, toolName) {
  try {
    // Look for tool execution results in Claude's output
    const lines = output.split('\n');
    let inToolResult = false;
    let resultLines = [];
    
    for (const line of lines) {
      // Look for tool execution markers
      if (line.includes(`${toolName}:`) || line.includes('Tool result:') || line.includes('Result:')) {
        inToolResult = true;
        continue;
      }
      
      if (inToolResult) {
        // Stop at the next tool or end of relevant output
        if (line.includes('Tool:') && !line.includes(toolName)) {
          break;
        }
        
        resultLines.push(line);
      }
    }
    
    // Try to parse as JSON first
    const resultText = resultLines.join('\n').trim();
    
    try {
      return JSON.parse(resultText);
    } catch (jsonError) {
      // If not JSON, return structured result
        return { 
          success: true, 
        result: resultText,
        tool: toolName,
        timestamp: new Date().toISOString()
      };
    }
    
  } catch (parseError) {
    console.error(`❌ Error parsing tool result for ${toolName}:`, parseError);
    return {
      success: false,
      error: `Failed to parse tool result: ${parseError.message}`,
      tool: toolName,
      timestamp: new Date().toISOString()
    };
  }
}

// Routes

// GET /api/mcp-manager/servers - Get all MCP servers
router.get('/servers', async (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM mcp_servers ORDER BY name');
    const servers = stmt.all();
    
    const serversWithState = {};
    const states = {};
    
    servers.forEach(server => {
      serversWithState[server.id] = {
        ...server,
        args: JSON.parse(server.args || '[]'),
        env: JSON.parse(server.env || '{}'),
        tools: JSON.parse(server.tools || '[]')
      };
      states[server.id] = serverStates.get(server.id) || SERVER_STATUS.STOPPED;
    });

    res.json({ servers: serversWithState, states });
  } catch (error) {
    console.error('Failed to get MCP servers:', error);
    res.status(500).json({ error: 'Failed to get MCP servers' });
  }
});

// POST /api/mcp-manager/servers - Add new MCP server
router.post('/servers', async (req, res) => {
  try {
    const {
      id,
      name,
      description = '',
      command,
      args = [],
      env = {},
      category = 'utilities',
      tools = []
    } = req.body;

    const serverId = id || uuidv4();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO mcp_servers 
      (id, name, description, command, args, env, category, tools, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      serverId,
      name,
      description,
      command,
      JSON.stringify(args),
      JSON.stringify(env),
      category,
      JSON.stringify(tools),
      now,
      now
    );

    // Set initial state
    serverStates.set(serverId, SERVER_STATUS.STOPPED);

    res.json({ success: true, serverId });
  } catch (error) {
    console.error('Failed to add MCP server:', error);
    res.status(500).json({ error: 'Failed to add MCP server' });
  }
});

// POST /api/mcp-manager/servers/:id/start - Start MCP server
router.post('/servers/:id/start', async (req, res) => {
  try {
    const { id } = req.params;
    
    const server = db.prepare('SELECT * FROM mcp_servers WHERE id = ?').get(id);
    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    const serverConfig = {
      command: server.command,
      args: server.args,
      env: JSON.parse(server.env || '{}')
    };

    const result = await startMCPServer(id, serverConfig);
    res.json(result);
  } catch (error) {
    console.error('Failed to start MCP server:', error);
    res.status(500).json({ error: 'Failed to start MCP server', details: error.message });
  }
});

// POST /api/mcp-manager/servers/:id/stop - Stop MCP server
router.post('/servers/:id/stop', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await stopMCPServer(id);
    res.json(result);
  } catch (error) {
    console.error('Failed to stop MCP server:', error);
    res.status(500).json({ error: 'Failed to stop MCP server', details: error.message });
  }
});

// DELETE /api/mcp-manager/servers/:id - Delete MCP server
router.delete('/servers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Stop server if running
    await stopMCPServer(id);
    
    // Delete from database
    const stmt = db.prepare('DELETE FROM mcp_servers WHERE id = ?');
    stmt.run(id);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete MCP server:', error);
    res.status(500).json({ error: 'Failed to delete MCP server' });
  }
});

// GET /api/mcp-manager/tools - Get all available tools
router.get('/tools', async (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT t.*, s.name as server_name 
      FROM mcp_tools t 
      JOIN mcp_servers s ON t.server_id = s.id 
      ORDER BY s.name, t.name
    `);
    const tools = stmt.all();
    
    const toolsMap = {};
    tools.forEach(tool => {
      toolsMap[tool.id] = {
        ...tool,
        parameters: JSON.parse(tool.parameters || '{}'),
        schema: JSON.parse(tool.schema || '{}'),
        serverId: tool.server_id
      };
    });

    res.json({ tools: toolsMap });
  } catch (error) {
    console.error('Failed to get MCP tools:', error);
    res.status(500).json({ error: 'Failed to get MCP tools' });
  }
});

// POST /api/mcp-manager/execute - Execute MCP tool
router.post('/execute', async (req, res) => {
  try {
    const { serverId, tool, params = {}, sessionId } = req.body;

    if (!serverId || !tool) {
      return res.status(400).json({ error: 'serverId and tool are required' });
    }

    const result = await executeMCPTool(serverId, tool, params, sessionId);
    res.json({ success: true, result });
  } catch (error) {
    console.error('Failed to execute MCP tool:', error);
    res.status(500).json({ error: 'Failed to execute MCP tool', details: error.message });
  }
});

// GET /api/mcp-manager/permissions - Get tool permissions
router.get('/permissions', async (req, res) => {
  try {
    const { projectId } = req.query;
    
    let query = 'SELECT * FROM mcp_permissions';
    let params = [];
    
    if (projectId) {
      query += ' WHERE project_id = ? OR project_id IS NULL';
      params.push(projectId);
    }
    
    query += ' ORDER BY server_id, tool_name';
    
    const stmt = db.prepare(query);
    const permissions = stmt.all(...params);
    
    const permissionsMap = {};
    permissions.forEach(permission => {
      const key = `${permission.server_id}:${permission.tool_name}`;
      permissionsMap[key] = Boolean(permission.allowed);
    });

    res.json({ permissions: permissionsMap });
  } catch (error) {
    console.error('Failed to get MCP permissions:', error);
    res.status(500).json({ error: 'Failed to get MCP permissions' });
  }
});

// PUT /api/mcp-manager/permissions - Update tool permission
router.put('/permissions', async (req, res) => {
  try {
    const { serverId, toolName, allowed, projectId } = req.body;

    if (!serverId || !toolName) {
      return res.status(400).json({ error: 'serverId and toolName are required' });
    }

    const permissionId = uuidv4();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT OR REPLACE INTO mcp_permissions 
      (id, server_id, tool_name, project_id, allowed, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(permissionId, serverId, toolName, projectId || null, allowed ? 1 : 0, now);

    res.json({ success: true });
  } catch (error) {
    console.error('Failed to update MCP permission:', error);
    res.status(500).json({ error: 'Failed to update MCP permission' });
  }
});

// GET /api/mcp-manager/config - Get MCP configuration
router.get('/config', async (req, res) => {
  try {
    // Mock configuration for now
    const config = {
      mcpVersion: '1.0.0',
      maxConcurrentServers: 10,
      defaultTimeout: 30000,
      autoStart: [],
      logLevel: 'info'
    };

    res.json({ config });
  } catch (error) {
    console.error('Failed to get MCP config:', error);
    res.status(500).json({ error: 'Failed to get MCP config' });
  }
});

// GET /api/mcp-manager/execution-log - Get execution history
router.get('/execution-log', async (req, res) => {
  try {
    const { serverId, sessionId, limit = 100 } = req.query;
    
    let query = `
      SELECT el.*, s.name as server_name 
      FROM mcp_execution_log el 
      JOIN mcp_servers s ON el.server_id = s.id
    `;
    const params = [];
    const conditions = [];

    if (serverId) {
      conditions.push('el.server_id = ?');
      params.push(serverId);
    }

    if (sessionId) {
      conditions.push('el.session_id = ?');
      params.push(sessionId);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY el.timestamp DESC LIMIT ?';
    params.push(parseInt(limit));

    const stmt = db.prepare(query);
    const logs = stmt.all(...params);
    
    const processedLogs = logs.map(log => ({
      ...log,
      params: JSON.parse(log.params || '{}'),
      result: log.result ? JSON.parse(log.result) : null
    }));

    res.json({ logs: processedLogs });
  } catch (error) {
    console.error('Failed to get execution log:', error);
    res.status(500).json({ error: 'Failed to get execution log' });
  }
});

// POST /api/mcp-manager/auto-start - Configure auto-start servers
router.post('/auto-start', async (req, res) => {
  try {
    const { serverIds } = req.body;
    
    // Update auto_start flag for all servers
    const updateStmt = db.prepare('UPDATE mcp_servers SET auto_start = 0');
    updateStmt.run();
    
    if (serverIds && serverIds.length > 0) {
      const placeholders = serverIds.map(() => '?').join(',');
      const stmt = db.prepare(`UPDATE mcp_servers SET auto_start = 1 WHERE id IN (${placeholders})`);
      stmt.run(...serverIds);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Failed to configure auto-start:', error);
    res.status(500).json({ error: 'Failed to configure auto-start' });
  }
});

// Start auto-start servers on module load
async function startAutoStartServers() {
  try {
    const stmt = db.prepare('SELECT * FROM mcp_servers WHERE auto_start = 1');
    const servers = stmt.all();
    
    for (const server of servers) {
      const serverConfig = {
        command: server.command,
        args: server.args,
        env: JSON.parse(server.env || '{}')
      };
      
      try {
        await startMCPServer(server.id, serverConfig);
        console.log(`Auto-started MCP server: ${server.name}`);
      } catch (error) {
        console.error(`Failed to auto-start MCP server ${server.name}:`, error);
      }
    }
  } catch (error) {
    console.error('Failed to start auto-start servers:', error);
  }
}

// Start auto-start servers after a delay to allow database initialization
setTimeout(startAutoStartServers, 2000);

// Cleanup on process exit
process.on('SIGTERM', () => {
  console.log('Shutting down MCP servers...');
  for (const [serverId, serverProcess] of activeServers) {
    try {
      serverProcess.kill('SIGTERM');
    } catch (error) {
      console.error(`Error stopping MCP server ${serverId}:`, error);
    }
  }
});

export default router; 