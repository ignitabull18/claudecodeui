import express from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';

const router = express.Router();
const execAsync = promisify(exec);

// GET /api/hooks/:projectName/list - List hooks using Claude CLI
router.get('/:projectName/list', async (req, res) => {
  try {
    const { projectName } = req.params;
    console.log(`🪝 Listing hooks for project: ${projectName}`);
    
    // Use Claude CLI to list hooks for the project
    const projectPath = path.join(os.homedir(), '.claude', 'projects', projectName);
    process.chdir(projectPath);
    
    // Execute Claude CLI hook list command
    const { stdout, stderr } = await execAsync('claude hooks list --format json', {
      cwd: projectPath,
      timeout: 10000
    });
    
    if (stderr && !stderr.includes('Warning')) {
      throw new Error(stderr);
    }
    
    let hooks = [];
    try {
      hooks = JSON.parse(stdout || '[]');
    } catch (parseError) {
      console.log('📝 No hooks configured for this project');
      hooks = [];
    }
    
    res.json({
      success: true,
      hooks: hooks,
      project: projectName
    });
    
  } catch (error) {
    console.error('❌ Error listing hooks via Claude CLI:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to list hooks'
    });
  }
});

// POST /api/hooks/:projectName/create - Create hook using Claude CLI
router.post('/:projectName/create', async (req, res) => {
  try {
    const { projectName } = req.params;
    const { name, trigger, action, config } = req.body;
    
    console.log(`🪝 Creating hook: ${name} for project: ${projectName}`);
    
    const projectPath = path.join(os.homedir(), '.claude', 'projects', projectName);
    process.chdir(projectPath);
    
    // Create hook configuration for Claude CLI
    const hookConfig = {
      name,
      trigger,
      action,
      ...config
    };
    
    // Write temporary hook config file
    const tempConfigPath = path.join(projectPath, '.claude-hook-temp.json');
    await fs.writeFile(tempConfigPath, JSON.stringify(hookConfig, null, 2));
    
    try {
      // Execute Claude CLI hook create command
      const { stdout, stderr } = await execAsync(`claude hooks create --config "${tempConfigPath}"`, {
        cwd: projectPath,
        timeout: 15000  
      });
      
      if (stderr && !stderr.includes('Warning')) {
        throw new Error(stderr);
      }

    res.json({
      success: true,
        message: `Hook '${name}' created successfully`,
        output: stdout
      });
      
    } finally {
      // Clean up temp file
      try {
        await fs.unlink(tempConfigPath);
      } catch (cleanupError) {
        console.warn('⚠️ Could not cleanup temp hook config file');
      }
    }
    
  } catch (error) {
    console.error('❌ Error creating hook via Claude CLI:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create hook'
    });
  }
});

// DELETE /api/hooks/:projectName/:hookId - Delete hook using Claude CLI
router.delete('/:projectName/:hookId', async (req, res) => {
  try {
    const { projectName, hookId } = req.params;
    console.log(`🪝 Deleting hook: ${hookId} from project: ${projectName}`);
    
    const projectPath = path.join(os.homedir(), '.claude', 'projects', projectName);
    process.chdir(projectPath);
    
    // Execute Claude CLI hook delete command
    const { stdout, stderr } = await execAsync(`claude hooks delete "${hookId}"`, {
      cwd: projectPath,
      timeout: 10000
    });
    
    if (stderr && !stderr.includes('Warning')) {
      throw new Error(stderr);
    }

    res.json({
      success: true,
      message: `Hook '${hookId}' deleted successfully`,
      output: stdout
    });

  } catch (error) {
    console.error('❌ Error deleting hook via Claude CLI:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete hook'
    });
  }
});

// POST /api/hooks/:projectName/:hookId/trigger - Manually trigger hook using Claude CLI
router.post('/:projectName/:hookId/trigger', async (req, res) => {
  try {
    const { projectName, hookId } = req.params;
    const { payload } = req.body;
    
    console.log(`🪝 Manually triggering hook: ${hookId} in project: ${projectName}`);
    
    const projectPath = path.join(os.homedir(), '.claude', 'projects', projectName);
    process.chdir(projectPath);
    
    // Execute Claude CLI hook trigger command
    let command = `claude hooks trigger "${hookId}"`;
    if (payload) {
      const payloadStr = JSON.stringify(payload);
      command += ` --payload '${payloadStr}'`;
    }
    
    const { stdout, stderr } = await execAsync(command, {
      cwd: projectPath,
      timeout: 30000
    });
    
    if (stderr && !stderr.includes('Warning')) {
      throw new Error(stderr);
    }

    res.json({
      success: true,
      message: `Hook '${hookId}' triggered successfully`,
      output: stdout,
      payload: payload
    });

  } catch (error) {
    console.error('❌ Error triggering hook via Claude CLI:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to trigger hook'
    });
  }
});

// GET /api/hooks/:projectName/:hookId/status - Get hook status using Claude CLI  
router.get('/:projectName/:hookId/status', async (req, res) => {
  try {
    const { projectName, hookId } = req.params;
    console.log(`🪝 Getting hook status: ${hookId} from project: ${projectName}`);
    
    const projectPath = path.join(os.homedir(), '.claude', 'projects', projectName);
    process.chdir(projectPath);
    
    // Execute Claude CLI hook status command
    const { stdout, stderr } = await execAsync(`claude hooks status "${hookId}" --format json`, {
      cwd: projectPath,
      timeout: 10000
    });
    
    if (stderr && !stderr.includes('Warning')) {
      throw new Error(stderr);
    }
    
    let status = {};
    try {
      status = JSON.parse(stdout || '{}');
    } catch (parseError) {
      status = { error: 'Could not parse hook status' };
    }

    res.json({
      success: true,
      status: status,
      hookId: hookId
    });

  } catch (error) {
    console.error('❌ Error getting hook status via Claude CLI:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get hook status'
    });
  }
});

export default router; 