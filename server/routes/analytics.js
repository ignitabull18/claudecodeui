import express from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/db.js';

const router = express.Router();

// Claude model pricing (per 1M tokens)
const MODEL_PRICING = {
  'haiku': { input: 0.25, output: 1.25 },
  'sonnet': { input: 3.0, output: 15.0 },
  'opus': { input: 15.0, output: 75.0 }
};

// Tool categories for analytics
const TOOL_CATEGORIES = {
  'read_file': 'file',
  'edit_file': 'file',
  'search_replace': 'file',
  'list_dir': 'file',
  'file_search': 'file',
  'delete_file': 'file',
  'codebase_search': 'search',
  'grep_search': 'search',
  'web_search': 'search',
  'run_terminal_cmd': 'code',
  'create_diagram': 'analysis',
  'edit_notebook': 'code',
  'todo_write': 'other',
  'update_memory': 'other'
};

// Helper function to get analytics data directory
function getAnalyticsDataDir() {
  const homeDir = os.homedir();
  return path.join(homeDir, '.claude', 'analytics');
}

// Helper function to ensure directory exists
async function ensureDir(dirPath) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
}

// Helper function to get time range filter
function getTimeRangeFilter(timeRange) {
  const now = new Date();
  let startDate;

  switch (timeRange) {
    case '24h':
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case '7d':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case '90d':
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case 'all':
    default:
      startDate = new Date('2020-01-01');
      break;
  }

  return startDate.toISOString();
}

// Helper function to save analytics event
async function saveAnalyticsEvent(eventType, data, userId = 1, projectName = null) {
  try {
    const analyticsDir = getAnalyticsDataDir();
    await ensureDir(analyticsDir);

    const event = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      userId,
      projectName,
      eventType,
      data: JSON.stringify(data)
    };

    // Save to daily analytics file
    const date = new Date().toISOString().split('T')[0];
    const analyticsFile = path.join(analyticsDir, `analytics-${date}.jsonl`);

    await fs.appendFile(analyticsFile, JSON.stringify(event) + '\n');

    // Also save to database for quick queries
    try {
      const stmt = db.prepare(`
        INSERT INTO analytics_events (id, timestamp, user_id, project_name, event_type, data)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      stmt.run(event.id, event.timestamp, event.userId, event.projectName, event.eventType, event.data);
    } catch (dbError) {
      console.warn('Failed to save analytics to database:', dbError.message);
    }

    return event;
  } catch (error) {
    console.error('Error saving analytics event:', error);
  }
}

// Helper function to load analytics events from files
async function loadAnalyticsEvents(startDate, endDate = null, projectName = null) {
  try {
    const analyticsDir = getAnalyticsDataDir();
    const events = [];

    // Get all analytics files within date range
    const files = await fs.readdir(analyticsDir);
    const analyticsFiles = files.filter(file => file.startsWith('analytics-') && file.endsWith('.jsonl'));

    for (const file of analyticsFiles) {
      const filePath = path.join(analyticsDir, file);
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const lines = content.trim().split('\n').filter(line => line.trim());

        for (const line of lines) {
          try {
            const event = JSON.parse(line);
            const eventDate = new Date(event.timestamp);

            // Filter by date range
            if (eventDate >= new Date(startDate) && 
                (!endDate || eventDate <= new Date(endDate))) {
              
              // Filter by project if specified
              if (!projectName || projectName === 'all' || event.projectName === projectName) {
                events.push(event);
              }
            }
          } catch (parseError) {
            // Skip invalid JSON lines
          }
        }
      } catch (fileError) {
        // Skip files that can't be read
      }
    }

    return events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  } catch (error) {
    console.error('Error loading analytics events:', error);
    return [];
  }
}

// Helper function to calculate token costs
function calculateTokenCost(tokens, model = 'sonnet', type = 'input') {
  const pricing = MODEL_PRICING[model] || MODEL_PRICING['sonnet'];
  const costPer1M = pricing[type] || pricing.input;
  return (tokens / 1000000) * costPer1M;
}

// Helper function to aggregate session data
async function aggregateSessionData(events, timeRange) {
  const sessions = new Map();
  const dailyStats = new Map();

  for (const event of events) {
    if (event.eventType === 'session_start' || event.eventType === 'session_message') {
      const data = JSON.parse(event.data);
      const sessionId = data.sessionId;
      const date = event.timestamp.split('T')[0];

      if (!sessions.has(sessionId)) {
        sessions.set(sessionId, {
          id: sessionId,
          startTime: event.timestamp,
          endTime: event.timestamp,
          messageCount: 0,
          tokenCount: 0,
          projectName: event.projectName,
          model: data.model || 'sonnet'
        });
      }

      const session = sessions.get(sessionId);
      session.endTime = event.timestamp;
      session.messageCount++;
      session.tokenCount += data.tokens || 0;

      // Update daily stats
      if (!dailyStats.has(date)) {
        dailyStats.set(date, {
          date,
          sessions: new Set(),
          messages: 0,
          tokens: 0,
          cost: 0
        });
      }

      const dayStats = dailyStats.get(date);
      dayStats.sessions.add(sessionId);
      dayStats.messages++;
      dayStats.tokens += data.tokens || 0;
    }
  }

  // Convert sessions map to array and calculate durations
  const sessionArray = Array.from(sessions.values()).map(session => ({
    ...session,
    duration: Math.floor((new Date(session.endTime) - new Date(session.startTime)) / 1000),
    cost: calculateTokenCost(session.tokenCount, session.model)
  }));

  // Convert daily stats and calculate session counts
  const dailyStatsArray = Array.from(dailyStats.values()).map(day => ({
    ...day,
    sessions: day.sessions.size,
    cost: calculateTokenCost(day.tokens)
  }));

  return { sessions: sessionArray, dailyStats: dailyStatsArray };
}

// Initialize analytics database tables
function initializeAnalyticsTables() {
  try {
    // Analytics events table
    db.exec(`
      CREATE TABLE IF NOT EXISTS analytics_events (
        id TEXT PRIMARY KEY,
        timestamp DATETIME NOT NULL,
        user_id INTEGER NOT NULL,
        project_name TEXT,
        event_type TEXT NOT NULL,
        data TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Indexes for performance
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_analytics_timestamp ON analytics_events(timestamp);
      CREATE INDEX IF NOT EXISTS idx_analytics_user ON analytics_events(user_id);
      CREATE INDEX IF NOT EXISTS idx_analytics_project ON analytics_events(project_name);
      CREATE INDEX IF NOT EXISTS idx_analytics_type ON analytics_events(event_type);
    `);

    console.log('✅ Analytics database tables initialized');
  } catch (error) {
    console.error('❌ Error initializing analytics tables:', error);
  }
}

// Initialize analytics tables on startup
initializeAnalyticsTables();

// GET /api/analytics/overview - Get overview analytics
router.get('/overview', async (req, res) => {
  try {
    const { timeRange = '7d', projectName = 'all' } = req.query;
    const startDate = getTimeRangeFilter(timeRange);

    console.log(`📊 Loading overview analytics: ${timeRange}, project: ${projectName}`);

    const events = await loadAnalyticsEvents(startDate, null, projectName);
    const { sessions, dailyStats } = await aggregateSessionData(events, timeRange);

    // Calculate totals
    const totalTokens = sessions.reduce((sum, s) => sum + s.tokenCount, 0);
    const totalCost = sessions.reduce((sum, s) => sum + s.cost, 0);
    const totalSessions = sessions.length;

    // Calculate model usage breakdown
    const modelUsage = {};
    sessions.forEach(session => {
      const model = session.model || 'sonnet';
      modelUsage[model] = (modelUsage[model] || 0) + session.tokenCount;
    });

    // Calculate tool usage
    const toolUsage = new Map();
    events.filter(e => e.eventType === 'tool_usage').forEach(event => {
      const data = JSON.parse(event.data);
      const category = TOOL_CATEGORIES[data.toolName] || 'other';
      const current = toolUsage.get(data.toolName) || { name: data.toolName, category, usage: 0 };
      current.usage++;
      toolUsage.set(data.toolName, current);
    });

    const topTools = Array.from(toolUsage.values())
      .sort((a, b) => b.usage - a.usage)
      .slice(0, 10);

    // Calculate productivity score (simplified)
    const avgSessionDuration = sessions.length > 0 ? 
      sessions.reduce((sum, s) => sum + s.duration, 0) / sessions.length : 0;
    const avgMessagesPerSession = sessions.length > 0 ?
      sessions.reduce((sum, s) => sum + s.messageCount, 0) / sessions.length : 0;
    
    const productivityScore = Math.round(
      (avgMessagesPerSession * 10) + (avgSessionDuration / 60) + (totalSessions * 5)
    );

    // Mock trend calculations (in a real implementation, compare with previous period)
    const tokensTrend = 0.15; // +15%
    const costTrend = 0.12; // +12%
    const sessionsTrend = 0.08; // +8%
    const productivityTrend = 0.05; // +5%

    res.json({
      success: true,
      totalTokens,
      totalCost,
      totalSessions,
      productivityScore,
      tokensTrend,
      costTrend,
      sessionsTrend,
      productivityTrend,
      modelUsage,
      topTools,
      lastUpdated: new Date().toISOString(),
      timeRange,
      projectName
    });
  } catch (error) {
    console.error('Error loading overview analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load overview analytics',
      details: error.message
    });
  }
});

// GET /api/analytics/usage - Get token usage analytics
router.get('/usage', async (req, res) => {
  try {
    const { timeRange = '7d', projectName = 'all' } = req.query;
    const startDate = getTimeRangeFilter(timeRange);

    const events = await loadAnalyticsEvents(startDate, null, projectName);
    const { sessions, dailyStats } = await aggregateSessionData(events, timeRange);

    // Calculate usage breakdown by model
    const modelBreakdown = {};
    sessions.forEach(session => {
      const model = session.model || 'sonnet';
      if (!modelBreakdown[model]) {
        modelBreakdown[model] = { tokens: 0, sessions: 0, cost: 0 };
      }
      modelBreakdown[model].tokens += session.tokenCount;
      modelBreakdown[model].sessions++;
      modelBreakdown[model].cost += session.cost;
    });

    // Calculate hourly usage patterns
    const hourlyUsage = new Array(24).fill(0);
    sessions.forEach(session => {
      const hour = new Date(session.startTime).getHours();
      hourlyUsage[hour] += session.tokenCount;
    });

    res.json({
      success: true,
      totalTokens: sessions.reduce((sum, s) => sum + s.tokenCount, 0),
      modelBreakdown,
      dailyStats,
      hourlyUsage,
      averageTokensPerSession: sessions.length > 0 ? 
        sessions.reduce((sum, s) => sum + s.tokenCount, 0) / sessions.length : 0,
      peakUsageTime: hourlyUsage.indexOf(Math.max(...hourlyUsage)),
      timeRange,
      projectName
    });
  } catch (error) {
    console.error('Error loading usage analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load usage analytics',
      details: error.message
    });
  }
});

// GET /api/analytics/costs - Get cost analytics
router.get('/costs', async (req, res) => {
  try {
    const { timeRange = '7d', projectName = 'all' } = req.query;
    const startDate = getTimeRangeFilter(timeRange);

    const events = await loadAnalyticsEvents(startDate, null, projectName);
    const { sessions, dailyStats } = await aggregateSessionData(events, timeRange);

    // Calculate cost breakdown
    const totalCost = sessions.reduce((sum, s) => sum + s.cost, 0);
    const costByModel = {};
    const costByProject = {};

    sessions.forEach(session => {
      const model = session.model || 'sonnet';
      costByModel[model] = (costByModel[model] || 0) + session.cost;
      
      const project = session.projectName || 'unknown';
      costByProject[project] = (costByProject[project] || 0) + session.cost;
    });

    // Calculate daily costs
    const dailyCosts = dailyStats.map(day => ({
      date: day.date,
      cost: day.cost,
      tokens: day.tokens,
      sessions: day.sessions
    }));

    // Estimate monthly cost projection
    const avgDailyCost = dailyCosts.length > 0 ? 
      dailyCosts.reduce((sum, d) => sum + d.cost, 0) / dailyCosts.length : 0;
    const monthlyProjection = avgDailyCost * 30;

    res.json({
      success: true,
      totalCost,
      costByModel,
      costByProject,
      dailyCosts,
      averageCostPerSession: sessions.length > 0 ? totalCost / sessions.length : 0,
      monthlyProjection,
      timeRange,
      projectName
    });
  } catch (error) {
    console.error('Error loading cost analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load cost analytics',
      details: error.message
    });
  }
});

// GET /api/analytics/tools - Get tool usage analytics
router.get('/tools', async (req, res) => {
  try {
    const { timeRange = '7d', projectName = 'all' } = req.query;
    const startDate = getTimeRangeFilter(timeRange);

    const events = await loadAnalyticsEvents(startDate, null, projectName);

    // Analyze tool usage
    const toolStats = new Map();
    events.filter(e => e.eventType === 'tool_usage').forEach(event => {
      const data = JSON.parse(event.data);
      const toolName = data.toolName;
      const category = TOOL_CATEGORIES[toolName] || 'other';

      if (!toolStats.has(toolName)) {
        toolStats.set(toolName, {
          name: toolName,
          category,
          totalUsage: 0,
          successfulUsage: 0,
          failedUsage: 0,
          averageExecutionTime: 0,
          lastUsed: event.timestamp
        });
      }

      const tool = toolStats.get(toolName);
      tool.totalUsage++;
      
      if (data.success) {
        tool.successfulUsage++;
      } else {
        tool.failedUsage++;
      }

      tool.averageExecutionTime = ((tool.averageExecutionTime * (tool.totalUsage - 1)) + 
        (data.executionTime || 0)) / tool.totalUsage;
      
      if (new Date(event.timestamp) > new Date(tool.lastUsed)) {
        tool.lastUsed = event.timestamp;
      }
    });

    // Convert to array and sort by usage
    const toolsArray = Array.from(toolStats.values())
      .sort((a, b) => b.totalUsage - a.totalUsage);

    // Calculate category breakdown
    const categoryStats = {};
    toolsArray.forEach(tool => {
      if (!categoryStats[tool.category]) {
        categoryStats[tool.category] = { totalUsage: 0, tools: 0 };
      }
      categoryStats[tool.category].totalUsage += tool.totalUsage;
      categoryStats[tool.category].tools++;
    });

    res.json({
      success: true,
      tools: toolsArray,
      categoryStats,
      totalToolUsage: toolsArray.reduce((sum, t) => sum + t.totalUsage, 0),
      mostUsedTool: toolsArray.length > 0 ? toolsArray[0] : null,
      timeRange,
      projectName
    });
  } catch (error) {
    console.error('Error loading tool analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load tool analytics',
      details: error.message
    });
  }
});

// GET /api/analytics/sessions - Get session analytics
router.get('/sessions', async (req, res) => {
  try {
    const { timeRange = '7d', projectName = 'all' } = req.query;
    const startDate = getTimeRangeFilter(timeRange);

    const events = await loadAnalyticsEvents(startDate, null, projectName);
    const { sessions, dailyStats } = await aggregateSessionData(events, timeRange);

    // Calculate session metrics
    const totalSessions = sessions.length;
    const averageDuration = sessions.length > 0 ? 
      sessions.reduce((sum, s) => sum + s.duration, 0) / sessions.length : 0;
    const averageMessages = sessions.length > 0 ?
      sessions.reduce((sum, s) => sum + s.messageCount, 0) / sessions.length : 0;

    // Session length distribution
    const durationBuckets = {
      'short': 0,  // < 5 minutes
      'medium': 0, // 5-30 minutes
      'long': 0,   // 30-120 minutes
      'extended': 0 // > 2 hours
    };

    sessions.forEach(session => {
      const minutes = session.duration / 60;
      if (minutes < 5) durationBuckets.short++;
      else if (minutes < 30) durationBuckets.medium++;
      else if (minutes < 120) durationBuckets.long++;
      else durationBuckets.extended++;
    });

    // Activity patterns
    const hourlyActivity = new Array(24).fill(0);
    const dailyActivity = new Array(7).fill(0);

    sessions.forEach(session => {
      const date = new Date(session.startTime);
      hourlyActivity[date.getHours()]++;
      dailyActivity[date.getDay()]++;
    });

    res.json({
      success: true,
      totalSessions,
      averageDuration,
      averageMessages,
      durationBuckets,
      hourlyActivity,
      dailyActivity,
      dailyStats,
      recentSessions: sessions.slice(0, 10),
      timeRange,
      projectName
    });
  } catch (error) {
    console.error('Error loading session analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load session analytics',
      details: error.message
    });
  }
});

// GET /api/analytics/productivity - Get productivity metrics
router.get('/productivity', async (req, res) => {
  try {
    const { timeRange = '7d', projectName = 'all' } = req.query;
    const startDate = getTimeRangeFilter(timeRange);

    const events = await loadAnalyticsEvents(startDate, null, projectName);
    const { sessions } = await aggregateSessionData(events, timeRange);

    // Calculate productivity metrics
    const codeEvents = events.filter(e => e.eventType === 'file_operation');
    const searchEvents = events.filter(e => e.eventType === 'search_operation');
    const taskEvents = events.filter(e => e.eventType === 'task_completion');

    const metrics = {
      sessionsPerDay: sessions.length / Math.max(1, Math.ceil(
        (new Date() - new Date(startDate)) / (1000 * 60 * 60 * 24)
      )),
      avgSessionDuration: sessions.length > 0 ? 
        sessions.reduce((sum, s) => sum + s.duration, 0) / sessions.length : 0,
      messagesPerSession: sessions.length > 0 ?
        sessions.reduce((sum, s) => sum + s.messageCount, 0) / sessions.length : 0,
      codeGenerated: codeEvents.length,
      filesModified: codeEvents.filter(e => {
        const data = JSON.parse(e.data);
        return data.operation === 'edit' || data.operation === 'create';
      }).length,
      tasksCompleted: taskEvents.length
    };

    // Calculate efficiency score
    const efficiencyScore = Math.round(
      (metrics.messagesPerSession * 5) +
      (metrics.codeGenerated * 2) +
      (metrics.tasksCompleted * 10) +
      Math.min(metrics.avgSessionDuration / 60, 60) // Cap at 60 minutes
    );

    // Daily productivity trends
    const dailyProductivity = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      
      const daySessions = sessions.filter(s => s.startTime.startsWith(dateStr));
      const dayCodeEvents = codeEvents.filter(e => e.timestamp.startsWith(dateStr));
      
      dailyProductivity.push({
        date: dateStr,
        sessions: daySessions.length,
        codeOperations: dayCodeEvents.length,
        productivity: daySessions.length * 10 + dayCodeEvents.length * 2
      });
    }

    res.json({
      success: true,
      metrics,
      efficiencyScore,
      dailyProductivity,
      timeRange,
      projectName
    });
  } catch (error) {
    console.error('Error loading productivity analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load productivity analytics',
      details: error.message
    });
  }
});

// GET /api/analytics/export - Export analytics data
router.get('/export', async (req, res) => {
  try {
    const { timeRange = '7d', projectName = 'all', format = 'csv' } = req.query;
    const startDate = getTimeRangeFilter(timeRange);

    const events = await loadAnalyticsEvents(startDate, null, projectName);
    const { sessions } = await aggregateSessionData(events, timeRange);

    if (format === 'csv') {
      // Generate CSV content
      const csvHeaders = [
        'Session ID', 'Start Time', 'End Time', 'Duration (min)', 'Messages', 'Tokens', 'Cost', 'Model', 'Project'
      ];

      const csvRows = sessions.map(session => [
        session.id,
        session.startTime,
        session.endTime,
        Math.round(session.duration / 60),
        session.messageCount,
        session.tokenCount,
        session.cost.toFixed(4),
        session.model,
        session.projectName || 'N/A'
      ]);

      const csvContent = [
        csvHeaders.join(','),
        ...csvRows.map(row => row.join(','))
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 
        `attachment; filename="claude-analytics-${timeRange}.csv"`);
      res.send(csvContent);
    } else {
      // Return JSON format
      res.json({
        success: true,
        sessions,
        events: events.slice(0, 1000), // Limit events for JSON export
        exported: new Date().toISOString(),
        timeRange,
        projectName
      });
    }
  } catch (error) {
    console.error('Error exporting analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export analytics',
      details: error.message
    });
  }
});

// POST /api/analytics/track - Track analytics event (for internal use)
router.post('/track', async (req, res) => {
  try {
    const { eventType, data, projectName } = req.body;
    const userId = req.user?.id || 1;

    if (!eventType) {
      return res.status(400).json({
        success: false,
        error: 'Event type is required'
      });
    }

    const event = await saveAnalyticsEvent(eventType, data, userId, projectName);

    res.json({
      success: true,
      eventId: event.id,
      message: 'Analytics event tracked successfully'
    });
  } catch (error) {
    console.error('Error tracking analytics event:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to track analytics event',
      details: error.message
    });
  }
});

// DELETE /api/analytics/data - Clear analytics data
router.delete('/data', async (req, res) => {
  try {
    const { timeRange = 'all', projectName = 'all' } = req.query;

    // Clear database records
    let query = 'DELETE FROM analytics_events WHERE 1=1';
    const params = [];

    if (timeRange !== 'all') {
      const startDate = getTimeRangeFilter(timeRange);
      query += ' AND timestamp >= ?';
      params.push(startDate);
    }

    if (projectName !== 'all') {
      query += ' AND project_name = ?';
      params.push(projectName);
    }

    const stmt = db.prepare(query);
    const result = stmt.run(...params);

    res.json({
      success: true,
      deletedRecords: result.changes,
      message: 'Analytics data cleared successfully'
    });
  } catch (error) {
    console.error('Error clearing analytics data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear analytics data',
      details: error.message
    });
  }
});

// Export the analytics tracking function for use by other modules
export { saveAnalyticsEvent };

export default router; 