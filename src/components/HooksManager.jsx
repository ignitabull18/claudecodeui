import React, { useState, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { 
  X, Plus, Play, Square as Stop, Settings, Zap, Clock, Target, Activity,
  FileText, GitBranch, Database, Terminal, Globe, Webhook, 
  ArrowRight, ArrowDown, ChevronRight, ChevronDown, MoreHorizontal,
  Edit3, Trash2, Copy, Eye, EyeOff, RefreshCw, Save, Code,
  AlertTriangle, CheckCircle, XCircle, Info, Search, Filter,
  Timer, Calendar, Hash, Tag, Layers, Box, Network, Link2,
  Bell, Mail, Slack, MessageSquare, Phone, Send, Upload,
  Download, FolderOpen, File, Image, Video, Archive, Lock,
  Unlock, Key, Shield, User, Users, Crown, Star, Heart,
  TrendingUp, BarChart3, PieChart, LineChart, Monitor, Cpu
} from 'lucide-react';

// Hook Categories
const HOOK_CATEGORIES = {
  FILE_SYSTEM: 'file-system',
  GIT: 'git',
  PROJECT: 'project',
  BUILD: 'build',
  DEPLOYMENT: 'deployment',
  COMMUNICATION: 'communication',
  MONITORING: 'monitoring',
  CUSTOM: 'custom'
};

// Hook Trigger Types
const HOOK_TRIGGERS = {
  FILE_CREATED: 'file-created',
  FILE_MODIFIED: 'file-modified',
  FILE_DELETED: 'file-deleted',
  GIT_COMMIT: 'git-commit',
  GIT_PUSH: 'git-push',
  GIT_PULL: 'git-pull',
  PROJECT_OPENED: 'project-opened',
  PROJECT_CLOSED: 'project-closed',
  BUILD_STARTED: 'build-started',
  BUILD_COMPLETED: 'build-completed',
  BUILD_FAILED: 'build-failed',
  DEPLOY_STARTED: 'deploy-started',
  DEPLOY_COMPLETED: 'deploy-completed',
  TEST_PASSED: 'test-passed',
  TEST_FAILED: 'test-failed',
  ERROR_OCCURRED: 'error-occurred',
  SCHEDULE: 'schedule',
  WEBHOOK: 'webhook',
  MANUAL: 'manual'
};

// Hook Action Types
const HOOK_ACTIONS = {
  RUN_COMMAND: 'run-command',
  SEND_NOTIFICATION: 'send-notification',
  SEND_EMAIL: 'send-email',
  SEND_SLACK: 'send-slack',
  MAKE_HTTP_REQUEST: 'make-http-request',
  CREATE_FILE: 'create-file',
  MODIFY_FILE: 'modify-file',
  RUN_SCRIPT: 'run-script',
  TRIGGER_BUILD: 'trigger-build',
  TRIGGER_DEPLOYMENT: 'trigger-deployment',
  UPDATE_DATABASE: 'update-database',
  GENERATE_REPORT: 'generate-report',
  BACKUP_DATA: 'backup-data',
  SEND_WEBHOOK: 'send-webhook'
};

// Hook Status
const HOOK_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  ERROR: 'error',
  RUNNING: 'running'
};

// Hook Templates
const HOOK_TEMPLATES = {
  auto_format: {
    name: 'Auto Format on Save',
    description: 'Automatically format code when files are saved',
    category: HOOK_CATEGORIES.FILE_SYSTEM,
    trigger: HOOK_TRIGGERS.FILE_MODIFIED,
    conditions: [{ field: 'extension', operator: 'in', value: ['.js', '.jsx', '.ts', '.tsx'] }],
    actions: [{ type: HOOK_ACTIONS.RUN_COMMAND, command: 'npx prettier --write {{file_path}}' }],
    icon: Code
  },
  git_commit_notify: {
    name: 'Git Commit Notification',
    description: 'Send notification when commits are made',
    category: HOOK_CATEGORIES.GIT,
    trigger: HOOK_TRIGGERS.GIT_COMMIT,
    actions: [{ type: HOOK_ACTIONS.SEND_NOTIFICATION, title: 'Git Commit', message: 'New commit: {{commit_message}}' }],
    icon: GitBranch
  },
  build_success_deploy: {
    name: 'Auto Deploy on Build Success',
    description: 'Automatically deploy when build succeeds',
    category: HOOK_CATEGORIES.BUILD,
    trigger: HOOK_TRIGGERS.BUILD_COMPLETED,
    conditions: [{ field: 'status', operator: 'equals', value: 'success' }],
    actions: [{ type: HOOK_ACTIONS.TRIGGER_DEPLOYMENT, environment: 'staging' }],
    icon: Upload
  },
  test_failure_slack: {
    name: 'Test Failure Alert',
    description: 'Send Slack message when tests fail',
    category: HOOK_CATEGORIES.COMMUNICATION,
    trigger: HOOK_TRIGGERS.TEST_FAILED,
    actions: [{ type: HOOK_ACTIONS.SEND_SLACK, channel: '#dev-alerts', message: 'Tests failed in {{project_name}}' }],
    icon: AlertTriangle
  },
  daily_backup: {
    name: 'Daily Data Backup',
    description: 'Backup project data daily at 2 AM',
    category: HOOK_CATEGORIES.MONITORING,
    trigger: HOOK_TRIGGERS.SCHEDULE,
    schedule: { type: 'daily', time: '02:00' },
    actions: [{ type: HOOK_ACTIONS.BACKUP_DATA, location: 'cloud-storage' }],
    icon: Archive
  },
  error_monitoring: {
    name: 'Error Monitoring',
    description: 'Log and report application errors',
    category: HOOK_CATEGORIES.MONITORING,
    trigger: HOOK_TRIGGERS.ERROR_OCCURRED,
    actions: [
      { type: HOOK_ACTIONS.UPDATE_DATABASE, table: 'error_logs', data: '{{error_data}}' },
      { type: HOOK_ACTIONS.SEND_EMAIL, to: 'admin@company.com', subject: 'Application Error' }
    ],
    icon: Shield
  }
};

function HooksManager({ isOpen, onClose, selectedProject, currentSession }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [hooks, setHooks] = useState([]);
  const [hookExecutions, setHookExecutions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedHook, setSelectedHook] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showExecutionLogs, setShowExecutionLogs] = useState(false);
  const [executionLogs, setExecutionLogs] = useState([]);

  // Load hooks data
  const loadHooks = useCallback(async () => {
    if (!selectedProject) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/hooks/${selectedProject.name}/list`);
      const data = await response.json();
      
      if (data.success) {
        setHooks(data.hooks || []);
      }
    } catch (error) {
      console.error('Failed to load hooks:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedProject]);

  // Load hook executions
  const loadHookExecutions = useCallback(async () => {
    if (!selectedProject) return;
    
    try {
      const response = await fetch(`/api/hooks/${selectedProject.name}/executions`);
      const data = await response.json();
      
      if (data.success) {
        setHookExecutions(data.executions || []);
      }
    } catch (error) {
      console.error('Failed to load hook executions:', error);
    }
  }, [selectedProject]);

  useEffect(() => {
    if (isOpen && selectedProject) {
      loadHooks();
      loadHookExecutions();
    }
  }, [isOpen, selectedProject, loadHooks, loadHookExecutions]);

  // Filter hooks
  const filteredHooks = hooks.filter(hook => {
    const matchesSearch = hook.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         hook.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || hook.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Toggle hook status
  const toggleHookStatus = async (hookId, currentStatus) => {
    try {
      const newStatus = currentStatus === HOOK_STATUS.ACTIVE ? HOOK_STATUS.INACTIVE : HOOK_STATUS.ACTIVE;
      const response = await fetch(`/api/hooks/${selectedProject.name}/${hookId}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (response.ok) {
        await loadHooks();
      }
    } catch (error) {
      console.error('Failed to toggle hook status:', error);
    }
  };

  // Execute hook manually
  const executeHook = async (hookId) => {
    try {
      const response = await fetch(`/api/hooks/${selectedProject.name}/${hookId}/execute`, {
        method: 'POST'
      });
      
      if (response.ok) {
        await loadHookExecutions();
      }
    } catch (error) {
      console.error('Failed to execute hook:', error);
    }
  };

  // Delete hook
  const deleteHook = async (hookId) => {
    if (!confirm('Are you sure you want to delete this hook?')) return;
    
    try {
      const response = await fetch(`/api/hooks/${selectedProject.name}/${hookId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        await loadHooks();
        setSelectedHook(null);
      }
    } catch (error) {
      console.error('Failed to delete hook:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-2xl shadow-2xl border max-w-7xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-orange-600 via-red-600 to-pink-600 p-6 rounded-t-2xl">
          <div className="absolute inset-0 bg-black/10 rounded-t-2xl"></div>
          <div className="relative flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                <Zap className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Hooks Manager</h2>
                <p className="text-white/80 text-sm">Automation & Event-Driven Workflows</p>
              </div>
              <Badge className="bg-white/20 border-white/30 text-white backdrop-blur-sm">
                {selectedProject?.name || 'No Project'}
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="hover:bg-white/20 rounded-xl transition-all duration-200 hover:scale-105 text-white/80 hover:text-white"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b bg-gray-50 dark:bg-gray-800/50 px-6">
          <div className="flex gap-1">
            {[
              { id: 'overview', label: 'Overview', icon: Activity },
              { id: 'hooks', label: 'Hooks', icon: Zap },
              { id: 'executions', label: 'Executions', icon: Clock },
              { id: 'templates', label: 'Templates', icon: Layers },
              { id: 'monitoring', label: 'Monitoring', icon: Monitor }
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative px-5 py-4 text-sm font-semibold transition-all duration-200 group ${
                    activeTab === tab.id
                      ? 'text-orange-600 dark:text-orange-400'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 transition-transform duration-200 ${
                      activeTab === tab.id ? 'scale-110' : 'group-hover:scale-105'
                    }`} />
                    {tab.label}
                  </div>
                  <div className={`absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-orange-500 to-red-500 transition-all duration-200 ${
                    activeTab === tab.id ? 'w-full opacity-100' : 'w-0 opacity-0 group-hover:w-full group-hover:opacity-50'
                  }`} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-8 bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
              {activeTab === 'overview' && (
                <HooksOverview 
                  hooks={hooks} 
                  executions={hookExecutions}
                  loading={loading}
                />
              )}
              
              {activeTab === 'hooks' && (
                <HooksManagement
                  hooks={filteredHooks}
                  searchTerm={searchTerm}
                  setSearchTerm={setSearchTerm}
                  selectedCategory={selectedCategory}
                  setSelectedCategory={setSelectedCategory}
                  onToggleStatus={toggleHookStatus}
                  onExecute={executeHook}
                  onDelete={deleteHook}
                  onEdit={setSelectedHook}
                  onCreateNew={() => setShowCreateModal(true)}
                  loading={loading}
                />
              )}
              
              {activeTab === 'executions' && (
                <ExecutionHistory
                  executions={hookExecutions}
                  onViewLogs={(execution) => {
                    setExecutionLogs(execution.logs || []);
                    setShowExecutionLogs(true);
                  }}
                />
              )}
              
              {activeTab === 'templates' && (
                <HookTemplates
                  templates={HOOK_TEMPLATES}
                  onUseTemplate={(template) => {
                    setSelectedHook(template);
                    setShowCreateModal(true);
                  }}
                />
              )}
              
              {activeTab === 'monitoring' && (
                <HooksMonitoring
                  hooks={hooks}
                  executions={hookExecutions}
                />
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Modals */}
        {showCreateModal && (
          <CreateHookModal
            initialData={selectedHook}
            templates={HOOK_TEMPLATES}
            projectName={selectedProject?.name}
            onSave={async () => {
              setShowCreateModal(false);
              setSelectedHook(null);
              await loadHooks();
            }}
            onClose={() => {
              setShowCreateModal(false);
              setSelectedHook(null);
            }}
          />
        )}

        {showExecutionLogs && (
          <ExecutionLogsModal
            logs={executionLogs}
            onClose={() => setShowExecutionLogs(false)}
          />
        )}
      </div>
    </div>
  );
}

// Hooks Overview Component
function HooksOverview({ hooks, executions, loading }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex items-center gap-3 text-muted-foreground">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>Loading hooks data...</span>
        </div>
      </div>
    );
  }

  const activeHooks = hooks.filter(h => h.status === HOOK_STATUS.ACTIVE);
  const recentExecutions = executions.slice(0, 5);
  const successRate = executions.length > 0 
    ? Math.round((executions.filter(e => e.status === 'success').length / executions.length) * 100)
    : 0;

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="group relative overflow-hidden bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-2xl p-6 border border-blue-200 dark:border-blue-800 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-500 text-white rounded-xl shadow-lg">
              <Zap className="w-5 h-5" />
            </div>
            <span className="font-semibold text-blue-700 dark:text-blue-300">Total Hooks</span>
          </div>
          <div className="text-3xl font-bold text-blue-800 dark:text-blue-200">{hooks.length}</div>
          <div className="text-sm text-blue-600 dark:text-blue-400 mt-1">
            {activeHooks.length} active
          </div>
        </div>

        <div className="group relative overflow-hidden bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-2xl p-6 border border-green-200 dark:border-green-800 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-green-500 text-white rounded-xl shadow-lg">
              <Activity className="w-5 h-5" />
            </div>
            <span className="font-semibold text-green-700 dark:text-green-300">Executions</span>
          </div>
          <div className="text-3xl font-bold text-green-800 dark:text-green-200">{executions.length}</div>
          <div className="text-sm text-green-600 dark:text-green-400 mt-1">
            {recentExecutions.length} recent
          </div>
        </div>

        <div className="group relative overflow-hidden bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-2xl p-6 border border-purple-200 dark:border-purple-800 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-purple-500 text-white rounded-xl shadow-lg">
              <Target className="w-5 h-5" />
            </div>
            <span className="font-semibold text-purple-700 dark:text-purple-300">Success Rate</span>
          </div>
          <div className="text-3xl font-bold text-purple-800 dark:text-purple-200">{successRate}%</div>
          <div className="text-sm text-purple-600 dark:text-purple-400 mt-1">
            Last 30 days
          </div>
        </div>

        <div className="group relative overflow-hidden bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-2xl p-6 border border-orange-200 dark:border-orange-800 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-orange-500 text-white rounded-xl shadow-lg">
              <Clock className="w-5 h-5" />
            </div>
            <span className="font-semibold text-orange-700 dark:text-orange-300">Categories</span>
          </div>
          <div className="text-3xl font-bold text-orange-800 dark:text-orange-200">
            {new Set(hooks.map(h => h.category)).size}
          </div>
          <div className="text-sm text-orange-600 dark:text-orange-400 mt-1">
            Active types
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 px-6 py-4 border-b">
          <h3 className="font-semibold text-gray-800 dark:text-gray-200">Recent Hook Executions</h3>
        </div>
        <div className="p-6">
          {recentExecutions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No recent executions found
            </div>
          ) : (
            <div className="space-y-3">
              {recentExecutions.map((execution, index) => (
                <div key={index} className="flex items-center justify-between p-3 border border-border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      execution.status === 'success' ? 'bg-green-500' : 
                      execution.status === 'error' ? 'bg-red-500' : 'bg-yellow-500'
                    }`} />
                    <span className="font-medium">{execution.hookName}</span>
                    <Badge variant="outline" className="text-xs">
                      {execution.trigger}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(execution.timestamp).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Hooks Management Component
function HooksManagement({ 
  hooks, searchTerm, setSearchTerm, selectedCategory, setSelectedCategory,
  onToggleStatus, onExecute, onDelete, onEdit, onCreateNew, loading 
}) {
  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search hooks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-border rounded-lg bg-background text-foreground"
          >
            <option value="all">All Categories</option>
            {Object.entries(HOOK_CATEGORIES).map(([key, value]) => (
              <option key={key} value={value}>
                {key.replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>
        <Button onClick={onCreateNew} className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white">
          <Plus className="w-4 h-4 mr-2" />
          Create Hook
        </Button>
      </div>

      {/* Hooks List */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 px-6 py-4 border-b">
          <h3 className="font-semibold text-gray-800 dark:text-gray-200">
            Hooks ({hooks.length})
          </h3>
        </div>
        <div className="divide-y divide-border">
          {loading ? (
            <div className="p-8 text-center">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-muted-foreground" />
              <p className="text-muted-foreground">Loading hooks...</p>
            </div>
          ) : hooks.length === 0 ? (
            <div className="p-8 text-center">
              <Zap className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No hooks found</h3>
              <p className="text-muted-foreground mb-4">Create your first automation hook to get started</p>
              <Button onClick={onCreateNew} variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Create Hook
              </Button>
            </div>
          ) : (
            hooks.map((hook) => (
              <HookListItem
                key={hook.id}
                hook={hook}
                onToggleStatus={onToggleStatus}
                onExecute={onExecute}
                onDelete={onDelete}
                onEdit={onEdit}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// Hook List Item Component
function HookListItem({ hook, onToggleStatus, onExecute, onDelete, onEdit }) {
  const getStatusColor = (status) => {
    switch (status) {
      case HOOK_STATUS.ACTIVE: return 'bg-green-100 text-green-800 border-green-200';
      case HOOK_STATUS.INACTIVE: return 'bg-gray-100 text-gray-800 border-gray-200';
      case HOOK_STATUS.ERROR: return 'bg-red-100 text-red-800 border-red-200';
      case HOOK_STATUS.RUNNING: return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case HOOK_CATEGORIES.FILE_SYSTEM: return FileText;
      case HOOK_CATEGORIES.GIT: return GitBranch;
      case HOOK_CATEGORIES.PROJECT: return FolderOpen;
      case HOOK_CATEGORIES.BUILD: return Code;
      case HOOK_CATEGORIES.DEPLOYMENT: return Upload;
      case HOOK_CATEGORIES.COMMUNICATION: return MessageSquare;
      case HOOK_CATEGORIES.MONITORING: return Monitor;
      default: return Zap;
    }
  };

  const CategoryIcon = getCategoryIcon(hook.category);

  return (
    <div className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
            <CategoryIcon className="w-5 h-5 text-orange-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h4 className="font-medium text-foreground truncate">{hook.name}</h4>
              <Badge className={`text-xs ${getStatusColor(hook.status)}`}>
                {hook.status}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {hook.trigger}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground truncate">{hook.description}</p>
            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
              <span>Last run: {hook.lastRun ? new Date(hook.lastRun).toLocaleString() : 'Never'}</span>
              <span>Executions: {hook.executionCount || 0}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onToggleStatus(hook.id, hook.status)}
            className="h-8 w-8 p-0"
          >
            {hook.status === HOOK_STATUS.ACTIVE ? (
              <Stop className="w-4 h-4 text-red-600" />
            ) : (
              <Play className="w-4 h-4 text-green-600" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onExecute(hook.id)}
            className="h-8 w-8 p-0"
          >
            <Zap className="w-4 h-4 text-blue-600" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(hook)}
            className="h-8 w-8 p-0"
          >
            <Edit3 className="w-4 h-4 text-gray-600" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(hook.id)}
            className="h-8 w-8 p-0"
          >
            <Trash2 className="w-4 h-4 text-red-600" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// Execution History Component
function ExecutionHistory({ executions, onViewLogs }) {
  if (executions.length === 0) {
    return (
      <div className="text-center py-16">
        <Clock className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-medium mb-2">No executions yet</h3>
        <p className="text-muted-foreground">Hook executions will appear here once they start running</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border shadow-lg overflow-hidden">
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 px-6 py-4 border-b">
        <h3 className="font-semibold text-gray-800 dark:text-gray-200">
          Execution History ({executions.length})
        </h3>
      </div>
      <div className="divide-y divide-border max-h-96 overflow-y-auto">
        {executions.map((execution, index) => (
          <div key={index} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${
                  execution.status === 'success' ? 'bg-green-500' : 
                  execution.status === 'error' ? 'bg-red-500' : 
                  execution.status === 'running' ? 'bg-blue-500 animate-pulse' : 'bg-yellow-500'
                }`} />
                <div>
                  <div className="font-medium">{execution.hookName}</div>
                  <div className="text-sm text-muted-foreground">
                    Triggered by: {execution.trigger}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-muted-foreground">
                  {new Date(execution.timestamp).toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">
                  Duration: {execution.duration || 'N/A'}
                </div>
                {execution.logs && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onViewLogs(execution)}
                    className="text-xs mt-1"
                  >
                    View Logs
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Hook Templates Component
function HookTemplates({ templates, onUseTemplate }) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Hook Templates</h3>
        <p className="text-muted-foreground">Pre-built automation workflows to get you started quickly</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.entries(templates).map(([key, template]) => {
          const Icon = template.icon;
          return (
            <div key={key} className="bg-white dark:bg-gray-800 rounded-xl border shadow-sm hover:shadow-md transition-shadow p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                  <Icon className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <h4 className="font-medium">{template.name}</h4>
                  <Badge variant="outline" className="text-xs mt-1">
                    {template.category}
                  </Badge>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-4">{template.description}</p>
              <div className="space-y-2 mb-4">
                <div className="text-xs">
                  <span className="font-medium">Trigger:</span> {template.trigger}
                </div>
                <div className="text-xs">
                  <span className="font-medium">Actions:</span> {template.actions.length}
                </div>
              </div>
              <Button 
                onClick={() => onUseTemplate(template)}
                variant="outline" 
                className="w-full"
              >
                Use Template
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Hooks Monitoring Component
function HooksMonitoring({ hooks, executions }) {
  const activeHooks = hooks.filter(h => h.status === HOOK_STATUS.ACTIVE);
  const errorHooks = hooks.filter(h => h.status === HOOK_STATUS.ERROR);
  const recentErrors = executions.filter(e => e.status === 'error').slice(0, 5);

  return (
    <div className="space-y-8">
      {/* System Health */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border shadow-lg p-6">
        <h3 className="font-semibold mb-4 text-gray-800 dark:text-gray-200">System Health</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">{activeHooks.length}</div>
            <div className="text-sm text-muted-foreground">Active Hooks</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-red-600 mb-2">{errorHooks.length}</div>
            <div className="text-sm text-muted-foreground">Error Hooks</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">
              {executions.length > 0 ? Math.round((executions.filter(e => e.status === 'success').length / executions.length) * 100) : 0}%
            </div>
            <div className="text-sm text-muted-foreground">Success Rate</div>
          </div>
        </div>
      </div>

      {/* Recent Errors */}
      {recentErrors.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border shadow-lg overflow-hidden">
          <div className="bg-red-50 dark:bg-red-900/20 px-6 py-4 border-b border-red-200 dark:border-red-800">
            <h3 className="font-semibold text-red-800 dark:text-red-200">Recent Errors</h3>
          </div>
          <div className="divide-y divide-border">
            {recentErrors.map((error, index) => (
              <div key={index} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-red-600">{error.hookName}</div>
                    <div className="text-sm text-muted-foreground">{error.error}</div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(error.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Create Hook Modal Component (simplified - full implementation would be much larger)
function CreateHookModal({ initialData, projectName, onSave, onClose }) {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    description: initialData?.description || '',
    category: initialData?.category || HOOK_CATEGORIES.CUSTOM,
    trigger: initialData?.trigger || HOOK_TRIGGERS.MANUAL,
    actions: initialData?.actions || [],
    conditions: initialData?.conditions || [],
    enabled: true
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const response = await fetch(`/api/hooks/${projectName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        onSave();
      }
    } catch (error) {
      console.error('Failed to create hook:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold">
            {initialData ? 'Edit Hook' : 'Create New Hook'}
          </h3>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Name</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <Input
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background"
              >
                {Object.entries(HOOK_CATEGORIES).map(([key, value]) => (
                  <option key={key} value={value}>{key.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Trigger</label>
              <select
                value={formData.trigger}
                onChange={(e) => setFormData(prev => ({ ...prev, trigger: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background"
              >
                {Object.entries(HOOK_TRIGGERS).map(([key, value]) => (
                  <option key={key} value={value}>{key.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1">
              {initialData ? 'Update Hook' : 'Create Hook'}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Execution Logs Modal Component
function ExecutionLogsModal({ logs, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-xl shadow-xl max-w-4xl w-full max-h-[80vh] flex flex-col">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="text-lg font-semibold">Execution Logs</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        <ScrollArea className="flex-1 p-4">
          <pre className="text-sm font-mono bg-gray-50 dark:bg-gray-900 p-4 rounded whitespace-pre-wrap">
            {logs.join('\n') || 'No logs available'}
          </pre>
        </ScrollArea>
      </div>
    </div>
  );
}

export default HooksManager; 