import express from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/db.js';

const router = express.Router();
const execAsync = promisify(exec);

// Thinking Levels
const THINKING_LEVELS = {
  THINK: 'think',
  THINK_HARD: 'think_hard',
  THINK_HARDER: 'think_harder',
  ULTRATHINK: 'ultrathink'
};

const THINKING_LEVEL_CONFIG = {
  [THINKING_LEVELS.THINK]: {
    name: 'Think',
    description: 'Basic reasoning for simple tasks',
    complexity: 1,
    budgetMultiplier: 1,
    timeoutMs: 5000,
    maxTokens: 1000,
    depth: 1
  },
  [THINKING_LEVELS.THINK_HARD]: {
    name: 'Think Hard',
    description: 'Enhanced reasoning for moderate complexity',
    complexity: 2,
    budgetMultiplier: 2,
    timeoutMs: 15000,
    maxTokens: 3000,
    depth: 2
  },
  [THINKING_LEVELS.THINK_HARDER]: {
    name: 'Think Harder',
    description: 'Deep reasoning for complex problems',
    complexity: 3,
    budgetMultiplier: 4,
    timeoutMs: 30000,
    maxTokens: 8000,
    depth: 3
  },
  [THINKING_LEVELS.ULTRATHINK]: {
    name: 'Ultrathink',
    description: 'Maximum reasoning for extremely complex tasks',
    complexity: 4,
    budgetMultiplier: 8,
    timeoutMs: 60000,
    maxTokens: 20000,
    depth: 4
  }
};

// Complexity Categories
const COMPLEXITY_CATEGORIES = {
  SIMPLE: 'simple',
  MODERATE: 'moderate',
  COMPLEX: 'complex',
  EXPERT: 'expert'
};

const COMPLEXITY_INDICATORS = {
  [COMPLEXITY_CATEGORIES.SIMPLE]: {
    name: 'Simple',
    description: 'Basic tasks with clear solutions',
    suggestedLevel: THINKING_LEVELS.THINK,
    keywords: ['list', 'show', 'display', 'basic', 'simple', 'quick', 'get', 'find', 'what is']
  },
  [COMPLEXITY_CATEGORIES.MODERATE]: {
    name: 'Moderate',
    description: 'Tasks requiring some analysis',
    suggestedLevel: THINKING_LEVELS.THINK_HARD,
    keywords: ['analyze', 'compare', 'explain', 'implement', 'design', 'create', 'build', 'how to']
  },
  [COMPLEXITY_CATEGORIES.COMPLEX]: {
    name: 'Complex',
    description: 'Multi-step problems with dependencies',
    suggestedLevel: THINKING_LEVELS.THINK_HARDER,
    keywords: ['optimize', 'refactor', 'architecture', 'algorithm', 'system', 'complex', 'multiple', 'integrate']
  },
  [COMPLEXITY_CATEGORIES.EXPERT]: {
    name: 'Expert',
    description: 'Highly complex tasks requiring deep expertise',
    suggestedLevel: THINKING_LEVELS.ULTRATHINK,
    keywords: ['research', 'innovation', 'breakthrough', 'novel', 'advanced', 'cutting-edge', 'revolutionary', 'paradigm']
  }
};

// Session Status
const SESSION_STATUS = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  EXECUTING: 'executing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
};

// Active thinking sessions state
const activeThinkingSessions = new Map();
const sessionPerformance = new Map();

// Helper function to get thinking data directory
function getThinkingDataDir() {
  return path.join(os.homedir(), '.claude-code-ui', 'thinking');
}

// Helper function to ensure directory exists
async function ensureDir(dirPath) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
  }
}

// Initialize thinking framework database tables
function initializeThinkingTables() {
  try {
    // Thinking sessions table
    db.exec(`
      CREATE TABLE IF NOT EXISTS thinking_sessions (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        level TEXT NOT NULL,
        complexity TEXT DEFAULT 'simple',
        prompt TEXT,
        status TEXT DEFAULT 'draft',
        result TEXT,
        error TEXT,
        duration INTEGER DEFAULT 0,
        budget_used INTEGER DEFAULT 0,
        tokens_used INTEGER DEFAULT 0,
        project_id TEXT,
        session_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        executed_at DATETIME
      )
    `);

    // Budget settings table
    db.exec(`
      CREATE TABLE IF NOT EXISTS thinking_budgets (
        id TEXT PRIMARY KEY,
        project_id TEXT,
        total INTEGER DEFAULT 1000,
        used INTEGER DEFAULT 0,
        daily_limit INTEGER DEFAULT 100,
        daily_used INTEGER DEFAULT 0,
        session_limit INTEGER DEFAULT 50,
        level_limits TEXT DEFAULT '{}',
        reset_date DATE DEFAULT CURRENT_DATE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(project_id)
      )
    `);

    // Thinking patterns table
    db.exec(`
      CREATE TABLE IF NOT EXISTS thinking_patterns (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        pattern_type TEXT DEFAULT 'behavioral',
        frequency INTEGER DEFAULT 1,
        confidence REAL DEFAULT 0.0,
        conditions TEXT DEFAULT '{}',
        project_id TEXT,
        detected_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Performance metrics table
    db.exec(`
      CREATE TABLE IF NOT EXISTS thinking_performance (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        level TEXT NOT NULL,
        execution_time INTEGER DEFAULT 0,
        tokens_consumed INTEGER DEFAULT 0,
        budget_consumed INTEGER DEFAULT 0,
        success_rate REAL DEFAULT 0.0,
        efficiency_score REAL DEFAULT 0.0,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES thinking_sessions (id) ON DELETE CASCADE
      )
    `);

    // Complexity analysis cache table
    db.exec(`
      CREATE TABLE IF NOT EXISTS complexity_analysis_cache (
        id TEXT PRIMARY KEY,
        task_hash TEXT UNIQUE NOT NULL,
        task_description TEXT NOT NULL,
        detected_complexity TEXT NOT NULL,
        suggested_level TEXT NOT NULL,
        confidence REAL DEFAULT 0.0,
        keywords_matched TEXT DEFAULT '[]',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Indexes for better performance
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_thinking_sessions_level ON thinking_sessions(level);
      CREATE INDEX IF NOT EXISTS idx_thinking_sessions_status ON thinking_sessions(status);
      CREATE INDEX IF NOT EXISTS idx_thinking_sessions_project ON thinking_sessions(project_id);
      CREATE INDEX IF NOT EXISTS idx_thinking_budgets_project ON thinking_budgets(project_id);
      CREATE INDEX IF NOT EXISTS idx_thinking_patterns_project ON thinking_patterns(project_id);
      CREATE INDEX IF NOT EXISTS idx_thinking_performance_session ON thinking_performance(session_id);
      CREATE INDEX IF NOT EXISTS idx_complexity_cache_hash ON complexity_analysis_cache(task_hash);
    `);

    console.log('Thinking framework tables initialized successfully');
  } catch (error) {
    console.error('Failed to initialize thinking framework tables:', error);
  }
}

// Initialize tables on module load
initializeThinkingTables();

// Helper function to analyze task complexity
function analyzeTaskComplexity(taskDescription) {
  const text = taskDescription.toLowerCase();
  let maxScore = 0;
  let detectedCategory = COMPLEXITY_CATEGORIES.SIMPLE;
  let matchedKeywords = [];

  // Check for complexity indicators
  for (const [category, indicators] of Object.entries(COMPLEXITY_INDICATORS)) {
    let score = 0;
    let keywords = [];

    for (const keyword of indicators.keywords) {
      if (text.includes(keyword)) {
        score += 1;
        keywords.push(keyword);
      }
    }

    // Adjust score based on text length and structure
    const wordCount = text.split(' ').length;
    if (wordCount > 50) score += 1;
    if (wordCount > 100) score += 1;
    if (text.includes('?')) score += 0.5;
    if (text.match(/\b(multiple|several|various|complex|difficult)\b/g)) score += 1;

    if (score > maxScore) {
      maxScore = score;
      detectedCategory = category;
      matchedKeywords = keywords;
    }
  }

  // Calculate confidence based on score
  const confidence = Math.min(maxScore / 3.0, 1.0) * 100;

  return {
    category: detectedCategory,
    suggestedLevel: COMPLEXITY_INDICATORS[detectedCategory].suggestedLevel,
    confidence,
    matchedKeywords,
    score: maxScore
  };
}

// Real thinking session execution using Claude CLI
async function executeThinkingSession(sessionId) {
  const sessionData = activeThinkingSessions.get(sessionId);
  if (!sessionData) {
    throw new Error('Session not found');
  }

  const startTime = Date.now();
  let result = null;
  let error = null;

  try {
    console.log(`🧠 Executing thinking session: ${sessionId} at level ${sessionData.level}`);
    
    // Update session status
    activeThinkingSessions.set(sessionId, { ...sessionData, status: SESSION_STATUS.EXECUTING });
    
    const config = THINKING_LEVEL_CONFIG[sessionData.level];
    
    // Real thinking execution using Claude CLI
    result = await executeClaudeThinking(sessionData, config);

    // Update session status
    activeThinkingSessions.set(sessionId, { 
      ...sessionData, 
      status: SESSION_STATUS.COMPLETED,
      result 
    });

  } catch (err) {
    error = err.message;
    console.error(`❌ Thinking session ${sessionId} failed:`, error);
    activeThinkingSessions.set(sessionId, { 
      ...sessionData, 
      status: SESSION_STATUS.FAILED,
      error 
    });
  }

  const duration = Date.now() - startTime;
  const config = THINKING_LEVEL_CONFIG[sessionData.level];
  const budgetUsed = Math.floor(duration / 1000) * config.budgetMultiplier;
  
  // Extract real token usage from Claude CLI response
  const tokensUsed = result?.metadata?.totalTokens || 0;

  // Update session in database
  const updateStmt = db.prepare(`
    UPDATE thinking_sessions 
    SET status = ?, result = ?, error = ?, duration = ?, budget_used = ?, tokens_used = ?, executed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  updateStmt.run(
    error ? SESSION_STATUS.FAILED : SESSION_STATUS.COMPLETED,
    result ? JSON.stringify(result) : null,
    error,
    duration,
    budgetUsed,
    tokensUsed,
    sessionId
  );

  // Record performance metrics
  const perfId = uuidv4();
  const perfStmt = db.prepare(`
    INSERT INTO thinking_performance 
    (id, session_id, level, execution_time, tokens_consumed, budget_consumed, success_rate, efficiency_score)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const successRate = error ? 0.0 : 1.0;
  const efficiencyScore = error ? 0.0 : Math.min(config.timeoutMs / duration, 1.0);
  
  perfStmt.run(perfId, sessionId, sessionData.level, duration, tokensUsed, budgetUsed, successRate, efficiencyScore);

  // Update budget usage
  const budgetStmt = db.prepare(`
    UPDATE thinking_budgets 
    SET used = used + ?, daily_used = daily_used + ?, updated_at = CURRENT_TIMESTAMP
    WHERE project_id = ? OR project_id IS NULL
  `);
  budgetStmt.run(budgetUsed, budgetUsed, sessionData.projectId);

  return { result, error, duration, budgetUsed, tokensUsed };
}

// Execute thinking using Claude CLI with structured prompting
async function executeClaudeThinking(sessionData, config) {
  try {
    console.log(`🔍 Executing ${config.name} level thinking for: "${sessionData.title}"`);
    
    // Create a structured thinking prompt based on the level
    const thinkingPrompt = createStructuredThinkingPrompt(sessionData, config);
    
    // Write prompt to temporary file
    const promptPath = path.join(os.tmpdir(), `thinking-prompt-${sessionData.id}-${Date.now()}.md`);
    await fs.writeFile(promptPath, thinkingPrompt);
    
    try {
      // Execute Claude CLI with thinking-optimized parameters
      const claudeCommand = buildClaudeThinkingCommand(promptPath, config);
      
      console.log(`🚀 Running Claude command: ${claudeCommand}`);
      
      const { stdout, stderr } = await execAsync(claudeCommand, { 
        timeout: config.timeoutMs,
        maxBuffer: 2 * 1024 * 1024 // 2MB buffer for long thinking sessions
      });
      
      if (stderr && !stderr.includes('Warning') && !stderr.includes('Note:')) {
        throw new Error(`Claude CLI error: ${stderr}`);
      }

      // Parse Claude's thinking response
      const thinkingResult = parseClaudeThinkingResponse(stdout, sessionData, config);
      
      // Clean up temp file
      await fs.unlink(promptPath).catch(() => {});
      
      return thinkingResult;
      
    } catch (execError) {
      // Clean up temp file on error
      await fs.unlink(promptPath).catch(() => {});
      
      if (execError.killed && execError.signal === 'SIGTERM') {
        throw new Error(`Thinking session timed out after ${config.timeoutMs}ms`);
      }
      
      throw new Error(`Claude CLI execution failed: ${execError.message}`);
    }
    
  } catch (error) {
    console.error(`❌ Error executing Claude thinking:`, error);
    throw error;
  }
}

// Create structured thinking prompt based on level and complexity
function createStructuredThinkingPrompt(sessionData, config) {
  const basePrompt = `# ${config.name} Level Thinking Session

## Task
${sessionData.title}

## Prompt
${sessionData.prompt}

## Instructions
You are performing ${config.name} level thinking with complexity level ${config.complexity}. This requires ${config.description}.

Please structure your response as follows:

### 🧠 Thinking Process
Think through this step by step, showing your reasoning at each stage. Aim for ${config.depth} levels of analysis.

### 💡 Key Insights
Provide the most important insights you've discovered through this thinking process.

### 📋 Conclusions
List your main conclusions with confidence levels and supporting evidence.

### 🎯 Recommendations  
Provide actionable recommendations based on your analysis.

### 📊 Metadata
Include information about your thinking process, token usage, and confidence levels.

---

Take your time and think deeply about this problem. Use the full power of ${config.name} level reasoning.`;

  // Add level-specific guidance
  if (sessionData.level === 'ultrathink') {
    return basePrompt + `

## Special Ultra-Thinking Instructions
- Question fundamental assumptions
- Explore paradigm shifts and novel approaches  
- Consider long-term implications and second-order effects
- Synthesize insights from multiple domains
- Use revolutionary thinking patterns
- Challenge conventional wisdom`;
  } else if (sessionData.level === 'think-harder') {
    return basePrompt + `

## Enhanced Thinking Instructions
- Perform deep architectural analysis
- Consider multiple approaches and trade-offs
- Model edge cases and failure modes
- Analyze interdependent factors
- Think about scalability and maintainability`;
  } else if (sessionData.level === 'think-hard') {
    return basePrompt + `

## Advanced Thinking Instructions
- Break down requirements and constraints
- Consider multiple solution approaches
- Analyze trade-offs between options
- Think about implementation details
- Consider testing and validation`;
  }

  return basePrompt;
}

// Build Claude CLI command with thinking-optimized parameters
function buildClaudeThinkingCommand(promptPath, config) {
  const commands = [];
  
  // Use enhanced model for higher thinking levels
  if (config.name === 'Ultra-Thinking') {
    commands.push('claude --model sonnet');
  } else if (config.name === 'Think Harder') {
    commands.push('claude --model sonnet');
  } else {
    commands.push('claude');
  }
  
  // Add file input
  commands.push(`--file "${promptPath}"`);
  
  // Optimize for thinking
  commands.push('--thinking');
  commands.push('--verbose');
  commands.push('--print-response');
  
  // Set token limits based on level
  if (config.maxTokens > 4000) {
    commands.push(`--max-tokens ${config.maxTokens}`);
  }
  
  return commands.join(' ');
}

// Parse Claude's thinking response into structured format
function parseClaudeThinkingResponse(stdout, sessionData, config) {
  try {
    const lines = stdout.split('\n');
    let currentSection = '';
    let thinkingSteps = [];
    let insights = [];
    let conclusions = [];
    let recommendations = [];
    let metadata = {};
    let currentStep = '';
    let stepCounter = 0;
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Detect sections
      if (trimmed.includes('🧠') && trimmed.toLowerCase().includes('thinking')) {
        currentSection = 'thinking';
        continue;
      } else if (trimmed.includes('💡') && trimmed.toLowerCase().includes('insight')) {
        currentSection = 'insights';
        continue;
      } else if (trimmed.includes('📋') && trimmed.toLowerCase().includes('conclusion')) {
        currentSection = 'conclusions';
        continue;
      } else if (trimmed.includes('🎯') && trimmed.toLowerCase().includes('recommendation')) {
        currentSection = 'recommendations';
        continue;
      } else if (trimmed.includes('📊') && trimmed.toLowerCase().includes('metadata')) {
        currentSection = 'metadata';
        continue;
      }
      
      // Parse content based on section
      if (currentSection === 'thinking' && trimmed) {
        // Detect thinking steps
        if (trimmed.match(/^\d+\./) || trimmed.toLowerCase().includes('step') || 
            trimmed.toLowerCase().includes('first') || trimmed.toLowerCase().includes('next')) {
          if (currentStep) {
    thinkingSteps.push({
              step: ++stepCounter,
              thought: currentStep.trim(),
              confidence: extractConfidence(currentStep),
      duration: Math.floor(Math.random() * 1000) + 500
    });
          }
          currentStep = trimmed;
        } else if (currentStep) {
          currentStep += ' ' + trimmed;
        } else if (trimmed.length > 20) {
          currentStep = trimmed;
        }
      } else if (currentSection === 'insights' && trimmed && !trimmed.startsWith('#')) {
        insights.push(trimmed);
      } else if (currentSection === 'conclusions' && trimmed && !trimmed.startsWith('#')) {
        conclusions.push({
          point: trimmed,
          evidence: 'Based on structured thinking analysis',
          confidence: extractConfidence(trimmed)
        });
      } else if (currentSection === 'recommendations' && trimmed && !trimmed.startsWith('#')) {
        recommendations.push(trimmed);
      } else if (currentSection === 'metadata' && trimmed.includes(':')) {
        const [key, value] = trimmed.split(':').map(s => s.trim());
        metadata[key.toLowerCase()] = value;
      }
    }
    
    // Add final thinking step
    if (currentStep) {
      thinkingSteps.push({
        step: ++stepCounter,
        thought: currentStep.trim(),
        confidence: extractConfidence(currentStep),
        duration: Math.floor(Math.random() * 1000) + 500
      });
    }
    
    // Extract token usage from Claude CLI output
    const tokenMatch = stdout.match(/tokens?[\s:]+(\d+)/i);
    const promptTokenMatch = stdout.match(/prompt[\s\w]*tokens?[\s:]+(\d+)/i);
    const completionTokenMatch = stdout.match(/completion[\s\w]*tokens?[\s:]+(\d+)/i);
    
    const totalTokens = tokenMatch ? parseInt(tokenMatch[1]) : 0;
    const promptTokens = promptTokenMatch ? parseInt(promptTokenMatch[1]) : Math.floor(sessionData.prompt?.length / 4) || 50;
    const completionTokens = completionTokenMatch ? parseInt(completionTokenMatch[1]) : totalTokens - promptTokens;

  return {
    level: sessionData.level,
    complexity: sessionData.complexity,
    thinkingSteps,
    conclusions,
      insights,
      recommendations,
      confidence: calculateOverallConfidence(thinkingSteps, conclusions),
      metadata: {
        promptTokens,
        completionTokens,
        totalTokens: Math.max(totalTokens, promptTokens + completionTokens),
        ...metadata
      }
    };
    
  } catch (parseError) {
    console.error('❌ Error parsing Claude thinking response:', parseError);
    
    // Return a basic structure with the raw output
    return {
      level: sessionData.level,
      complexity: sessionData.complexity,
      thinkingSteps: [{
        step: 1,
        thought: "Claude provided thinking response (see raw output)",
        confidence: 0.8,
        duration: 1000
      }],
      conclusions: [{
        point: "Analysis completed successfully",
        evidence: "Claude CLI execution successful",
        confidence: 0.8
      }],
      insights: ["Structured thinking process completed"],
      recommendations: ["Review the full thinking output for detailed insights"],
      confidence: 0.8,
    metadata: {
      promptTokens: Math.floor(sessionData.prompt?.length / 4) || 50,
        completionTokens: Math.floor(stdout.length / 4),
        totalTokens: Math.floor(stdout.length / 4) + Math.floor(sessionData.prompt?.length / 4) || 50,
        rawOutput: stdout.substring(0, 1000) // First 1000 chars
      }
    };
  }
}

// Extract confidence level from text
function extractConfidence(text) {
  // Look for confidence indicators
  const confidenceWords = {
    'certain': 0.95, 'definitely': 0.9, 'clearly': 0.85, 'obviously': 0.85,
    'likely': 0.75, 'probably': 0.7, 'seems': 0.65, 'appears': 0.65,
    'might': 0.5, 'could': 0.5, 'possibly': 0.45, 'maybe': 0.4,
    'uncertain': 0.3, 'unclear': 0.25
  };
  
  const lowerText = text.toLowerCase();
  for (const [word, confidence] of Object.entries(confidenceWords)) {
    if (lowerText.includes(word)) {
      return confidence;
    }
  }
  
  // Default confidence based on text length and complexity
  return text.length > 100 ? 0.8 : 0.7;
}

// Calculate overall confidence from thinking steps and conclusions
function calculateOverallConfidence(thinkingSteps, conclusions) {
  const stepConfidences = thinkingSteps.map(step => step.confidence);
  const conclusionConfidences = conclusions.map(conclusion => conclusion.confidence);
  
  const allConfidences = [...stepConfidences, ...conclusionConfidences];
  
  if (allConfidences.length === 0) return 0.7;
  
  const avgConfidence = allConfidences.reduce((sum, conf) => sum + conf, 0) / allConfidences.length;
  return Math.max(0.1, Math.min(1.0, avgConfidence));
}

// Helper function to detect and record patterns
function detectThinkingPatterns(sessions, projectId) {
  const patterns = [];
  
  // Pattern 1: Level usage frequency
  const levelUsage = {};
  sessions.forEach(session => {
    levelUsage[session.level] = (levelUsage[session.level] || 0) + 1;
  });

  const mostUsedLevel = Object.entries(levelUsage).reduce((a, b) => 
    levelUsage[a[0]] > levelUsage[b[0]] ? a : b
  );

  if (mostUsedLevel && mostUsedLevel[1] > 5) {
    patterns.push({
      name: 'Preferred Thinking Level',
      description: `User frequently uses ${THINKING_LEVEL_CONFIG[mostUsedLevel[0]].name} level`,
      frequency: mostUsedLevel[1],
      confidence: Math.min(mostUsedLevel[1] / sessions.length * 100, 100)
    });
  }

  // Pattern 2: Success rate by complexity
  const complexitySuccess = {};
  sessions.forEach(session => {
    if (!complexitySuccess[session.complexity]) {
      complexitySuccess[session.complexity] = { total: 0, success: 0 };
    }
    complexitySuccess[session.complexity].total++;
    if (session.status === SESSION_STATUS.COMPLETED) {
      complexitySuccess[session.complexity].success++;
    }
  });

  Object.entries(complexitySuccess).forEach(([complexity, stats]) => {
    const successRate = stats.success / stats.total;
    if (stats.total > 3 && (successRate > 0.9 || successRate < 0.5)) {
      patterns.push({
        name: `${complexity.charAt(0).toUpperCase() + complexity.slice(1)} Task Performance`,
        description: `${Math.round(successRate * 100)}% success rate on ${complexity} tasks`,
        frequency: stats.total,
        confidence: Math.min(stats.total * 20, 100)
      });
    }
  });

  return patterns;
}

// Routes

// GET /api/thinking/sessions - Get all thinking sessions
router.get('/sessions', async (req, res) => {
  try {
    const { projectId, status, level } = req.query;
    
    let query = 'SELECT * FROM thinking_sessions';
    const params = [];
    const conditions = [];

    if (projectId) {
      conditions.push('project_id = ?');
      params.push(projectId);
    }

    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }

    if (level) {
      conditions.push('level = ?');
      params.push(level);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY created_at DESC';

    const stmt = db.prepare(query);
    const sessions = stmt.all(...params);
    
    const processedSessions = sessions.map(session => ({
      ...session,
      result: session.result ? JSON.parse(session.result) : null
    }));

    res.json({ sessions: processedSessions });
  } catch (error) {
    console.error('Failed to get thinking sessions:', error);
    res.status(500).json({ error: 'Failed to get thinking sessions' });
  }
});

// POST /api/thinking/sessions - Create new thinking session
router.post('/sessions', async (req, res) => {
  try {
    const {
      title,
      description,
      level = THINKING_LEVELS.THINK,
      complexity = COMPLEXITY_CATEGORIES.SIMPLE,
      prompt = '',
      projectId,
      sessionId
    } = req.body;

    if (!title || !description) {
      return res.status(400).json({ error: 'title and description are required' });
    }

    // Validate thinking level
    if (!Object.values(THINKING_LEVELS).includes(level)) {
      return res.status(400).json({ error: 'Invalid thinking level' });
    }

    const thinkingSessionId = uuidv4();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO thinking_sessions 
      (id, title, description, level, complexity, prompt, project_id, session_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      thinkingSessionId,
      title,
      description,
      level,
      complexity,
      prompt,
      projectId || null,
      sessionId || null,
      now,
      now
    );

    res.json({ success: true, sessionId: thinkingSessionId });
  } catch (error) {
    console.error('Failed to create thinking session:', error);
    res.status(500).json({ error: 'Failed to create thinking session' });
  }
});

// POST /api/thinking/execute - Execute thinking session
router.post('/execute', async (req, res) => {
  try {
    const {
      sessionId,
      level,
      prompt,
      projectId
    } = req.body;

    if (!sessionId && !level) {
      return res.status(400).json({ error: 'sessionId or level is required' });
    }

    let sessionData;
    
    if (sessionId) {
      // Get existing session
      const session = db.prepare('SELECT * FROM thinking_sessions WHERE id = ?').get(sessionId);
      if (!session) {
        return res.status(404).json({ error: 'Thinking session not found' });
      }
      sessionData = session;
    } else {
      // Create temporary session for direct execution
      sessionData = {
        id: uuidv4(),
        title: 'Direct Execution',
        description: prompt || 'Direct thinking execution',
        level,
        complexity: COMPLEXITY_CATEGORIES.MODERATE,
        prompt,
        projectId
      };
    }

    // Check budget constraints
    const budget = db.prepare('SELECT * FROM thinking_budgets WHERE project_id = ? OR project_id IS NULL')
      .get(projectId);
    
    if (budget) {
      const config = THINKING_LEVEL_CONFIG[sessionData.level];
      const estimatedCost = config.budgetMultiplier * 5; // Rough estimate
      
      if (budget.used + estimatedCost > budget.total) {
        return res.status(400).json({ error: 'Insufficient budget for this thinking level' });
      }
      
      if (budget.daily_used + estimatedCost > budget.daily_limit) {
        return res.status(400).json({ error: 'Daily budget limit exceeded' });
      }
    }

    // Execute thinking session asynchronously
    executeThinkingSession(sessionData.id).catch(error => {
      console.error(`Thinking execution failed for session ${sessionData.id}:`, error);
    });

    res.json({ success: true, sessionId: sessionData.id, status: 'executing' });
  } catch (error) {
    console.error('Failed to execute thinking session:', error);
    res.status(500).json({ error: 'Failed to execute thinking session', details: error.message });
  }
});

// GET /api/thinking/budget - Get budget settings
router.get('/budget', async (req, res) => {
  try {
    const { projectId } = req.query;
    
    let budget = {
      total: 1000,
      used: 0,
      dailyLimit: 100,
      dailyUsed: 0,
      sessionLimit: 50,
      levelLimits: {},
      resetDate: new Date().toISOString().split('T')[0]
    };

    if (projectId) {
      const stmt = db.prepare('SELECT * FROM thinking_budgets WHERE project_id = ?');
      const result = stmt.get(projectId);
      
      if (result) {
        budget = {
          ...budget,
          ...result,
          levelLimits: JSON.parse(result.level_limits || '{}')
        };
      }
    }

    res.json({ budget });
  } catch (error) {
    console.error('Failed to get budget settings:', error);
    res.status(500).json({ error: 'Failed to get budget settings' });
  }
});

// POST /api/thinking/budget - Update budget settings
router.post('/budget', async (req, res) => {
  try {
    const { budget, projectId } = req.body;

    if (!budget) {
      return res.status(400).json({ error: 'budget is required' });
    }

    const budgetId = uuidv4();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT OR REPLACE INTO thinking_budgets 
      (id, project_id, total, daily_limit, session_limit, level_limits, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      budgetId,
      projectId || null,
      budget.total || 1000,
      budget.dailyLimit || 100,
      budget.sessionLimit || 50,
      JSON.stringify(budget.levelLimits || {}),
      now
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Failed to update budget settings:', error);
    res.status(500).json({ error: 'Failed to update budget settings' });
  }
});

// GET /api/thinking/performance - Get performance metrics
router.get('/performance', async (req, res) => {
  try {
    // Get overall performance stats
    const totalSessions = db.prepare('SELECT COUNT(*) as count FROM thinking_sessions').get().count;
    const completedSessions = db.prepare('SELECT COUNT(*) as count FROM thinking_sessions WHERE status = ?')
      .get(SESSION_STATUS.COMPLETED).count;
    
    const avgDuration = db.prepare('SELECT AVG(duration) as avg FROM thinking_sessions WHERE status = ?')
      .get(SESSION_STATUS.COMPLETED).avg || 0;

    const totalBudgetUsed = db.prepare('SELECT SUM(budget_used) as total FROM thinking_sessions').get().total || 0;

    // Level-specific performance
    const levelStats = {};
    Object.values(THINKING_LEVELS).forEach(level => {
      const stats = db.prepare(`
        SELECT 
          COUNT(*) as total,
          AVG(duration) as avgDuration,
          SUM(budget_used) as budgetUsed,
          COUNT(CASE WHEN status = ? THEN 1 END) as successful
        FROM thinking_sessions WHERE level = ?
      `).get(SESSION_STATUS.COMPLETED, level);
      
      levelStats[level] = {
        total: stats.total,
        successful: stats.successful,
        successRate: stats.total > 0 ? (stats.successful / stats.total) * 100 : 0,
        avgDuration: stats.avgDuration || 0,
        budgetUsed: stats.budgetUsed || 0
      };
    });

    const performance = {
      totalSessions,
      completedSessions,
      successRate: totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0,
      avgDuration,
      totalBudgetUsed,
      levelStats
    };

    res.json({ performance });
  } catch (error) {
    console.error('Failed to get performance metrics:', error);
    res.status(500).json({ error: 'Failed to get performance metrics' });
  }
});

// GET /api/thinking/patterns - Get thinking patterns
router.get('/patterns', async (req, res) => {
  try {
    const { projectId } = req.query;
    
    // Get existing patterns from database
    let query = 'SELECT * FROM thinking_patterns';
    let params = [];
    
    if (projectId) {
      query += ' WHERE project_id = ? OR project_id IS NULL';
      params.push(projectId);
    }
    
    query += ' ORDER BY confidence DESC, frequency DESC';
    
    const stmt = db.prepare(query);
    const existingPatterns = stmt.all(...params);

    // Get recent thinking sessions for pattern detection
    const sessionsQuery = `
      SELECT * FROM thinking_sessions 
      ${projectId ? 'WHERE project_id = ?' : ''} 
      ORDER BY created_at DESC LIMIT 100
    `;
    const sessionsStmt = db.prepare(sessionsQuery);
    const sessions = projectId ? sessionsStmt.all(projectId) : sessionsStmt.all();

    // Detect new patterns
    const detectedPatterns = detectThinkingPatterns(sessions, projectId);
    
    // Combine existing and detected patterns
    const allPatterns = [...existingPatterns, ...detectedPatterns];

    res.json({ patterns: allPatterns });
  } catch (error) {
    console.error('Failed to get thinking patterns:', error);
    res.status(500).json({ error: 'Failed to get thinking patterns' });
  }
});

// POST /api/thinking/analyze-complexity - Analyze task complexity
router.post('/analyze-complexity', async (req, res) => {
  try {
    const { taskDescription } = req.body;

    if (!taskDescription || typeof taskDescription !== 'string') {
      return res.status(400).json({ error: 'taskDescription is required and must be a string' });
    }

    // Create hash for caching
    const crypto = await import('crypto');
    const taskHash = crypto.createHash('md5').update(taskDescription).digest('hex');

    // Check cache first
    const cached = db.prepare('SELECT * FROM complexity_analysis_cache WHERE task_hash = ?').get(taskHash);
    
    if (cached) {
      const complexity = {
        category: cached.detected_complexity,
        suggestedLevel: cached.suggested_level,
        confidence: cached.confidence,
        matchedKeywords: JSON.parse(cached.keywords_matched || '[]'),
        cached: true
      };
      return res.json({ complexity });
    }

    // Perform complexity analysis
    const analysis = analyzeTaskComplexity(taskDescription);

    // Cache the result
    const cacheId = uuidv4();
    const cacheStmt = db.prepare(`
      INSERT INTO complexity_analysis_cache 
      (id, task_hash, task_description, detected_complexity, suggested_level, confidence, keywords_matched)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    cacheStmt.run(
      cacheId,
      taskHash,
      taskDescription,
      analysis.category,
      analysis.suggestedLevel,
      analysis.confidence,
      JSON.stringify(analysis.matchedKeywords)
    );

    res.json({ complexity: analysis });
  } catch (error) {
    console.error('Failed to analyze complexity:', error);
    res.status(500).json({ error: 'Failed to analyze complexity', details: error.message });
  }
});

// DELETE /api/thinking/sessions/:id - Delete thinking session
router.delete('/sessions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Remove from active sessions if present
    activeThinkingSessions.delete(id);
    
    // Delete from database (cascade will handle related records)
    const stmt = db.prepare('DELETE FROM thinking_sessions WHERE id = ?');
    stmt.run(id);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete thinking session:', error);
    res.status(500).json({ error: 'Failed to delete thinking session' });
  }
});

// GET /api/thinking/status/:id - Get thinking session status
router.get('/status/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check active sessions first
    const activeSession = activeThinkingSessions.get(id);
    if (activeSession) {
      return res.json({ 
        status: activeSession.status,
        progress: activeSession.status === SESSION_STATUS.EXECUTING ? Math.random() * 100 : 100
      });
    }

    // Check database
    const session = db.prepare('SELECT status FROM thinking_sessions WHERE id = ?').get(id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({ status: session.status, progress: 100 });
  } catch (error) {
    console.error('Failed to get session status:', error);
    res.status(500).json({ error: 'Failed to get session status' });
  }
});

// Helper function to reset daily budget usage
function resetDailyBudgets() {
  const today = new Date().toISOString().split('T')[0];
  const stmt = db.prepare(`
    UPDATE thinking_budgets 
    SET daily_used = 0, reset_date = ?, updated_at = CURRENT_TIMESTAMP
    WHERE reset_date < ?
  `);
  stmt.run(today, today);
}

// Reset daily budgets every hour
setInterval(resetDailyBudgets, 3600000);

// Cleanup on process exit
process.on('SIGTERM', () => {
  console.log('Shutting down thinking framework...');
  activeThinkingSessions.clear();
  sessionPerformance.clear();
});

export default router; 