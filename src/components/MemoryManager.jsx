import React, { useState, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { 
  X, Save, Plus, Trash2, Edit3, FileText, Folder, Globe, User, Clock, 
  GitBranch, History, Search, Filter, Download, Upload, RefreshCw, 
  AlertTriangle, CheckCircle, Info, Settings, Eye, EyeOff, Copy,
  Brain, Layers, Zap, Target, BookOpen, Archive, Tag, Hash,
  ChevronDown, ChevronRight, MoreHorizontal, Link2, Share2
} from 'lucide-react';

const MEMORY_SCOPES = {
  GLOBAL: 'global',
  PROJECT: 'project', 
  SESSION: 'session'
};

const MEMORY_TYPES = {
  INSTRUCTIONS: 'instructions',
  CONTEXT: 'context',
  PREFERENCES: 'preferences',
  COMMANDS: 'commands',
  TEMPLATES: 'templates'
};

const MEMORY_SCOPE_CONFIG = {
  [MEMORY_SCOPES.GLOBAL]: {
    label: 'Global Memory',
    icon: Globe,
    color: 'text-blue-600',
    bg: 'bg-blue-100',
    description: 'Available across all projects',
    path: '~/.claude/CLAUDE.md'
  },
  [MEMORY_SCOPES.PROJECT]: {
    label: 'Project Memory', 
    icon: Folder,
    color: 'text-green-600',
    bg: 'bg-green-100',
    description: 'Project-specific knowledge',
    path: './CLAUDE.md'
  },
  [MEMORY_SCOPES.SESSION]: {
    label: 'Session Memory',
    icon: Clock,
    color: 'text-purple-600', 
    bg: 'bg-purple-100',
    description: 'Current session context',
    path: './.claude/session.md'
  }
};

function MemoryManager({ isOpen, onClose, selectedProject, currentSession }) {
  const [activeScope, setActiveScope] = useState(MEMORY_SCOPES.PROJECT);
  const [memories, setMemories] = useState({});
  const [selectedMemory, setSelectedMemory] = useState(null);
  const [editingMemory, setEditingMemory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [loading, setLoading] = useState(false);
  const [memoryHistory, setMemoryHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [autoInject, setAutoInject] = useState(true);
  const [memoryStats, setMemoryStats] = useState({});

  // Load memories for all scopes
  const loadMemories = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/memory/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          projectId: selectedProject?.id,
          sessionId: currentSession?.id 
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setMemories(data.memories || {});
        setMemoryStats(data.stats || {});
      }
    } catch (error) {
      console.error('Failed to load memories:', error);
    }
    setLoading(false);
  }, [selectedProject, currentSession]);

  // Load memory history
  const loadMemoryHistory = useCallback(async (memoryId) => {
    try {
      const response = await fetch(`/api/memory/history/${memoryId}`);
      if (response.ok) {
        const history = await response.json();
        setMemoryHistory(history);
      }
    } catch (error) {
      console.error('Failed to load memory history:', error);
    }
  }, []);

  // Save memory
  const saveMemory = async (memoryData) => {
    try {
      const response = await fetch('/api/memory/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...memoryData,
          projectId: selectedProject?.id,
          sessionId: currentSession?.id,
          autoInject
        })
      });

      if (response.ok) {
        const savedMemory = await response.json();
        setMemories(prev => ({
          ...prev,
          [savedMemory.scope]: {
            ...prev[savedMemory.scope],
            [savedMemory.id]: savedMemory
          }
        }));
        setEditingMemory(null);
        await loadMemories(); // Refresh to get updated stats
      }
    } catch (error) {
      console.error('Failed to save memory:', error);
    }
  };

  // Delete memory
  const deleteMemory = async (memoryId, scope) => {
    if (!confirm('Are you sure you want to delete this memory?')) return;
    
    try {
      const response = await fetch(`/api/memory/delete/${memoryId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setMemories(prev => {
          const updated = { ...prev };
          if (updated[scope]) {
            delete updated[scope][memoryId];
          }
          return updated;
        });
        setSelectedMemory(null);
      }
    } catch (error) {
      console.error('Failed to delete memory:', error);
    }
  };

  // Generate CLAUDE.md from current memories
  const generateClaudeMd = async (scope) => {
    try {
      const response = await fetch('/api/memory/generate-claude-md', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          scope,
          projectId: selectedProject?.id,
          sessionId: currentSession?.id 
        })
      });

      if (response.ok) {
        const { content, path } = await response.json();
        // Show generated content in modal or download
        const blob = new Blob([content], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `CLAUDE-${scope}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Failed to generate CLAUDE.md:', error);
    }
  };

  // Auto-update memory from conversation
  const updateMemoryFromContext = async (context, type = MEMORY_TYPES.CONTEXT) => {
    try {
      const response = await fetch('/api/memory/auto-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context,
          type,
          scope: activeScope,
          projectId: selectedProject?.id,
          sessionId: currentSession?.id
        })
      });

      if (response.ok) {
        await loadMemories();
      }
    } catch (error) {
      console.error('Failed to auto-update memory:', error);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadMemories();
    }
  }, [isOpen, loadMemories]);

  // Filter memories based on search and type
  const filteredMemories = React.useMemo(() => {
    const scopeMemories = memories[activeScope] || {};
    return Object.entries(scopeMemories).filter(([id, memory]) => {
      const matchesSearch = searchQuery === '' || 
        memory.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        memory.content?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesType = filterType === 'all' || memory.type === filterType;
      
      return matchesSearch && matchesType;
    });
  }, [memories, activeScope, searchQuery, filterType]);

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const getMemoryIcon = (type) => {
    switch (type) {
      case MEMORY_TYPES.INSTRUCTIONS: return BookOpen;
      case MEMORY_TYPES.CONTEXT: return Brain;
      case MEMORY_TYPES.PREFERENCES: return Settings;
      case MEMORY_TYPES.COMMANDS: return Hash;
      case MEMORY_TYPES.TEMPLATES: return Archive;
      default: return FileText;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop fixed inset-0 flex items-center justify-center z-[100] md:p-4 bg-background/95">
      <div className="bg-background border border-border md:rounded-lg shadow-xl w-full md:max-w-7xl h-full md:h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <Brain className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
            <div>
              <h2 className="text-lg md:text-xl font-semibold text-foreground">
                Memory Manager
              </h2>
              <p className="text-sm text-muted-foreground">
                CLAUDE.md Memory System - Project Knowledge & Context
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => generateClaudeMd(activeScope)}
              className="text-muted-foreground hover:text-foreground"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
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

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-80 border-r border-border flex flex-col">
            {/* Memory Scopes */}
            <div className="p-4 border-b border-border">
              <div className="space-y-2">
                {Object.entries(MEMORY_SCOPE_CONFIG).map(([scope, config]) => {
                  const Icon = config.icon;
                  const stats = memoryStats[scope] || {};
                  
                  return (
                    <button
                      key={scope}
                      onClick={() => setActiveScope(scope)}
                      className={`w-full p-3 rounded-lg text-left transition-colors ${
                        activeScope === scope
                          ? 'bg-primary/10 border border-primary/20'
                          : 'hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon className={`w-4 h-4 ${config.color}`} />
                          <span className="font-medium">{config.label}</span>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {stats.count || 0}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {config.description}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 font-mono">
                        {config.path}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Search and Filters */}
            <div className="p-4 border-b border-border space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search memories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full p-2 border border-border rounded-md bg-background"
              >
                <option value="all">All Types</option>
                {Object.entries(MEMORY_TYPES).map(([key, value]) => (
                  <option key={key} value={value}>
                    {key.charAt(0) + key.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
            </div>

            {/* Auto-Inject Toggle */}
            <div className="p-4 border-b border-border">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoInject}
                  onChange={(e) => setAutoInject(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm">Auto-inject into context</span>
              </label>
            </div>

            {/* Memory List */}
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-2">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredMemories.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No memories found</p>
                    <p className="text-xs">Create your first memory</p>
                  </div>
                ) : (
                  filteredMemories.map(([id, memory]) => {
                    const MemoryIcon = getMemoryIcon(memory.type);
                    
                    return (
                      <div
                        key={id}
                        onClick={() => setSelectedMemory(memory)}
                        className={`p-3 rounded-lg cursor-pointer transition-colors ${
                          selectedMemory?.id === id
                            ? 'bg-primary/10 border border-primary/20'
                            : 'hover:bg-muted/50'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <MemoryIcon className="w-4 h-4 mt-0.5 text-muted-foreground" />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">
                              {memory.title}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {memory.content?.substring(0, 100)}...
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {memory.type}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {formatTimestamp(memory.updatedAt)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>

            {/* Add Memory Button */}
            <div className="p-4 border-t border-border">
              <Button
                onClick={() => setEditingMemory({ 
                  scope: activeScope, 
                  type: MEMORY_TYPES.INSTRUCTIONS,
                  autoInject: true 
                })}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Memory
              </Button>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col">
            {editingMemory ? (
              <MemoryEditor
                memory={editingMemory}
                onSave={saveMemory}
                onCancel={() => setEditingMemory(null)}
                scope={activeScope}
              />
            ) : selectedMemory ? (
              <MemoryViewer
                memory={selectedMemory}
                onEdit={() => setEditingMemory(selectedMemory)}
                onDelete={() => deleteMemory(selectedMemory.id, selectedMemory.scope)}
                onShowHistory={() => {
                  setShowHistory(true);
                  loadMemoryHistory(selectedMemory.id);
                }}
                history={showHistory ? memoryHistory : []}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Brain className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">Memory Manager</h3>
                  <p>Select a memory to view or create a new one</p>
                  <div className="mt-6 space-y-2 text-sm">
                    <div className="flex items-center gap-2 justify-center">
                      <Globe className="w-4 h-4 text-blue-600" />
                      <span>Global: {memoryStats.global?.count || 0} memories</span>
                    </div>
                    <div className="flex items-center gap-2 justify-center">
                      <Folder className="w-4 h-4 text-green-600" />
                      <span>Project: {memoryStats.project?.count || 0} memories</span>
                    </div>
                    <div className="flex items-center gap-2 justify-center">
                      <Clock className="w-4 h-4 text-purple-600" />
                      <span>Session: {memoryStats.session?.count || 0} memories</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Memory Editor Component
function MemoryEditor({ memory, onSave, onCancel, scope }) {
  const [formData, setFormData] = useState({
    title: memory?.title || '',
    content: memory?.content || '',
    type: memory?.type || MEMORY_TYPES.INSTRUCTIONS,
    autoInject: memory?.autoInject !== false,
    tags: memory?.tags || [],
    scope: scope
  });
  
  const [newTag, setNewTag] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...memory,
      ...formData,
      id: memory?.id || `memory_${Date.now()}`,
      updatedAt: new Date().toISOString()
    });
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const removeTag = (tag) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }));
  };

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h3 className="text-lg font-semibold">
          {memory?.id ? 'Edit Memory' : 'Create Memory'}
        </h3>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" onClick={handleSubmit}>
            <Save className="w-4 h-4 mr-2" />
            Save
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Title</label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Memory title..."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Type</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
              className="w-full p-2 border border-border rounded-md bg-background"
            >
              {Object.entries(MEMORY_TYPES).map(([key, value]) => (
                <option key={key} value={value}>
                  {key.charAt(0) + key.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Content</label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
              placeholder="Memory content (supports Markdown)..."
              className="w-full h-64 p-3 border border-border rounded-md bg-background resize-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Tags</label>
            <div className="flex gap-2 mb-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Add tag..."
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
              />
              <Button type="button" onClick={addTag}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.tags.map(tag => (
                <Badge key={tag} variant="secondary" className="gap-1">
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="ml-1 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="autoInject"
              checked={formData.autoInject}
              onChange={(e) => setFormData(prev => ({ ...prev, autoInject: e.target.checked }))}
              className="rounded"
            />
            <label htmlFor="autoInject" className="text-sm">
              Auto-inject into Claude context
            </label>
          </div>
        </form>
      </ScrollArea>
    </div>
  );
}

// Memory Viewer Component  
function MemoryViewer({ memory, onEdit, onDelete, onShowHistory, history }) {
  const [showFullContent, setShowFullContent] = useState(false);
  
  const MemoryIcon = getMemoryIcon(memory.type);
  
  return (
    <div className="flex-1 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <MemoryIcon className="w-5 h-5 text-muted-foreground" />
          <div>
            <h3 className="text-lg font-semibold">{memory.title}</h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline">{memory.type}</Badge>
              <span>•</span>
              <span>{MEMORY_SCOPE_CONFIG[memory.scope]?.label}</span>
              <span>•</span>
              <span>Updated {formatTimestamp(memory.updatedAt)}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onShowHistory}>
            <History className="w-4 h-4 mr-2" />
            History
          </Button>
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Edit3 className="w-4 h-4 mr-2" />
            Edit
          </Button>
          <Button variant="outline" size="sm" onClick={onDelete} className="text-red-600 hover:text-red-700">
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6">
          {/* Tags */}
          {memory.tags && memory.tags.length > 0 && (
            <div className="mb-6">
              <div className="flex flex-wrap gap-2">
                {memory.tags.map(tag => (
                  <Badge key={tag} variant="secondary">
                    <Tag className="w-3 h-3 mr-1" />
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Content */}
          <div className="prose prose-sm max-w-none">
            <div className="whitespace-pre-wrap font-mono text-sm bg-muted/30 p-4 rounded-lg">
              {showFullContent || memory.content.length <= 1000 
                ? memory.content 
                : `${memory.content.substring(0, 1000)}...`
              }
            </div>
            {memory.content.length > 1000 && (
              <Button
                variant="link"
                size="sm"
                onClick={() => setShowFullContent(!showFullContent)}
                className="mt-2 p-0"
              >
                {showFullContent ? 'Show less' : 'Show more'}
              </Button>
            )}
          </div>

          {/* Auto-inject status */}
          <div className="mt-6 p-4 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-2">
              {memory.autoInject ? (
                <>
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm">Auto-injected into Claude context</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 text-yellow-600" />
                  <span className="text-sm">Manual injection only</span>
                </>
              )}
            </div>
          </div>

          {/* History */}
          {history && history.length > 0 && (
            <div className="mt-6">
              <h4 className="text-md font-semibold mb-3">Change History</h4>
              <div className="space-y-3">
                {history.slice(0, 5).map((entry, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                    <Clock className="w-4 h-4 mt-0.5 text-muted-foreground" />
                    <div className="flex-1">
                      <div className="text-sm font-medium">{entry.action}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatTimestamp(entry.timestamp)}
                      </div>
                      {entry.changes && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {entry.changes}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function getMemoryIcon(type) {
  switch (type) {
    case MEMORY_TYPES.INSTRUCTIONS: return BookOpen;
    case MEMORY_TYPES.CONTEXT: return Brain;
    case MEMORY_TYPES.PREFERENCES: return Settings;
    case MEMORY_TYPES.COMMANDS: return Hash;
    case MEMORY_TYPES.TEMPLATES: return Archive;
    default: return FileText;
  }
}

function formatTimestamp(timestamp) {
  return new Date(timestamp).toLocaleString();
}

export default MemoryManager; 