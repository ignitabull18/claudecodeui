import React, { useState, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { 
  X, Plus, Edit3, Trash2, Save, Copy, Play, Settings, Terminal, 
  Search, Filter, Hash, Zap, Globe, User, Folder, Code, FileText,
  Clock, MoreHorizontal, ChevronDown, ChevronRight, Star, Heart,
  Target, Layers, Box, Puzzle, Sparkles, Zap as Lightning, Command,
  ArrowRight, CheckCircle, AlertTriangle, Info, RefreshCw
} from 'lucide-react';

// Command Categories
const COMMAND_CATEGORIES = {
  BUILT_IN: 'built-in',
  PROJECT: 'project',
  CUSTOM: 'custom',
  TEMPLATES: 'templates',
  SYSTEM: 'system'
};

// Built-in Commands Registry
const BUILT_IN_COMMANDS = {
  init: {
    name: 'init',
    description: 'Initialize new project or setup',
    category: COMMAND_CATEGORIES.BUILT_IN,
    parameters: [
      { name: 'type', type: 'string', description: 'Project type (react, node, python, etc.)', required: true },
      { name: 'name', type: 'string', description: 'Project name', required: false }
    ],
    template: '/init ${type} ${name}',
    action: 'INIT_PROJECT',
    icon: Sparkles,
    usage: '/init react my-app',
    examples: ['/init react todo-app', '/init python data-analysis', '/init node api-server']
  },
  clear: {
    name: 'clear',
    description: 'Clear chat history and context',
    category: COMMAND_CATEGORIES.BUILT_IN,
    parameters: [
      { name: 'scope', type: 'select', options: ['session', 'project', 'all'], description: 'What to clear', required: false }
    ],
    template: '/clear ${scope}',
    action: 'CLEAR_CONTEXT',
    icon: RefreshCw,
    usage: '/clear session',
    examples: ['/clear', '/clear session', '/clear project']
  },
  permissions: {
    name: 'permissions',
    description: 'Manage tool and MCP permissions',
    category: COMMAND_CATEGORIES.BUILT_IN,
    parameters: [
      { name: 'action', type: 'select', options: ['list', 'grant', 'revoke'], description: 'Permission action', required: true },
      { name: 'tool', type: 'string', description: 'Tool name', required: false }
    ],
    template: '/permissions ${action} ${tool}',
    action: 'MANAGE_PERMISSIONS',
    icon: Settings,
    usage: '/permissions list',
    examples: ['/permissions list', '/permissions grant web_search', '/permissions revoke filesystem']
  },
  memory: {
    name: 'memory',
    description: 'Manage CLAUDE.md memory entries',
    category: COMMAND_CATEGORIES.BUILT_IN,
    parameters: [
      { name: 'action', type: 'select', options: ['list', 'add', 'update', 'delete'], description: 'Memory action', required: true },
      { name: 'scope', type: 'select', options: ['global', 'project', 'session'], description: 'Memory scope', required: false }
    ],
    template: '/memory ${action} ${scope}',
    action: 'MANAGE_MEMORY',
    icon: FileText,
    usage: '/memory list project',
    examples: ['/memory list', '/memory add global', '/memory update project']
  },
  analyze: {
    name: 'analyze',
    description: 'Analyze codebase or specific files',
    category: COMMAND_CATEGORIES.BUILT_IN,
    parameters: [
      { name: 'target', type: 'string', description: 'File path or "codebase"', required: true },
      { name: 'type', type: 'select', options: ['complexity', 'dependencies', 'security', 'performance'], description: 'Analysis type', required: false }
    ],
    template: '/analyze ${target} ${type}',
    action: 'ANALYZE_CODE',
    icon: Target,
    usage: '/analyze src/components complexity',
    examples: ['/analyze codebase', '/analyze src/App.js security', '/analyze . dependencies']
  },
  refactor: {
    name: 'refactor',
    description: 'Refactor code with specific patterns',
    category: COMMAND_CATEGORIES.BUILT_IN,
    parameters: [
      { name: 'target', type: 'string', description: 'File or directory path', required: true },
      { name: 'pattern', type: 'string', description: 'Refactoring pattern', required: true }
    ],
    template: '/refactor ${target} ${pattern}',
    action: 'REFACTOR_CODE',
    icon: Code,
    usage: '/refactor src/utils extract-functions',
    examples: ['/refactor src/App.js hooks-to-functions', '/refactor . remove-unused-imports']
  },
  test: {
    name: 'test',
    description: 'Run tests or generate test files',
    category: COMMAND_CATEGORIES.BUILT_IN,
    parameters: [
      { name: 'action', type: 'select', options: ['run', 'generate', 'coverage'], description: 'Test action', required: true },
      { name: 'target', type: 'string', description: 'File or test name', required: false }
    ],
    template: '/test ${action} ${target}',
    action: 'RUN_TESTS',
    icon: CheckCircle,
    usage: '/test run src/components',
    examples: ['/test run', '/test generate src/utils.js', '/test coverage']
  },
  docs: {
    name: 'docs',
    description: 'Generate or update documentation',
    category: COMMAND_CATEGORIES.BUILT_IN,
    parameters: [
      { name: 'target', type: 'string', description: 'File or directory', required: true },
      { name: 'format', type: 'select', options: ['md', 'jsdoc', 'readme'], description: 'Documentation format', required: false }
    ],
    template: '/docs ${target} ${format}',
    action: 'GENERATE_DOCS',
    icon: FileText,
    usage: '/docs src/components md',
    examples: ['/docs . readme', '/docs src/utils.js jsdoc', '/docs components md']
  }
};

// Parameter Types
const PARAMETER_TYPES = {
  STRING: 'string',
  NUMBER: 'number',
  BOOLEAN: 'boolean',
  SELECT: 'select',
  FILE: 'file',
  DIRECTORY: 'directory'
};

function SlashCommandsManager({ isOpen, onClose, selectedProject, currentSession }) {
  const [activeTab, setActiveTab] = useState('commands');
  const [commands, setCommands] = useState({});
  const [customCommands, setCustomCommands] = useState({});
  const [commandHistory, setCommandHistory] = useState([]);
  const [templates, setTemplates] = useState({});
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [selectedCommand, setSelectedCommand] = useState(null);
  const [showCommandEditor, setShowCommandEditor] = useState(false);
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const [editingCommand, setEditingCommand] = useState(null);

  // Load slash commands data
  const loadCommandsData = useCallback(async () => {
    setLoading(true);
    try {
      const [commandsRes, historyRes, templatesRes] = await Promise.all([
        fetch('/api/slash-commands/commands'),
        fetch('/api/slash-commands/history'),
        fetch('/api/slash-commands/templates')
      ]);

      if (commandsRes.ok) {
        const commandsData = await commandsRes.json();
        setCommands({ ...BUILT_IN_COMMANDS, ...commandsData.commands });
        setCustomCommands(commandsData.commands || {});
      }

      if (historyRes.ok) {
        const historyData = await historyRes.json();
        setCommandHistory(historyData.history || []);
      }

      if (templatesRes.ok) {
        const templatesData = await templatesRes.json();
        setTemplates(templatesData.templates || {});
      }
    } catch (error) {
      console.error('Failed to load commands data:', error);
    }
    setLoading(false);
  }, []);

  // Create new command
  const createCommand = async (commandData) => {
    try {
      const response = await fetch('/api/slash-commands/commands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...commandData,
          projectId: selectedProject?.id,
          sessionId: currentSession?.id
        })
      });

      if (response.ok) {
        await loadCommandsData();
        setShowCommandEditor(false);
        setEditingCommand(null);
      }
    } catch (error) {
      console.error('Failed to create command:', error);
    }
  };

  // Update existing command
  const updateCommand = async (commandId, commandData) => {
    try {
      const response = await fetch(`/api/slash-commands/commands/${commandId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(commandData)
      });

      if (response.ok) {
        await loadCommandsData();
        setShowCommandEditor(false);
        setEditingCommand(null);
      }
    } catch (error) {
      console.error('Failed to update command:', error);
    }
  };

  // Delete command
  const deleteCommand = async (commandId) => {
    try {
      const response = await fetch(`/api/slash-commands/commands/${commandId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await loadCommandsData();
      }
    } catch (error) {
      console.error('Failed to delete command:', error);
    }
  };

  // Execute command
  const executeCommand = async (commandName, parameters = {}) => {
    try {
      const response = await fetch('/api/slash-commands/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: commandName,
          parameters,
          projectId: selectedProject?.id,
          sessionId: currentSession?.id
        })
      });

      if (response.ok) {
        const result = await response.json();
        await loadCommandsData(); // Refresh history
        return result;
      }
    } catch (error) {
      console.error('Failed to execute command:', error);
      throw error;
    }
  };

  // Create template
  const createTemplate = async (templateData) => {
    try {
      const response = await fetch('/api/slash-commands/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...templateData,
          projectId: selectedProject?.id
        })
      });

      if (response.ok) {
        await loadCommandsData();
        setShowTemplateEditor(false);
      }
    } catch (error) {
      console.error('Failed to create template:', error);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadCommandsData();
    }
  }, [isOpen, loadCommandsData]);

  // Filter commands based on search and category
  const filteredCommands = Object.entries(commands).filter(([name, command]) => {
    const matchesSearch = searchQuery === '' || 
      name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      command.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = filterCategory === 'all' || command.category === filterCategory;
    
    return matchesSearch && matchesCategory;
  });

  const getCategoryIcon = (category) => {
    switch (category) {
      case COMMAND_CATEGORIES.BUILT_IN: return Lightning;
      case COMMAND_CATEGORIES.PROJECT: return Folder;
      case COMMAND_CATEGORIES.CUSTOM: return User;
      case COMMAND_CATEGORIES.TEMPLATES: return Layers;
      case COMMAND_CATEGORIES.SYSTEM: return Settings;
      default: return Command;
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case COMMAND_CATEGORIES.BUILT_IN: return 'text-blue-600 bg-blue-100';
      case COMMAND_CATEGORIES.PROJECT: return 'text-green-600 bg-green-100';
      case COMMAND_CATEGORIES.CUSTOM: return 'text-purple-600 bg-purple-100';
      case COMMAND_CATEGORIES.TEMPLATES: return 'text-orange-600 bg-orange-100';
      case COMMAND_CATEGORIES.SYSTEM: return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop fixed inset-0 flex items-center justify-center z-[100] md:p-4 bg-background/95">
      <div className="bg-background border border-border md:rounded-lg shadow-xl w-full md:max-w-7xl h-full md:h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <Terminal className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
            <div>
              <h2 className="text-lg md:text-xl font-semibold text-foreground">
                Slash Commands
              </h2>
              <p className="text-sm text-muted-foreground">
                Create and manage custom slash commands for quick actions
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadCommandsData}
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
            { id: 'commands', label: 'Commands', icon: Terminal },
            { id: 'templates', label: 'Templates', icon: Layers },
            { id: 'history', label: 'History', icon: Clock },
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
          {/* Commands Tab */}
          {activeTab === 'commands' && (
            <div className="flex-1 flex flex-col">
              <div className="p-6 border-b border-border">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Slash Commands</h3>
                  <Button onClick={() => setShowCommandEditor(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    New Command
                  </Button>
                </div>
                
                <div className="flex items-center gap-4">
                  {/* Search */}
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search commands..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  {/* Category Filter */}
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="p-2 border border-border rounded-md bg-background text-sm"
                  >
                    <option value="all">All Categories</option>
                    {Object.entries(COMMAND_CATEGORIES).map(([key, value]) => (
                      <option key={key} value={value}>
                        {key.charAt(0) + key.slice(1).toLowerCase().replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <ScrollArea className="flex-1">
                <div className="p-6">
                  {filteredCommands.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Terminal className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <h3 className="text-lg font-medium mb-2">No Commands Found</h3>
                      <p>Create custom slash commands to automate your workflow</p>
                      <Button 
                        className="mt-4"
                        onClick={() => setShowCommandEditor(true)}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Create Your First Command
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredCommands.map(([name, command]) => (
                        <CommandCard
                          key={name}
                          name={name}
                          command={command}
                          onExecute={(params) => executeCommand(name, params)}
                          onEdit={() => {
                            setEditingCommand({ name, ...command });
                            setShowCommandEditor(true);
                          }}
                          onDelete={() => deleteCommand(name)}
                          onView={() => setSelectedCommand({ name, ...command })}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Templates Tab */}
          {activeTab === 'templates' && (
            <TemplatesManager
              templates={templates}
              onCreate={createTemplate}
              onRefresh={loadCommandsData}
            />
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <CommandHistory
              history={commandHistory}
              onExecute={executeCommand}
              onRefresh={loadCommandsData}
            />
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <CommandSettings
              selectedProject={selectedProject}
              onRefresh={loadCommandsData}
            />
          )}
        </div>

        {/* Command Editor Modal */}
        {showCommandEditor && (
          <CommandEditor
            command={editingCommand}
            onSave={(commandData) => {
              if (editingCommand) {
                updateCommand(editingCommand.name, commandData);
              } else {
                createCommand(commandData);
              }
            }}
            onClose={() => {
              setShowCommandEditor(false);
              setEditingCommand(null);
            }}
          />
        )}

        {/* Template Editor Modal */}
        {showTemplateEditor && (
          <TemplateEditor
            onSave={createTemplate}
            onClose={() => setShowTemplateEditor(false)}
          />
        )}

        {/* Command Details Modal */}
        {selectedCommand && (
          <CommandDetailsModal
            command={selectedCommand}
            onClose={() => setSelectedCommand(null)}
            onExecute={(params) => executeCommand(selectedCommand.name, params)}
          />
        )}
      </div>
    </div>
  );
}

// Command Card Component
function CommandCard({ name, command, onExecute, onEdit, onDelete, onView }) {
  const [executing, setExecuting] = useState(false);
  const Icon = command.icon || Command;
  const CategoryIcon = getCategoryIcon(command.category);
  
  const handleExecute = async () => {
    setExecuting(true);
    try {
      await onExecute({});
    } catch (error) {
      console.error('Command execution failed:', error);
    }
    setExecuting(false);
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case COMMAND_CATEGORIES.BUILT_IN: return Lightning;
      case COMMAND_CATEGORIES.PROJECT: return Folder;
      case COMMAND_CATEGORIES.CUSTOM: return User;
      case COMMAND_CATEGORIES.TEMPLATES: return Layers;
      case COMMAND_CATEGORIES.SYSTEM: return Settings;
      default: return Command;
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case COMMAND_CATEGORIES.BUILT_IN: return 'text-blue-600 bg-blue-100';
      case COMMAND_CATEGORIES.PROJECT: return 'text-green-600 bg-green-100';
      case COMMAND_CATEGORIES.CUSTOM: return 'text-purple-600 bg-purple-100';
      case COMMAND_CATEGORIES.TEMPLATES: return 'text-orange-600 bg-orange-100';
      case COMMAND_CATEGORIES.SYSTEM: return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="p-4 border border-border rounded-lg hover:bg-muted/30 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h4 className="font-medium">/{name}</h4>
            <Badge variant="outline" className={`text-xs ${getCategoryColor(command.category)}`}>
              <CategoryIcon className="w-3 h-3 mr-1" />
              {command.category}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={onView}>
            <Settings className="w-4 h-4" />
          </Button>
          {command.category !== COMMAND_CATEGORIES.BUILT_IN && (
            <>
              <Button variant="ghost" size="sm" onClick={onEdit}>
                <Edit3 className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={onDelete} className="text-red-600">
                <Trash2 className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </div>
      
      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
        {command.description}
      </p>
      
      <div className="text-xs text-muted-foreground font-mono bg-muted/50 p-2 rounded mb-3">
        {command.usage || `/${name}`}
      </div>
      
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {command.parameters?.length || 0} params
        </span>
        <Button
          size="sm"
          onClick={handleExecute}
          disabled={executing}
        >
          {executing ? (
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Play className="w-4 h-4 mr-2" />
          )}
          Run
        </Button>
      </div>
    </div>
  );
}

// Templates Manager Component
function TemplatesManager({ templates, onCreate, onRefresh }) {
  return (
    <div className="flex-1 flex flex-col">
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Command Templates</h3>
          <Button onClick={() => onCreate({})}>
            <Plus className="w-4 h-4 mr-2" />
            New Template
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Create reusable command templates with variables and parameters
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6">
          {Object.keys(templates).length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Layers className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No Templates</h3>
              <p>Create command templates to speed up your workflow</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(templates).map(([id, template]) => (
                <div key={id} className="p-4 border border-border rounded-lg">
                  <h4 className="font-medium mb-2">{template.name}</h4>
                  <p className="text-sm text-muted-foreground mb-3">{template.description}</p>
                  <div className="text-xs font-mono bg-muted/50 p-2 rounded">
                    {template.template}
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

// Command History Component
function CommandHistory({ history, onExecute, onRefresh }) {
  return (
    <div className="flex-1 flex flex-col">
      <div className="p-6 border-b border-border">
        <h3 className="text-lg font-semibold mb-2">Command History</h3>
        <p className="text-sm text-muted-foreground">
          Recent slash command executions and their results
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6">
          {history.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No History</h3>
              <p>Command execution history will appear here</p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((entry, index) => (
                <div key={index} className="p-4 border border-border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-sm">/{entry.command}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(entry.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Parameters: {JSON.stringify(entry.parameters)}
                  </p>
                  {entry.result && (
                    <div className="text-xs bg-muted/50 p-2 rounded">
                      <pre className="whitespace-pre-wrap">
                        {JSON.stringify(entry.result, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// Command Settings Component
function CommandSettings({ selectedProject, onRefresh }) {
  return (
    <div className="flex-1 flex flex-col">
      <div className="p-6 border-b border-border">
        <h3 className="text-lg font-semibold mb-2">Command Settings</h3>
        <p className="text-sm text-muted-foreground">
          Configure slash command behavior and preferences
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          <div className="border border-border rounded-lg p-4">
            <h4 className="font-medium mb-2">Auto-completion</h4>
            <p className="text-sm text-muted-foreground mb-3">
              Enable smart auto-completion for slash commands
            </p>
            <label className="flex items-center gap-2">
              <input type="checkbox" defaultChecked />
              <span className="text-sm">Show command suggestions</span>
            </label>
          </div>

          <div className="border border-border rounded-lg p-4">
            <h4 className="font-medium mb-2">Command Scope</h4>
            <p className="text-sm text-muted-foreground mb-3">
              Choose which commands are available in this project
            </p>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input type="checkbox" defaultChecked />
                <span className="text-sm">Built-in commands</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" defaultChecked />
                <span className="text-sm">Project-specific commands</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" />
                <span className="text-sm">Global custom commands</span>
              </label>
            </div>
          </div>

          <div className="border border-border rounded-lg p-4">
            <h4 className="font-medium mb-2">Security</h4>
            <p className="text-sm text-muted-foreground mb-3">
              Security settings for command execution
            </p>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input type="checkbox" defaultChecked />
                <span className="text-sm">Require confirmation for destructive commands</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" />
                <span className="text-sm">Sandbox command execution</span>
              </label>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

// Command Editor Modal Component
function CommandEditor({ command, onSave, onClose }) {
  const [formData, setFormData] = useState({
    name: command?.name || '',
    description: command?.description || '',
    category: command?.category || COMMAND_CATEGORIES.CUSTOM,
    parameters: command?.parameters || [],
    template: command?.template || '',
    action: command?.action || '',
    usage: command?.usage || '',
    examples: command?.examples || []
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-background border border-border rounded-lg shadow-xl w-full max-w-4xl m-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h3 className="text-lg font-semibold">
            {command ? 'Edit Command' : 'Create New Command'}
          </h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Command Name</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="my-command"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                className="w-full p-2 border border-border rounded-md bg-background"
              >
                {Object.entries(COMMAND_CATEGORIES).map(([key, value]) => (
                  <option key={key} value={value}>
                    {key.charAt(0) + key.slice(1).toLowerCase().replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <Input
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="What does this command do?"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Template</label>
            <Input
              value={formData.template}
              onChange={(e) => setFormData(prev => ({ ...prev, template: e.target.value }))}
              placeholder="/{name} ${param1} ${param2}"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Usage Example</label>
            <Input
              value={formData.usage}
              onChange={(e) => setFormData(prev => ({ ...prev, usage: e.target.value }))}
              placeholder="/my-command example value"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              {command ? 'Update' : 'Create'} Command
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Template Editor Modal Component
function TemplateEditor({ onSave, onClose }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    template: '',
    variables: []
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-background border border-border rounded-lg shadow-xl w-full max-w-2xl m-4">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h3 className="text-lg font-semibold">Create Template</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Template Name</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="My Template"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <Input
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Template description..."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Template</label>
            <textarea
              value={formData.template}
              onChange={(e) => setFormData(prev => ({ ...prev, template: e.target.value }))}
              placeholder="/command ${variable1} ${variable2}"
              className="w-full p-2 border border-border rounded-md bg-background h-24 resize-none"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Create Template</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Command Details Modal Component
function CommandDetailsModal({ command, onClose, onExecute }) {
  const [parameters, setParameters] = useState({});
  const [executing, setExecuting] = useState(false);
  const Icon = command.icon || Command;

  const handleExecute = async () => {
    setExecuting(true);
    try {
      await onExecute(parameters);
      onClose();
    } catch (error) {
      console.error('Command execution failed:', error);
    }
    setExecuting(false);
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-background border border-border rounded-lg shadow-xl w-full max-w-2xl m-4">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <Icon className="w-6 h-6 text-primary" />
            <h3 className="text-lg font-semibold">/{command.name}</h3>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-6">
          <p className="text-muted-foreground mb-4">{command.description}</p>
          
          {command.parameters && command.parameters.length > 0 && (
            <div className="space-y-4 mb-6">
              <h4 className="font-medium">Parameters</h4>
              {command.parameters.map((param, index) => (
                <div key={index}>
                  <label className="block text-sm font-medium mb-2">
                    {param.name} {param.required && <span className="text-red-500">*</span>}
                  </label>
                  <Input
                    value={parameters[param.name] || ''}
                    onChange={(e) => setParameters(prev => ({
                      ...prev,
                      [param.name]: e.target.value
                    }))}
                    placeholder={param.description}
                    required={param.required}
                  />
                </div>
              ))}
            </div>
          )}

          {command.examples && command.examples.length > 0 && (
            <div className="mb-6">
              <h4 className="font-medium mb-2">Examples</h4>
              <div className="space-y-2">
                {command.examples.map((example, index) => (
                  <div key={index} className="text-sm font-mono bg-muted/50 p-2 rounded">
                    {example}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleExecute} disabled={executing}>
              {executing ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              Execute Command
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SlashCommandsManager; 