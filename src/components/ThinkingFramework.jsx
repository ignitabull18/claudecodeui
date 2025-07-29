import React, { useState, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { 
  X, Plus, Settings, Brain, Activity, BarChart3, Clock, Zap,
  Target, TrendingUp, AlertTriangle, CheckCircle, RefreshCw,
  Eye, EyeOff, Play, Pause, Square as Stop, RotateCcw, Lightbulb,
  Cpu, Database as Memory, Timer, ArrowUp, ArrowDown, Gauge, Layers,
  BookOpen, FileText, Search, Filter, MoreHorizontal,
  Sparkles, Flame, Rocket, Infinity, CircuitBoard, Save
} from 'lucide-react';

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
    icon: Brain,
    color: 'text-green-600 bg-green-100',
    complexity: 1,
    budgetMultiplier: 1,
    timeoutMs: 5000,
    maxTokens: 1000,
    depth: 1
  },
  [THINKING_LEVELS.THINK_HARD]: {
    name: 'Think Hard',
    description: 'Enhanced reasoning for moderate complexity',
    icon: Lightbulb,
    color: 'text-blue-600 bg-blue-100',
    complexity: 2,
    budgetMultiplier: 2,
    timeoutMs: 15000,
    maxTokens: 3000,
    depth: 2
  },
  [THINKING_LEVELS.THINK_HARDER]: {
    name: 'Think Harder',
    description: 'Deep reasoning for complex problems',
    icon: Flame,
    color: 'text-orange-600 bg-orange-100',
    complexity: 3,
    budgetMultiplier: 4,
    timeoutMs: 30000,
    maxTokens: 8000,
    depth: 3
  },
  [THINKING_LEVELS.ULTRATHINK]: {
    name: 'Ultrathink',
    description: 'Maximum reasoning for extremely complex tasks',
    icon: Rocket,
    color: 'text-purple-600 bg-purple-100',
    complexity: 4,
    budgetMultiplier: 8,
    timeoutMs: 60000,
    maxTokens: 20000,
    depth: 4
  }
};

// Task Complexity Categories
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
    color: 'text-green-600 bg-green-100',
    suggestedLevel: THINKING_LEVELS.THINK,
    keywords: ['list', 'show', 'display', 'basic', 'simple', 'quick']
  },
  [COMPLEXITY_CATEGORIES.MODERATE]: {
    name: 'Moderate',
    description: 'Tasks requiring some analysis',
    color: 'text-blue-600 bg-blue-100',
    suggestedLevel: THINKING_LEVELS.THINK_HARD,
    keywords: ['analyze', 'compare', 'explain', 'implement', 'design']
  },
  [COMPLEXITY_CATEGORIES.COMPLEX]: {
    name: 'Complex',
    description: 'Multi-step problems with dependencies',
    color: 'text-orange-600 bg-orange-100',
    suggestedLevel: THINKING_LEVELS.THINK_HARDER,
    keywords: ['optimize', 'refactor', 'architecture', 'algorithm', 'system', 'complex']
  },
  [COMPLEXITY_CATEGORIES.EXPERT]: {
    name: 'Expert',
    description: 'Highly complex tasks requiring deep expertise',
    color: 'text-purple-600 bg-purple-100',
    suggestedLevel: THINKING_LEVELS.ULTRATHINK,
    keywords: ['research', 'innovation', 'breakthrough', 'novel', 'advanced', 'cutting-edge']
  }
};

function ThinkingFramework({ isOpen, onClose, selectedProject, currentSession }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [thinkingSessions, setThinkingSessions] = useState([]);
  const [budgetSettings, setBudgetSettings] = useState({});
  const [performance, setPerformance] = useState({});
  const [patterns, setPatterns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [showCreateSession, setShowCreateSession] = useState(false);
  const [autoMode, setAutoMode] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLevel, setFilterLevel] = useState('all');

  // Load thinking framework data
  const loadThinkingData = useCallback(async () => {
    setLoading(true);
    try {
      const [sessionsRes, budgetRes, perfRes, patternsRes] = await Promise.all([
        fetch('/api/thinking/sessions'),
        fetch('/api/thinking/budget'),
        fetch('/api/thinking/performance'),
        fetch('/api/thinking/patterns')
      ]);

      if (sessionsRes.ok) {
        const sessionsData = await sessionsRes.json();
        setThinkingSessions(sessionsData.sessions || []);
      }

      if (budgetRes.ok) {
        const budgetData = await budgetRes.json();
        setBudgetSettings(budgetData.budget || {});
      }

      if (perfRes.ok) {
        const perfData = await perfRes.json();
        setPerformance(perfData.performance || {});
      }

      if (patternsRes.ok) {
        const patternsData = await patternsRes.json();
        setPatterns(patternsData.patterns || []);
      }
    } catch (error) {
      console.error('Failed to load thinking data:', error);
    }
    setLoading(false);
  }, []);

  // Create new thinking session
  const createThinkingSession = async (sessionData) => {
    try {
      const response = await fetch('/api/thinking/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...sessionData,
          projectId: selectedProject?.id,
          sessionId: currentSession?.id
        })
      });

      if (response.ok) {
        await loadThinkingData();
        setShowCreateSession(false);
      }
    } catch (error) {
      console.error('Failed to create thinking session:', error);
    }
  };

  // Update budget settings
  const updateBudgetSettings = async (newBudget) => {
    try {
      const response = await fetch('/api/thinking/budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          budget: newBudget,
          projectId: selectedProject?.id
        })
      });

      if (response.ok) {
        await loadThinkingData();
      }
    } catch (error) {
      console.error('Failed to update budget:', error);
    }
  };

  // Analyze task complexity
  const analyzeComplexity = async (taskDescription) => {
    try {
      const response = await fetch('/api/thinking/analyze-complexity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskDescription })
      });

      if (response.ok) {
        const result = await response.json();
        return result.complexity;
      }
    } catch (error) {
      console.error('Failed to analyze complexity:', error);
    }
    return null;
  };

  // Execute thinking session
  const executeThinking = async (sessionId, level, prompt) => {
    try {
      const response = await fetch('/api/thinking/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          level,
          prompt,
          projectId: selectedProject?.id
        })
      });

      if (response.ok) {
        await loadThinkingData();
        return await response.json();
      }
    } catch (error) {
      console.error('Failed to execute thinking:', error);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadThinkingData();
      // Set up real-time updates
      const interval = setInterval(loadThinkingData, 10000);
      return () => clearInterval(interval);
    }
  }, [isOpen, loadThinkingData]);

  // Filter sessions based on search and level
  const filteredSessions = thinkingSessions.filter(session => {
    const matchesSearch = searchQuery === '' || 
      session.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesLevel = filterLevel === 'all' || session.level === filterLevel;
    
    return matchesSearch && matchesLevel;
  });

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop fixed inset-0 flex items-center justify-center z-[100] md:p-4 bg-background/95">
      <div className="bg-background border border-border md:rounded-lg shadow-xl w-full md:max-w-7xl h-full md:h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <CircuitBoard className="w-5 h-5 md:w-6 md:h-6 text-purple-600" />
            <div>
              <h2 className="text-lg md:text-xl font-semibold text-foreground">
                Extended Thinking Framework
              </h2>
              <p className="text-sm text-muted-foreground">
                Adaptive reasoning with multiple thinking levels and budget management
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              Auto Mode: {autoMode ? 'ON' : 'OFF'}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={loadThinkingData}
              disabled={loading}
              className="text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground touch-manipulation"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border px-6">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
            { id: 'sessions', label: 'Sessions', icon: Brain },
            { id: 'budget', label: 'Budget', icon: Gauge },
            { id: 'patterns', label: 'Patterns', icon: TrendingUp },
            { id: 'settings', label: 'Settings', icon: Settings }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <ThinkingDashboard
              performance={performance}
              sessions={thinkingSessions}
              budget={budgetSettings}
              onRefresh={loadThinkingData}
            />
          )}

          {/* Sessions Tab */}
          {activeTab === 'sessions' && (
            <div className="flex-1 flex flex-col">
              <div className="p-6 border-b border-border">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Thinking Sessions</h3>
                  <Button onClick={() => setShowCreateSession(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    New Session
                  </Button>
                </div>
                
                <div className="flex items-center gap-4">
                  {/* Search */}
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search sessions..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  {/* Level Filter */}
                  <select
                    value={filterLevel}
                    onChange={(e) => setFilterLevel(e.target.value)}
                    className="p-2 border border-border rounded-md bg-background text-sm"
                  >
                    <option value="all">All Levels</option>
                    {Object.entries(THINKING_LEVELS).map(([key, value]) => (
                      <option key={key} value={value}>
                        {THINKING_LEVEL_CONFIG[value].name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <ScrollArea className="flex-1">
                <div className="p-6">
                  {filteredSessions.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Brain className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <h3 className="text-lg font-medium mb-2">No Thinking Sessions</h3>
                      <p>Create thinking sessions to analyze complex problems</p>
                      <Button 
                        className="mt-4"
                        onClick={() => setShowCreateSession(true)}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Create Your First Session
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredSessions.map(session => (
                        <ThinkingSessionCard
                          key={session.id}
                          session={session}
                          onView={() => setSelectedSession(session)}
                          onExecute={(level, prompt) => executeThinking(session.id, level, prompt)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Budget Tab */}
          {activeTab === 'budget' && (
            <BudgetManager
              budget={budgetSettings}
              performance={performance}
              onUpdate={updateBudgetSettings}
              onRefresh={loadThinkingData}
            />
          )}

          {/* Patterns Tab */}
          {activeTab === 'patterns' && (
            <PatternAnalysis
              patterns={patterns}
              sessions={thinkingSessions}
              onRefresh={loadThinkingData}
            />
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <ThinkingSettings
              autoMode={autoMode}
              onAutoModeChange={setAutoMode}
              onRefresh={loadThinkingData}
            />
          )}
        </div>

        {/* Create Session Modal */}
        {showCreateSession && (
          <CreateSessionModal
            onSave={createThinkingSession}
            onClose={() => setShowCreateSession(false)}
            onAnalyzeComplexity={analyzeComplexity}
          />
        )}

        {/* Session Details Modal */}
        {selectedSession && (
          <SessionDetailsModal
            session={selectedSession}
            onClose={() => setSelectedSession(null)}
            onExecute={(level, prompt) => executeThinking(selectedSession.id, level, prompt)}
          />
        )}
      </div>
    </div>
  );
}

// Thinking Dashboard Component
function ThinkingDashboard({ performance, sessions, budget, onRefresh }) {
  const totalSessions = sessions.length;
  const activeSessions = sessions.filter(s => s.status === 'active').length;
  const completedSessions = sessions.filter(s => s.status === 'completed').length;
  const budgetUsed = budget.used || 0;
  const budgetTotal = budget.total || 1000;

  return (
    <div className="flex-1 flex flex-col">
      <div className="p-6 border-b border-border">
        <h3 className="text-lg font-semibold mb-2">Thinking Dashboard</h3>
        <p className="text-sm text-muted-foreground">
          Monitor thinking performance and resource usage
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 border border-border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="w-4 h-4 text-blue-600" />
                <span className="font-medium">Total Sessions</span>
              </div>
              <div className="text-2xl font-bold">{totalSessions}</div>
            </div>
            <div className="p-4 border border-border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-4 h-4 text-green-600" />
                <span className="font-medium">Active</span>
              </div>
              <div className="text-2xl font-bold">{activeSessions}</div>
            </div>
            <div className="p-4 border border-border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-purple-600" />
                <span className="font-medium">Completed</span>
              </div>
              <div className="text-2xl font-bold">{completedSessions}</div>
            </div>
            <div className="p-4 border border-border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Gauge className="w-4 h-4 text-orange-600" />
                <span className="font-medium">Budget Used</span>
              </div>
              <div className="text-2xl font-bold">{Math.round((budgetUsed / budgetTotal) * 100)}%</div>
            </div>
          </div>

          {/* Thinking Levels Overview */}
          <div>
            <h4 className="font-medium mb-4">Thinking Levels</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(THINKING_LEVEL_CONFIG).map(([level, config]) => {
                const Icon = config.icon;
                const levelSessions = sessions.filter(s => s.level === level).length;
                
                return (
                  <div key={level} className="p-4 border border-border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className="w-4 h-4" />
                      <span className="font-medium">{config.name}</span>
                    </div>
                    <div className="text-sm text-muted-foreground mb-2">
                      {config.description}
                    </div>
                    <div className="text-lg font-bold">{levelSessions} sessions</div>
                    <div className="text-xs text-muted-foreground">
                      Budget: {config.budgetMultiplier}x | Timeout: {config.timeoutMs / 1000}s
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Sessions */}
          <div>
            <h4 className="font-medium mb-4">Recent Sessions</h4>
            <div className="space-y-3">
              {sessions.slice(0, 5).map(session => {
                const config = THINKING_LEVEL_CONFIG[session.level];
                const Icon = config?.icon || Brain;
                
                return (
                  <div key={session.id} className="p-3 border border-border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4" />
                        <span className="font-medium">{session.title}</span>
                      </div>
                      <Badge variant="outline" className={`text-xs ${config?.color || 'text-gray-600 bg-gray-100'}`}>
                        {config?.name || session.level}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {session.description}
                    </div>
                    <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                      <span>Duration: {session.duration || 0}ms</span>
                      <span>Status: {session.status}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

// Thinking Session Card Component
function ThinkingSessionCard({ session, onView, onExecute }) {
  const config = THINKING_LEVEL_CONFIG[session.level];
  const Icon = config?.icon || Brain;
  const [executing, setExecuting] = useState(false);

  const handleExecute = async () => {
    setExecuting(true);
    try {
      await onExecute(session.level, session.prompt);
    } catch (error) {
      console.error('Session execution failed:', error);
    }
    setExecuting(false);
  };

  return (
    <div className="p-4 border border-border rounded-lg hover:bg-muted/30 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h4 className="font-medium">{session.title}</h4>
            <Badge variant="outline" className={`text-xs ${config?.color || 'text-gray-600 bg-gray-100'}`}>
              {config?.name || session.level}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={onView}>
            <Eye className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
        {session.description}
      </p>
      
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs text-muted-foreground">
          Complexity: {session.complexity}
        </div>
        <div className="text-xs text-muted-foreground">
          Duration: {session.duration || 0}ms
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={handleExecute}
          disabled={executing}
          className="flex-1"
        >
          {executing ? (
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Play className="w-4 h-4 mr-2" />
          )}
          Execute
        </Button>
        
        <Badge variant="outline" className="text-xs">
          {session.status}
        </Badge>
      </div>
    </div>
  );
}

// Budget Manager Component
function BudgetManager({ budget, performance, onUpdate, onRefresh }) {
  const [budgetForm, setBudgetForm] = useState({
    total: budget.total || 1000,
    dailyLimit: budget.dailyLimit || 100,
    sessionLimit: budget.sessionLimit || 50,
    levelLimits: budget.levelLimits || {}
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onUpdate(budgetForm);
  };

  return (
    <div className="flex-1 flex flex-col">
      <div className="p-6 border-b border-border">
        <h3 className="text-lg font-semibold mb-2">Budget Management</h3>
        <p className="text-sm text-muted-foreground">
          Configure thinking budgets and resource limits
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* Budget Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border border-border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Gauge className="w-4 h-4 text-blue-600" />
                <span className="font-medium">Total Budget</span>
              </div>
              <div className="text-2xl font-bold">{budget.total || 0}</div>
              <div className="text-sm text-muted-foreground">
                Used: {budget.used || 0} ({Math.round(((budget.used || 0) / (budget.total || 1)) * 100)}%)
              </div>
            </div>
            <div className="p-4 border border-border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-green-600" />
                <span className="font-medium">Daily Limit</span>
              </div>
              <div className="text-2xl font-bold">{budget.dailyLimit || 0}</div>
              <div className="text-sm text-muted-foreground">
                Used today: {budget.dailyUsed || 0}
              </div>
            </div>
            <div className="p-4 border border-border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="w-4 h-4 text-purple-600" />
                <span className="font-medium">Per Session</span>
              </div>
              <div className="text-2xl font-bold">{budget.sessionLimit || 0}</div>
              <div className="text-sm text-muted-foreground">
                Max per thinking session
              </div>
            </div>
          </div>

          {/* Budget Configuration Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <h4 className="font-medium mb-4">Budget Settings</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Total Budget</label>
                  <Input
                    type="number"
                    value={budgetForm.total}
                    onChange={(e) => setBudgetForm(prev => ({ ...prev, total: parseInt(e.target.value) }))}
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Daily Limit</label>
                  <Input
                    type="number"
                    value={budgetForm.dailyLimit}
                    onChange={(e) => setBudgetForm(prev => ({ ...prev, dailyLimit: parseInt(e.target.value) }))}
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Session Limit</label>
                  <Input
                    type="number"
                    value={budgetForm.sessionLimit}
                    onChange={(e) => setBudgetForm(prev => ({ ...prev, sessionLimit: parseInt(e.target.value) }))}
                    min="0"
                  />
                </div>
              </div>
            </div>

            {/* Level-specific Limits */}
            <div>
              <h4 className="font-medium mb-4">Level-specific Limits</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(THINKING_LEVEL_CONFIG).map(([level, config]) => {
                  const Icon = config.icon;
                  return (
                    <div key={level} className="p-3 border border-border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className="w-4 h-4" />
                        <span className="font-medium">{config.name}</span>
                      </div>
                      <Input
                        type="number"
                        value={budgetForm.levelLimits[level] || config.budgetMultiplier * 10}
                        onChange={(e) => setBudgetForm(prev => ({
                          ...prev,
                          levelLimits: {
                            ...prev.levelLimits,
                            [level]: parseInt(e.target.value)
                          }
                        }))}
                        min="0"
                        placeholder={`${config.name} limit`}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit">
                <Save className="w-4 h-4 mr-2" />
                Save Budget Settings
              </Button>
            </div>
          </form>
        </div>
      </ScrollArea>
    </div>
  );
}

// Pattern Analysis Component
function PatternAnalysis({ patterns, sessions, onRefresh }) {
  return (
    <div className="flex-1 flex flex-col">
      <div className="p-6 border-b border-border">
        <h3 className="text-lg font-semibold mb-2">Pattern Analysis</h3>
        <p className="text-sm text-muted-foreground">
          Analyze thinking patterns and optimization opportunities
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {patterns.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <TrendingUp className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No Patterns Detected</h3>
              <p>Execute more thinking sessions to identify patterns</p>
            </div>
          ) : (
            <div className="space-y-4">
              {patterns.map((pattern, index) => (
                <div key={index} className="p-4 border border-border rounded-lg">
                  <h4 className="font-medium mb-2">{pattern.name}</h4>
                  <p className="text-sm text-muted-foreground mb-3">{pattern.description}</p>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Frequency:</span>
                      <div className="font-mono">{pattern.frequency}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Confidence:</span>
                      <div className="font-mono">{pattern.confidence}%</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// Thinking Settings Component
function ThinkingSettings({ autoMode, onAutoModeChange, onRefresh }) {
  return (
    <div className="flex-1 flex flex-col">
      <div className="p-6 border-b border-border">
        <h3 className="text-lg font-semibold mb-2">Thinking Settings</h3>
        <p className="text-sm text-muted-foreground">
          Configure thinking framework behavior and preferences
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          <div className="border border-border rounded-lg p-4">
            <h4 className="font-medium mb-2">Auto Mode</h4>
            <p className="text-sm text-muted-foreground mb-3">
              Automatically select thinking level based on task complexity
            </p>
            <label className="flex items-center gap-2">
              <input 
                type="checkbox" 
                checked={autoMode}
                onChange={(e) => onAutoModeChange(e.target.checked)}
              />
              <span className="text-sm">Enable automatic thinking level selection</span>
            </label>
          </div>

          <div className="border border-border rounded-lg p-4">
            <h4 className="font-medium mb-2">Performance Optimization</h4>
            <p className="text-sm text-muted-foreground mb-3">
              Optimize thinking performance based on historical data
            </p>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input type="checkbox" defaultChecked />
                <span className="text-sm">Enable pattern-based optimization</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" defaultChecked />
                <span className="text-sm">Cache frequent thinking patterns</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" />
                <span className="text-sm">Aggressive timeout optimization</span>
              </label>
            </div>
          </div>

          <div className="border border-border rounded-lg p-4">
            <h4 className="font-medium mb-2">Complexity Detection</h4>
            <p className="text-sm text-muted-foreground mb-3">
              Configure how task complexity is analyzed
            </p>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input type="checkbox" defaultChecked />
                <span className="text-sm">Keyword-based analysis</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" defaultChecked />
                <span className="text-sm">Context length analysis</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" />
                <span className="text-sm">Machine learning classification</span>
              </label>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

// Create Session Modal Component
function CreateSessionModal({ onSave, onClose, onAnalyzeComplexity }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    level: THINKING_LEVELS.THINK,
    prompt: '',
    complexity: COMPLEXITY_CATEGORIES.SIMPLE
  });
  const [analyzingComplexity, setAnalyzingComplexity] = useState(false);

  const handleAnalyzeComplexity = async () => {
    if (!formData.description) return;
    
    setAnalyzingComplexity(true);
    try {
      const complexity = await onAnalyzeComplexity(formData.description);
      if (complexity) {
        setFormData(prev => ({ 
          ...prev, 
          complexity: complexity.category,
          level: complexity.suggestedLevel 
        }));
      }
    } catch (error) {
      console.error('Complexity analysis failed:', error);
    }
    setAnalyzingComplexity(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-background border border-border rounded-lg shadow-xl w-full max-w-2xl m-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h3 className="text-lg font-semibold">Create Thinking Session</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Session Title</label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Thinking session title"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe the problem or task..."
              className="w-full p-2 border border-border rounded-md bg-background h-24 resize-none"
              required
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAnalyzeComplexity}
              disabled={analyzingComplexity || !formData.description}
              className="mt-2"
            >
              {analyzingComplexity ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Target className="w-4 h-4 mr-2" />
              )}
              Analyze Complexity
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Thinking Level</label>
              <select
                value={formData.level}
                onChange={(e) => setFormData(prev => ({ ...prev, level: e.target.value }))}
                className="w-full p-2 border border-border rounded-md bg-background"
              >
                {Object.entries(THINKING_LEVEL_CONFIG).map(([level, config]) => (
                  <option key={level} value={level}>
                    {config.name} - {config.description}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Complexity</label>
              <select
                value={formData.complexity}
                onChange={(e) => setFormData(prev => ({ ...prev, complexity: e.target.value }))}
                className="w-full p-2 border border-border rounded-md bg-background"
              >
                {Object.entries(COMPLEXITY_CATEGORIES).map(([key, value]) => (
                  <option key={key} value={value}>
                    {COMPLEXITY_INDICATORS[value].name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Initial Prompt</label>
            <textarea
              value={formData.prompt}
              onChange={(e) => setFormData(prev => ({ ...prev, prompt: e.target.value }))}
              placeholder="Initial thinking prompt..."
              className="w-full p-2 border border-border rounded-md bg-background h-20 resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Create Session</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Session Details Modal Component
function SessionDetailsModal({ session, onClose, onExecute }) {
  const config = THINKING_LEVEL_CONFIG[session.level];
  const Icon = config?.icon || Brain;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-background border border-border rounded-lg shadow-xl w-full max-w-4xl m-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <Icon className="w-6 h-6 text-primary" />
            <h3 className="text-lg font-semibold">{session.title}</h3>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <h4 className="font-medium mb-2">Description</h4>
            <p className="text-sm text-muted-foreground">{session.description}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <h4 className="font-medium mb-2">Thinking Level</h4>
              <Badge variant="outline" className={config?.color}>
                {config?.name || session.level}
              </Badge>
            </div>
            <div>
              <h4 className="font-medium mb-2">Complexity</h4>
              <p className="text-sm">{session.complexity}</p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Status</h4>
              <p className="text-sm">{session.status}</p>
            </div>
          </div>

          {session.result && (
            <div>
              <h4 className="font-medium mb-2">Result</h4>
              <div className="p-3 bg-muted/50 rounded-lg text-sm">
                <pre className="whitespace-pre-wrap">{JSON.stringify(session.result, null, 2)}</pre>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button onClick={() => onExecute(session.level, session.prompt)}>
              <Play className="w-4 h-4 mr-2" />
              Execute Again
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ThinkingFramework; 