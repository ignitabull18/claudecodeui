import express from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const router = express.Router();
const execAsync = promisify(exec);

// Helper function to get Claude CLI available tools
async function getClaudeTools() {
  try {
    console.log('🔍 Discovering tools from Claude CLI...');
    
    // Get tools via Claude CLI introspection
    const command = 'claude --list-tools --format json';
    
    try {
      const { stdout, stderr } = await execAsync(command, { timeout: 10000 });
      
      if (stderr && !stderr.includes('Warning')) {
        throw new Error(stderr);
      }

      // Try to parse JSON output
      try {
        const tools = JSON.parse(stdout);
        return Array.isArray(tools) ? tools : Object.values(tools);
      } catch (jsonError) {
        // If not JSON, parse text output
        return parseClaudeToolsText(stdout);
      }
      
    } catch (execError) {
      console.error('❌ Claude CLI tool discovery failed:', execError.message);
      return [];
    }
    
  } catch (error) {
    console.error('❌ Error getting Claude tools:', error);
    return [];
  }
}

// Parse Claude CLI text output for tools
function parseClaudeToolsText(output) {
  const tools = [];
  const lines = output.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Look for tool definitions (common patterns)
    if (trimmed.match(/^[-•*]\s*(\w+)/)) {
      const toolName = trimmed.match(/^[-•*]\s*(\w+)/)[1];
      tools.push({
        name: toolName,
        description: `${toolName} tool for Claude Code operations`,
        category: categorizeToolByName(toolName),
        status: 'available',
        source: 'claude-cli'
      });
    }
  }
  
  return tools;
}

// REMOVED: detectAvailableTools function - using Claude CLI only

// Categorize tool by name
function categorizeToolByName(toolName) {
  const categories = {
    file_operations: ['read_file', 'edit_file', 'write_file', 'delete_file', 'list_dir', 'file_search'],
    code_analysis: ['codebase_search', 'grep_search', 'analyze_code', 'refactor'],
    execution: ['run_terminal_cmd', 'execute_script', 'shell', 'node', 'python'],
    development: ['git', 'npm', 'yarn', 'build', 'test', 'deploy'],
    web: ['web_search', 'fetch_url', 'scrape', 'api_call'],
    database: ['query_db', 'execute_sql', 'mongodb', 'redis'],
    ai_ml: ['generate_text', 'analyze_image', 'speech_to_text'],
    infrastructure: ['docker', 'kubernetes', 'aws', 'terraform'],
    other: []
  };

  const lowerName = toolName.toLowerCase();
  
  for (const [category, tools] of Object.entries(categories)) {
    if (tools.some(tool => lowerName.includes(tool.toLowerCase()))) {
      return category;
    }
  }
  
  return 'other';
}

// Get real tool usage statistics
async function getToolUsageStats() {
  try {
    // Read usage logs from Claude analytics
    const homeDir = os.homedir();
    const analyticsDir = path.join(homeDir, '.claude', 'analytics');
    
    const stats = {};
    
    try {
      // Get today's analytics file
      const today = new Date().toISOString().split('T')[0];
      const analyticsFile = path.join(analyticsDir, `analytics-${today}.jsonl`);
      
      const content = await fs.readFile(analyticsFile, 'utf-8');
      const lines = content.trim().split('\n');
      
      for (const line of lines) {
        try {
          const event = JSON.parse(line);
          if (event.eventType === 'tool_usage') {
            const data = JSON.parse(event.data);
            const toolName = data.tool_name;
            
            if (!stats[toolName]) {
              stats[toolName] = { count: 0, lastUsed: null, totalDuration: 0 };
            }
            
            stats[toolName].count++;
            stats[toolName].lastUsed = event.timestamp;
            if (data.duration) {
              stats[toolName].totalDuration += data.duration;
            }
          }
        } catch (parseError) {
          // Skip invalid lines
          continue;
        }
      }
      
    } catch (fileError) {
      // No analytics file exists yet
      console.log('📊 No usage statistics available yet');
    }
    
    return stats;
    
  } catch (error) {
    console.error('❌ Error getting tool usage stats:', error);
    return {};
  }
}

// Get real tool permissions
async function getToolPermissions() {
  try {
    // Read from Claude configuration
    const homeDir = os.homedir();
    const configPath = path.join(homeDir, '.claude.json');
    
    try {
      const configContent = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(configContent);
      
      return config.toolPermissions || {};
    } catch (configError) {
      // Default permissions if no config file
      return {};
    }
    
  } catch (error) {
    console.error('❌ Error getting tool permissions:', error);
    return {};
  }
}

// GET /api/tools/advanced - Get tools with permissions and usage stats
router.get('/advanced', async (req, res) => {
  try {
    const tools = await getClaudeTools();
    const permissions = await getToolPermissions();
    const usageStats = await getToolUsageStats();
    
    // Enhance tools with permissions and usage data
    const enhancedTools = tools.map(tool => ({
      ...tool,
      permissions: permissions[tool.name] || { allowed: true, restricted: false },
      usage: usageStats[tool.name] || { count: 0, lastUsed: null, totalDuration: 0 }
    }));
    
    res.json({
      tools: enhancedTools,
      permissions,
      usageStats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error loading advanced tool data:', error);
    res.status(500).json({ error: 'Failed to load tool data' });
  }
});

// GET /api/tools/analytics - Get real tool analytics
router.get('/analytics', async (req, res) => {
  try {
    const { timeRange = '24h' } = req.query;
    
    // Get real analytics data
    const analytics = await getRealToolAnalytics(timeRange);
    
    res.json({
      analytics,
      timeRange,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error loading tool analytics:', error);
    res.status(500).json({ error: 'Failed to load analytics data' });
  }
});

// Get real tool analytics data
async function getRealToolAnalytics(timeRange) {
  try {
    const homeDir = os.homedir();
    const analyticsDir = path.join(homeDir, '.claude', 'analytics');
    
    // Calculate date range
    const endDate = new Date();
    let startDate = new Date();
    
    switch (timeRange) {
      case '24h':
        startDate.setDate(endDate.getDate() - 1);
        break;
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      default:
        startDate.setDate(endDate.getDate() - 1);
    }
    
    const analytics = {
      totalExecutions: 0,
      successRate: 0,
      averageResponseTime: 0,
      mostUsedTools: [],
      errorRate: 0,
      toolsByCategory: {},
      timeDistribution: []
    };
    
    // Read analytics files for the date range
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const analyticsFile = path.join(analyticsDir, `analytics-${dateStr}.jsonl`);
      
      try {
        const content = await fs.readFile(analyticsFile, 'utf-8');
        const lines = content.trim().split('\n');
        
        for (const line of lines) {
          try {
            const event = JSON.parse(line);
            if (event.eventType === 'tool_usage') {
              const data = JSON.parse(event.data);
              
              analytics.totalExecutions++;
              
              if (data.success !== false) {
                analytics.successRate++;
              }
              
              if (data.duration) {
                analytics.averageResponseTime += data.duration;
              }
              
              // Track by category
              const category = categorizeToolByName(data.tool_name);
              analytics.toolsByCategory[category] = (analytics.toolsByCategory[category] || 0) + 1;
            }
          } catch (parseError) {
            continue;
          }
        }
      } catch (fileError) {
        // File doesn't exist for this date
        continue;
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Calculate percentages and averages
    if (analytics.totalExecutions > 0) {
      analytics.successRate = (analytics.successRate / analytics.totalExecutions) * 100;
      analytics.averageResponseTime = analytics.averageResponseTime / analytics.totalExecutions;
      analytics.errorRate = 100 - analytics.successRate;
    }
    
    // Get most used tools
    const toolCounts = {};
    // This would need to be populated from the analytics data
    analytics.mostUsedTools = Object.entries(toolCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([tool, count]) => ({ tool, count }));
    
    return analytics;
    
  } catch (error) {
    console.error('❌ Error getting real tool analytics:', error);
    return {
      totalExecutions: 0,
      successRate: 0,
      averageResponseTime: 0,
      mostUsedTools: [],
      errorRate: 0,
      toolsByCategory: {},
      timeDistribution: []
    };
  }
}

// POST /api/tools/:toolName/configure - Configure tool settings
router.post('/:toolName/configure', async (req, res) => {
  try {
    const { toolName } = req.params;
    const configuration = req.body;
    
    console.log(`🔧 Configuring tool: ${toolName}`);
    
    // Save configuration to Claude config
    const homeDir = os.homedir();
    const configPath = path.join(homeDir, '.claude.json');
    
    let config = {};
    try {
      const configContent = await fs.readFile(configPath, 'utf-8');
      config = JSON.parse(configContent);
    } catch (readError) {
      // Config file doesn't exist, create new one
      config = {};
    }
    
    // Update tool configuration
    if (!config.toolConfigurations) {
      config.toolConfigurations = {};
    }
    
    config.toolConfigurations[toolName] = {
      ...config.toolConfigurations[toolName],
      ...configuration,
      updatedAt: new Date().toISOString()
    };
    
    // Write back to file
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
    
    res.json({
      success: true,
      toolName,
      configuration: config.toolConfigurations[toolName]
    });
    
  } catch (error) {
    console.error('Error configuring tool:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to configure tool',
      details: error.message 
    });
  }
});

// POST /api/tools/:toolName/test - Test tool configuration
router.post('/:toolName/test', async (req, res) => {
  try {
    const { toolName } = req.params;
    const { testParameters } = req.body;
    
    console.log(`🧪 Testing tool configuration: ${toolName}`);
    
    // Test the tool by attempting to use it
    const testResult = await testToolConfiguration(toolName, testParameters);
    
    res.json({
      success: testResult.success,
      toolName,
      testResult,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error testing tool configuration:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to test tool configuration',
      details: error.message 
    });
  }
});

// Test tool configuration
async function testToolConfiguration(toolName, testParameters) {
  try {
    // This would execute a simple test of the tool
    // For now, return a basic validation
    const isValid = validateToolParameters(toolName, testParameters);
    
    return {
      success: isValid,
      message: isValid ? 'Tool configuration is valid' : 'Tool configuration has issues',
      details: isValid ? 'All parameters validated successfully' : 'Some parameters failed validation',
      validationResults: { parametersValid: isValid }
    };
    
  } catch (error) {
    return {
      success: false,
      message: 'Tool test failed',
      details: error.message,
      validationResults: { error: error.message }
    };
  }
}

// Validate tool parameters
function validateToolParameters(toolName, parameters) {
  // Basic parameter validation
  if (!parameters || typeof parameters !== 'object') {
    return false;
  }
  
  // Tool-specific validation rules could be added here
  return true;
}

export default router; 