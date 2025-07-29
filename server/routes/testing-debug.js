import express from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';

const router = express.Router();
const execAsync = promisify(exec);

// POST /api/testing/:projectName/run - Run tests using Claude CLI
router.post('/:projectName/run', async (req, res) => {
  try {
    const { projectName } = req.params;
    const { testCommand, testPath } = req.body;
    
    console.log(`🧪 Running tests for project: ${projectName}`);
    
    const projectPath = path.join(os.homedir(), '.claude', 'projects', projectName);
    process.chdir(projectPath);
    
    // Create Claude CLI prompt for running tests
    const testPrompt = `Please run the tests for this project using the following command: ${testCommand || 'npm test'}${testPath ? ` on path: ${testPath}` : ''}. Provide detailed test results including passed/failed counts, coverage information, and any error details.`;
    
    // Execute Claude CLI to run tests
    const { stdout, stderr } = await execAsync(`claude --print "${testPrompt}"`, {
      cwd: projectPath,
      timeout: 120000 // 2 minutes for test execution
    });
    
    if (stderr && !stderr.includes('Warning')) {
      throw new Error(stderr);
    }
    
    res.json({
      success: true,
      results: {
        output: stdout,
        command: testCommand || 'npm test',
        timestamp: new Date().toISOString(),
        project: projectName
      }
    });
    
  } catch (error) {
    console.error('❌ Error running tests via Claude CLI:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to run tests'
    });
  }
});

// GET /api/testing/:projectName/coverage - Get test coverage using Claude CLI
router.get('/:projectName/coverage', async (req, res) => {
  try {
    const { projectName } = req.params;
    console.log(`📊 Getting test coverage for project: ${projectName}`);
    
    const projectPath = path.join(os.homedir(), '.claude', 'projects', projectName);
    process.chdir(projectPath);
    
    // Create Claude CLI prompt for coverage analysis
    const coveragePrompt = `Please analyze the test coverage for this project. Look for coverage files (coverage/, .nyc_output/, etc.) and provide a comprehensive coverage report including line coverage, branch coverage, function coverage, and identify uncovered areas.`;
    
    // Execute Claude CLI for coverage analysis
    const { stdout, stderr } = await execAsync(`claude --print "${coveragePrompt}"`, {
      cwd: projectPath,
      timeout: 60000
    });
    
    if (stderr && !stderr.includes('Warning')) {
      throw new Error(stderr);
    }
    
    res.json({
      success: true,
      coverage: {
        analysis: stdout,
        timestamp: new Date().toISOString(),
        project: projectName
      }
    });
    
  } catch (error) {
    console.error('❌ Error getting coverage via Claude CLI:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get coverage'
    });
  }
});

// POST /api/testing/:projectName/debug - Debug test failures using Claude CLI
router.post('/:projectName/debug', async (req, res) => {
  try {
    const { projectName } = req.params;
    const { testName, errorLog } = req.body;
    
    console.log(`🐛 Debugging test failure: ${testName} in project: ${projectName}`);
    
    const projectPath = path.join(os.homedir(), '.claude', 'projects', projectName);
    process.chdir(projectPath);
    
    // Create Claude CLI prompt for debugging
    const debugPrompt = `Please help debug this failing test: "${testName}". Error details: ${errorLog}. Analyze the test file, identify potential issues, suggest fixes, and provide debugging strategies.`;
    
    // Execute Claude CLI for debugging assistance
    const { stdout, stderr } = await execAsync(`claude --print "${debugPrompt}"`, {
      cwd: projectPath,
      timeout: 90000
    });
    
    if (stderr && !stderr.includes('Warning')) {
      throw new Error(stderr);
    }
    
    res.json({
      success: true,
      debug: {
        analysis: stdout,
        testName: testName,
        timestamp: new Date().toISOString(),
        project: projectName
      }
    });
    
  } catch (error) {
    console.error('❌ Error debugging tests via Claude CLI:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to debug tests'
    });
  }
});

// POST /api/testing/:projectName/generate - Generate tests using Claude CLI
router.post('/:projectName/generate', async (req, res) => {
  try {
    const { projectName } = req.params;
    const { filePath, testType, framework } = req.body;
    
    console.log(`🏗️ Generating tests for: ${filePath} in project: ${projectName}`);
    
    const projectPath = path.join(os.homedir(), '.claude', 'projects', projectName);
    process.chdir(projectPath);
    
    // Create Claude CLI prompt for test generation
    const generatePrompt = `Please generate ${testType || 'unit'} tests for the file: ${filePath} using ${framework || 'the project\'s testing framework'}. Create comprehensive tests covering edge cases, error conditions, and all major functionality. Follow best testing practices and ensure proper test structure.`;
    
    // Execute Claude CLI for test generation
    const { stdout, stderr } = await execAsync(`claude --print "${generatePrompt}"`, {
      cwd: projectPath,
      timeout: 120000
    });
    
    if (stderr && !stderr.includes('Warning')) {
      throw new Error(stderr);
    }
    
    res.json({
      success: true,
      generated: {
        tests: stdout,
        filePath: filePath,
        testType: testType || 'unit',
        framework: framework,
        timestamp: new Date().toISOString(),
        project: projectName
      }
    });
    
  } catch (error) {
    console.error('❌ Error generating tests via Claude CLI:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate tests'
    });
  }
});

// GET /api/testing/:projectName/history - Get test history using Claude CLI
router.get('/:projectName/history', async (req, res) => {
  try {
    const { projectName } = req.params;
    console.log(`📋 Getting test history for project: ${projectName}`);
    
    const projectPath = path.join(os.homedir(), '.claude', 'projects', projectName);
    process.chdir(projectPath);
    
    // Create Claude CLI prompt for test history analysis
    const historyPrompt = `Please analyze the test history for this project. Look for test result logs, CI/CD history, git commit messages related to tests, and provide insights about test trends, reliability, and areas that frequently fail.`;
    
    // Execute Claude CLI for history analysis
    const { stdout, stderr } = await execAsync(`claude --print "${historyPrompt}"`, {
      cwd: projectPath,
      timeout: 60000
    });
    
    if (stderr && !stderr.includes('Warning')) {
      throw new Error(stderr);
    }
    
    res.json({
      success: true,
      history: {
        analysis: stdout,
        timestamp: new Date().toISOString(),
        project: projectName
      }
    });
    
  } catch (error) {
    console.error('❌ Error getting test history via Claude CLI:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get test history'
    });
  }
});

// POST /api/testing/:projectName/optimize - Optimize tests using Claude CLI
router.post('/:projectName/optimize', async (req, res) => {
  try {
    const { projectName } = req.params;
    const { optimizationType } = req.body; // 'performance', 'coverage', 'maintainability'
    
    console.log(`⚡ Optimizing tests (${optimizationType}) for project: ${projectName}`);
    
    const projectPath = path.join(os.homedir(), '.claude', 'projects', projectName);
    process.chdir(projectPath);
    
    // Create Claude CLI prompt for test optimization
    const optimizePrompt = `Please optimize the tests in this project focusing on ${optimizationType || 'overall quality'}. Analyze the existing test suite and suggest improvements for better performance, coverage, maintainability, and reliability. Provide specific recommendations and code examples.`;
    
    // Execute Claude CLI for test optimization
    const { stdout, stderr } = await execAsync(`claude --print "${optimizePrompt}"`, {
      cwd: projectPath,
      timeout: 120000
    });
    
    if (stderr && !stderr.includes('Warning')) {
      throw new Error(stderr);
    }
    
    res.json({
      success: true,
      optimization: {
        recommendations: stdout,
        type: optimizationType || 'general',
        timestamp: new Date().toISOString(),
        project: projectName
      }
    });
    
  } catch (error) {
    console.error('❌ Error optimizing tests via Claude CLI:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to optimize tests'
    });
  }
});

export default router; 