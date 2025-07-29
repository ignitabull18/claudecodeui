import express from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const router = express.Router();
const execAsync = promisify(exec);

// POST /api/code-analysis/:projectName/analyze - Analyze project using Claude CLI
router.post('/:projectName/analyze', async (req, res) => {
  try {
    const { projectName } = req.params;
    const { analysisType = 'comprehensive', focusAreas = [] } = req.body;
    
    console.log(`🔍 Starting code analysis for project: ${projectName}, type: ${analysisType}`);
    
    const projectPath = path.join(os.homedir(), '.claude', 'projects', projectName);
    process.chdir(projectPath);
    
    // Create Claude CLI prompt for comprehensive code analysis
    const analysisPrompt = `Please perform a ${analysisType} code analysis of this project. ${focusAreas.length > 0 ? `Focus on: ${focusAreas.join(', ')}.` : ''} 
    
    Analyze:
    - Project structure and architecture patterns
    - Code quality and maintainability metrics
    - Technical debt and complexity issues
    - Dependency relationships and potential circular dependencies
    - Code patterns and conventions
    - Potential refactoring opportunities
    - Security considerations
    
    Provide detailed insights, metrics, and actionable recommendations.`;
    
    // Execute Claude CLI for analysis
    const { stdout, stderr } = await execAsync(`claude --print "${analysisPrompt}"`, {
      cwd: projectPath,
      timeout: 300000 // 5 minutes for comprehensive analysis
    });
    
    if (stderr && !stderr.includes('Warning')) {
      throw new Error(stderr);
    }

    res.json({
      success: true,
      analysis: {
        output: stdout,
        analysisType,
        focusAreas,
      timestamp: new Date().toISOString(),
        project: projectName
      }
    });

  } catch (error) {
    console.error('❌ Error performing code analysis via Claude CLI:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to perform code analysis'
    });
  }
});

// GET /api/code-analysis/:projectName/metrics - Get code quality metrics using Claude CLI
router.get('/:projectName/metrics', async (req, res) => {
  try {
    const { projectName } = req.params;
    console.log(`📊 Getting code metrics for project: ${projectName}`);
    
    const projectPath = path.join(os.homedir(), '.claude', 'projects', projectName);
    process.chdir(projectPath);
    
    // Create Claude CLI prompt for metrics analysis
    const metricsPrompt = `Please analyze this project and provide detailed code quality metrics including:
    
    - Lines of code, file counts, and project size metrics
    - Cyclomatic complexity analysis
    - Maintainability index scores
    - Technical debt assessment
    - Code duplication analysis
    - Test coverage insights (if tests exist)
    - Dependency complexity
    
    Present the metrics in a structured format with specific numbers and recommendations.`;
    
    // Execute Claude CLI for metrics
    const { stdout, stderr } = await execAsync(`claude --print "${metricsPrompt}"`, {
      cwd: projectPath,
      timeout: 120000
    });
    
    if (stderr && !stderr.includes('Warning')) {
      throw new Error(stderr);
    }
    
    res.json({
      success: true,
      metrics: {
        analysis: stdout,
        timestamp: new Date().toISOString(),
        project: projectName
      }
    });

  } catch (error) {
    console.error('❌ Error getting metrics via Claude CLI:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get code metrics'
    });
  }
});

// POST /api/code-analysis/:projectName/patterns - Detect code patterns using Claude CLI
router.post('/:projectName/patterns', async (req, res) => {
  try {
    const { projectName } = req.params;
    const { patternTypes = ['design-patterns', 'anti-patterns', 'architecture-patterns'] } = req.body;
    
    console.log(`🔍 Detecting code patterns for project: ${projectName}`);
    
    const projectPath = path.join(os.homedir(), '.claude', 'projects', projectName);
    process.chdir(projectPath);
    
    // Create Claude CLI prompt for pattern detection
    const patternPrompt = `Please analyze this project and identify code patterns, specifically focusing on:
    
    ${patternTypes.map(type => `- ${type.replace('-', ' ')}`).join('\n')}
    
    For each pattern found, provide:
    - Pattern name and type
    - Files where it's implemented
    - Quality assessment (good/bad/needs improvement)
    - Specific examples with file locations
    - Recommendations for improvement or reinforcement
    
    Also identify any missing patterns that would benefit this codebase.`;
    
    // Execute Claude CLI for pattern detection
    const { stdout, stderr } = await execAsync(`claude --print "${patternPrompt}"`, {
      cwd: projectPath,
      timeout: 180000
    });
    
    if (stderr && !stderr.includes('Warning')) {
      throw new Error(stderr);
    }
    
    res.json({
      success: true,
      patterns: {
        analysis: stdout,
        patternTypes,
        timestamp: new Date().toISOString(),
        project: projectName
      }
    });

  } catch (error) {
    console.error('❌ Error detecting patterns via Claude CLI:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to detect code patterns'
    });
  }
});

// POST /api/code-analysis/:projectName/refactor-suggestions - Get refactoring suggestions using Claude CLI
router.post('/:projectName/refactor-suggestions', async (req, res) => {
  try {
    const { projectName } = req.params;
    const { targetFiles = [], priority = 'high' } = req.body;
    
    console.log(`🔄 Generating refactoring suggestions for project: ${projectName}`);
    
    const projectPath = path.join(os.homedir(), '.claude', 'projects', projectName);
    process.chdir(projectPath);
    
    // Create Claude CLI prompt for refactoring suggestions
    const refactorPrompt = `Please analyze this project and provide refactoring suggestions${targetFiles.length > 0 ? ` focusing on these files: ${targetFiles.join(', ')}` : ''}. 
    
    Focus on ${priority} priority improvements and provide:
    
    - Specific refactoring opportunities with clear descriptions
    - Files and line numbers that need changes
    - Expected benefits (maintainability, performance, readability)
    - Risk assessment for each suggested change
    - Step-by-step refactoring instructions
    - Code examples showing before/after where helpful
    
    Prioritize suggestions that will have the biggest positive impact on code quality.`;
    
    // Execute Claude CLI for refactoring suggestions
    const { stdout, stderr } = await execAsync(`claude --print "${refactorPrompt}"`, {
      cwd: projectPath,
      timeout: 240000
    });
    
    if (stderr && !stderr.includes('Warning')) {
      throw new Error(stderr);
    }
    
    res.json({
      success: true,
      suggestions: {
        analysis: stdout,
        targetFiles,
        priority,
        timestamp: new Date().toISOString(),
        project: projectName
      }
    });

  } catch (error) {
    console.error('❌ Error generating refactoring suggestions via Claude CLI:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate refactoring suggestions'
    });
  }
});

// POST /api/code-analysis/:projectName/dependencies - Analyze dependencies using Claude CLI
router.post('/:projectName/dependencies', async (req, res) => {
  try {
    const { projectName } = req.params;
    const { includeDevDependencies = true, checkCircular = true } = req.body;
    
    console.log(`📦 Analyzing dependencies for project: ${projectName}`);
    
    const projectPath = path.join(os.homedir(), '.claude', 'projects', projectName);
    process.chdir(projectPath);
    
    // Create Claude CLI prompt for dependency analysis
    const dependencyPrompt = `Please analyze the dependencies in this project and provide:
    
    - Complete dependency tree and relationships
    - Package.json analysis (production${includeDevDependencies ? ' and development' : ''} dependencies)
    - Import/export relationships between project files
    ${checkCircular ? '- Circular dependency detection and analysis' : ''}
    - Outdated or vulnerable dependencies (if detectable)
    - Unused dependencies that could be removed
    - Dependency bloat assessment
    - Recommendations for dependency optimization
    
    Focus on both external npm packages and internal file dependencies.`;
    
    // Execute Claude CLI for dependency analysis
    const { stdout, stderr } = await execAsync(`claude --print "${dependencyPrompt}"`, {
      cwd: projectPath,
      timeout: 150000
    });
    
    if (stderr && !stderr.includes('Warning')) {
      throw new Error(stderr);
    }
    
    res.json({
      success: true,
      dependencies: {
        analysis: stdout,
        includeDevDependencies,
        checkCircular,
        timestamp: new Date().toISOString(),
        project: projectName
      }
    });

  } catch (error) {
    console.error('❌ Error analyzing dependencies via Claude CLI:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to analyze dependencies'
    });
  }
});

// POST /api/code-analysis/:projectName/architecture - Analyze architecture using Claude CLI
router.post('/:projectName/architecture', async (req, res) => {
  try {
    const { projectName } = req.params;
    const { depth = 'comprehensive' } = req.body;
    
    console.log(`🏗️ Analyzing architecture for project: ${projectName}, depth: ${depth}`);
    
    const projectPath = path.join(os.homedir(), '.claude', 'projects', projectName);
    process.chdir(projectPath);
    
    // Create Claude CLI prompt for architecture analysis
    const architecturePrompt = `Please perform a ${depth} architecture analysis of this project:
    
    - Overall architecture pattern identification (MVC, layered, microservices, etc.)
    - Component organization and separation of concerns
    - Data flow and control flow analysis
    - Module boundaries and interfaces
    - Architecture strengths and weaknesses
    - Scalability considerations
    - Maintainability assessment
    - Suggested architectural improvements
    - Directory structure evaluation
    - Design principle adherence (SOLID, DRY, etc.)
    
    Provide insights on how well the current architecture supports the project's goals.`;
    
    // Execute Claude CLI for architecture analysis
    const { stdout, stderr } = await execAsync(`claude --print "${architecturePrompt}"`, {
      cwd: projectPath,
      timeout: 200000
    });
    
    if (stderr && !stderr.includes('Warning')) {
      throw new Error(stderr);
    }
    
    res.json({
      success: true,
      architecture: {
        analysis: stdout,
        depth,
        timestamp: new Date().toISOString(),
        project: projectName
      }
    });

  } catch (error) {
    console.error('❌ Error analyzing architecture via Claude CLI:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to analyze architecture'
    });
  }
});

export default router; 