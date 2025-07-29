import express from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const router = express.Router();
const execAsync = promisify(exec);

// Check if Claude is authenticated
router.get('/check', async (req, res) => {
  try {
    // Check if .claude.json exists and has valid auth
    const claudeConfigPath = path.join(os.homedir(), '.claude.json');
    
    try {
      const configContent = await fs.readFile(claudeConfigPath, 'utf8');
      const config = JSON.parse(configContent);
      
      // Check for OAuth account or API key
      const hasOAuth = config.oauthAccount && (config.oauthAccount.email || config.oauthAccount.emailAddress);
      const hasApiKey = config.apiKey || config['api-key'];
      
      // Also check if Claude CLI works
      try {
        const { stdout } = await execAsync('claude --version', {
          timeout: 5000
        });
        
        const authenticated = hasOAuth || hasApiKey || stdout.includes('Claude');
        
        res.json({
          authenticated,
          authType: hasOAuth ? 'oauth' : hasApiKey ? 'api-key' : 'unknown',
          email: config.oauthAccount?.emailAddress || config.oauthAccount?.email || null
        });
      } catch (cliError) {
        // Claude CLI not working
        res.json({
          authenticated: false,
          error: 'Claude CLI not available'
        });
      }
    } catch (error) {
      // Config file doesn't exist or is invalid
      res.json({
        authenticated: false,
        error: 'Claude not configured'
      });
    }
  } catch (error) {
    console.error('Error checking Claude auth:', error);
    res.status(500).json({
      authenticated: false,
      error: 'Failed to check authentication status'
    });
  }
});

// Setup Claude authentication
router.post('/setup', async (req, res) => {
  try {
    // Try to run claude setup-token
    const { stdout, stderr } = await execAsync('claude setup-token', {
      timeout: 30000
    });
    
    // Parse the output to see if it contains an auth URL
    const authUrlMatch = stdout.match(/https:\/\/[^\s]+/);
    
    if (authUrlMatch) {
      res.json({
        success: true,
        authUrl: authUrlMatch[0],
        message: 'Please complete authentication in your browser'
      });
    } else {
      res.json({
        success: true,
        message: stdout || 'Please follow the terminal instructions to authenticate'
      });
    }
  } catch (error) {
    console.error('Error setting up Claude auth:', error);
    
    // Check if it's because Claude is already authenticated
    if (error.message.includes('already authenticated')) {
      res.json({
        success: true,
        alreadyAuthenticated: true
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to initiate Claude authentication',
        details: error.message
      });
    }
  }
});

// Get Claude user info
router.get('/user', async (req, res) => {
  try {
    const claudeConfigPath = path.join(os.homedir(), '.claude.json');
    const configContent = await fs.readFile(claudeConfigPath, 'utf8');
    const config = JSON.parse(configContent);
    
    res.json({
      email: config.oauthAccount?.emailAddress || config.oauthAccount?.email || 'claude-user',
      userID: config.userID || null,
      authType: config.oauthAccount ? 'oauth' : 'api-key'
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get user info'
    });
  }
});

export default router; 