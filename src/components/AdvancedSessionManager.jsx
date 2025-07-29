import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { 
  X,
  Search,
  Filter,
  Tag,
  GitBranch,
  FileText,
  Download,
  Upload,
  Calendar,
  Clock,
  MessageSquare,
  Star,
  StarOff,
  Folder,
  FolderOpen,
  Copy,
  Trash2,
  Edit3,
  Plus,
  Archive,
  Share2,
  Settings,
  MoreHorizontal,
  ChevronDown,
  ChevronRight,
  SortAsc,
  SortDesc,
  Zap,
  Bookmark,
  History,
  Users,
  Target,
  Database,
  RefreshCw,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  Info,
  BookOpen
} from 'lucide-react';

const SESSION_TEMPLATES = [
  {
    id: 'code-review',
    name: 'Code Review',
    description: 'Template for reviewing code changes and pull requests',
    icon: Eye,
    category: 'Development',
    initialPrompt: 'I need you to review the following code changes. Please focus on:\n\n1. Code quality and best practices\n2. Potential bugs or security issues\n3. Performance considerations\n4. Maintainability and readability\n\nHere\'s the code:',
    tags: ['code-review', 'development', 'quality'],
    estimatedTime: '15-30 min'
  },
  {
    id: 'debugging',
    name: 'Debug Session',
    description: 'Systematic debugging workflow template',
    icon: Target,
    category: 'Development',
    initialPrompt: 'I\'m encountering an issue that needs debugging. Let\'s work through this systematically:\n\n1. Problem description\n2. Expected vs actual behavior\n3. Error messages or logs\n4. Steps to reproduce\n\nProblem details:',
    tags: ['debugging', 'troubleshooting', 'development'],
    estimatedTime: '30-60 min'
  },
  {
    id: 'brainstorming',
    name: 'Brainstorming',
    description: 'Creative ideation and problem-solving session',
    icon: Zap,
    category: 'Creative',
    initialPrompt: 'Let\'s brainstorm ideas for the following topic. I\'d like you to help me explore different angles and generate creative solutions:\n\nTopic:',
    tags: ['brainstorming', 'creative', 'ideation'],
    estimatedTime: '20-45 min'
  },
  {
    id: 'learning',
    name: 'Learning Session',
    description: 'Structured learning and educational discussion',
    icon: BookOpen,
    category: 'Education',
    initialPrompt: 'I want to learn about the following topic. Please provide a structured explanation with examples and help me understand the key concepts:\n\nTopic:',
    tags: ['learning', 'education', 'tutorial'],
    estimatedTime: '30-60 min'
  },
  {
    id: 'documentation',
    name: 'Documentation',
    description: 'Creating comprehensive project documentation',
    icon: FileText,
    category: 'Documentation',
    initialPrompt: 'I need help creating documentation for my project. Let\'s structure this to include:\n\n1. Overview and purpose\n2. Installation/setup instructions\n3. Usage examples\n4. API reference (if applicable)\n5. Contributing guidelines\n\nProject details:',
    tags: ['documentation', 'writing', 'project'],
    estimatedTime: '45-90 min'
  },
  {
    id: 'architecture',
    name: 'Architecture Design',
    description: 'System architecture and design discussions',
    icon: Database,
    category: 'Architecture',
    initialPrompt: 'Let\'s design the architecture for this system. I\'d like to discuss:\n\n1. System requirements and constraints\n2. Component design and relationships\n3. Data flow and storage\n4. Scalability considerations\n5. Technology choices\n\nProject requirements:',
    tags: ['architecture', 'design', 'system', 'planning'],
    estimatedTime: '60-120 min'
  }
];

const FILTER_OPTIONS = {
  timeRange: [
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'quarter', label: 'This Quarter' },
    { value: 'year', label: 'This Year' },
    { value: 'all', label: 'All Time' }
  ],
  messageCount: [
    { value: 'short', label: 'Short (1-10 messages)' },
    { value: 'medium', label: 'Medium (11-50 messages)' },
    { value: 'long', label: 'Long (51+ messages)' }
  ],
  sessionType: [
    { value: 'regular', label: 'Regular Sessions' },
    { value: 'branched', label: 'Branched Sessions' },
    { value: 'template', label: 'Template Sessions' }
  ]
};

function AdvancedSessionManager({ isOpen, onClose, selectedProject, sessions, onSessionSelect, onSessionCreate }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilters, setSelectedFilters] = useState({
    timeRange: 'all',
    messageCount: '',
    sessionType: '',
    tags: []
  });
  const [showFilters, setShowFilters] = useState(false);
  const [sessionTags, setSessionTags] = useState(new Map());
  const [availableTags, setAvailableTags] = useState([]);
  const [selectedSessions, setSelectedSessions] = useState(new Set());
  const [sortBy, setSortBy] = useState('lastActivity');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showBranchDialog, setShowBranchDialog] = useState(false);
  const [branchFromSession, setBranchFromSession] = useState(null);
  const [branchFromMessage, setBranchFromMessage] = useState(null);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [expandedCategories, setExpandedCategories] = useState(new Set(['Development']));

  useEffect(() => {
    if (isOpen && selectedProject) {
      loadSessionTags();
      loadAvailableTags();
    }
  }, [isOpen, selectedProject]);

  const loadSessionTags = async () => {
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`/api/projects/${selectedProject.name}/session-tags`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setSessionTags(new Map(Object.entries(data.sessionTags || {})));
      }
    } catch (error) {
      console.error('Error loading session tags:', error);
    }
  };

  const loadAvailableTags = async () => {
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`/api/projects/${selectedProject.name}/available-tags`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setAvailableTags(data.tags || []);
      }
    } catch (error) {
      console.error('Error loading available tags:', error);
    }
  };

  const createSessionFromTemplate = async (template, customPrompt = '') => {
    const prompt = customPrompt || template.initialPrompt;
    const sessionData = {
      template: template.id,
      templateName: template.name,
      initialPrompt: prompt,
      tags: template.tags
    };

    if (onSessionCreate) {
      await onSessionCreate(sessionData);
    }
    setShowTemplateDialog(false);
    setSelectedTemplate(null);
  };

  const branchSession = async (fromSessionId, fromMessageIndex, newBranchPrompt) => {
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`/api/projects/${selectedProject.name}/sessions/${fromSessionId}/branch`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fromMessageIndex,
          newPrompt: newBranchPrompt,
          branchName: `Branch from message ${fromMessageIndex + 1}`
        })
      });

      if (response.ok) {
        const data = await response.json();
        setShowBranchDialog(false);
        setBranchFromSession(null);
        setBranchFromMessage(null);
        
        // Navigate to new branched session
        if (onSessionSelect) {
          onSessionSelect(data.newSessionId);
        }
      }
    } catch (error) {
      console.error('Error creating branch:', error);
    }
  };

  const addTagToSession = async (sessionId, tag) => {
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`/api/projects/${selectedProject.name}/sessions/${sessionId}/tags`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ tag })
      });

      if (response.ok) {
        const currentTags = sessionTags.get(sessionId) || [];
        const updatedTags = [...currentTags, tag];
        setSessionTags(new Map(sessionTags.set(sessionId, updatedTags)));
        
        // Add to available tags if not already there
        if (!availableTags.includes(tag)) {
          setAvailableTags([...availableTags, tag]);
        }
      }
    } catch (error) {
      console.error('Error adding tag:', error);
    }
  };

  const removeTagFromSession = async (sessionId, tag) => {
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`/api/projects/${selectedProject.name}/sessions/${sessionId}/tags`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ tag })
      });

      if (response.ok) {
        const currentTags = sessionTags.get(sessionId) || [];
        const updatedTags = currentTags.filter(t => t !== tag);
        setSessionTags(new Map(sessionTags.set(sessionId, updatedTags)));
      }
    } catch (error) {
      console.error('Error removing tag:', error);
    }
  };

  const exportSessions = async (sessionIds, format = 'json') => {
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`/api/projects/${selectedProject.name}/sessions/export`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sessionIds, format })
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sessions-export-${new Date().toISOString().split('T')[0]}.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error exporting sessions:', error);
    }
  };

  const filteredSessions = sessions.filter(session => {
    // Search query
    if (searchQuery && !session.summary.toLowerCase().includes(searchQuery.toLowerCase())) {
      const tags = sessionTags.get(session.id) || [];
      if (!tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))) {
        return false;
      }
    }

    // Time range filter
    if (selectedFilters.timeRange !== 'all') {
      const sessionDate = new Date(session.lastActivity);
      const now = new Date();
      const daysDiff = Math.floor((now - sessionDate) / (1000 * 60 * 60 * 24));
      
      switch (selectedFilters.timeRange) {
        case 'today':
          if (daysDiff > 0) return false;
          break;
        case 'week':
          if (daysDiff > 7) return false;
          break;
        case 'month':
          if (daysDiff > 30) return false;
          break;
        case 'quarter':
          if (daysDiff > 90) return false;
          break;
        case 'year':
          if (daysDiff > 365) return false;
          break;
      }
    }

    // Message count filter
    if (selectedFilters.messageCount) {
      const messageCount = session.messageCount || 0;
      switch (selectedFilters.messageCount) {
        case 'short':
          if (messageCount > 10) return false;
          break;
        case 'medium':
          if (messageCount <= 10 || messageCount > 50) return false;
          break;
        case 'long':
          if (messageCount <= 50) return false;
          break;
      }
    }

    // Tags filter
    if (selectedFilters.tags.length > 0) {
      const tags = sessionTags.get(session.id) || [];
      if (!selectedFilters.tags.some(filterTag => tags.includes(filterTag))) {
        return false;
      }
    }

    return true;
  });

  // Sort sessions
  const sortedSessions = [...filteredSessions].sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'lastActivity':
        comparison = new Date(b.lastActivity) - new Date(a.lastActivity);
        break;
      case 'summary':
        comparison = a.summary.localeCompare(b.summary);
        break;
      case 'messageCount':
        comparison = (b.messageCount || 0) - (a.messageCount || 0);
        break;
      case 'created':
        comparison = new Date(b.created || b.lastActivity) - new Date(a.created || a.lastActivity);
        break;
    }
    
    return sortOrder === 'desc' ? comparison : -comparison;
  });

  const toggleCategoryExpansion = (category) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-7xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <MessageSquare className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Advanced Session Management
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {selectedProject?.displayName || selectedProject?.name} • {filteredSessions.length} sessions
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setShowTemplateDialog(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              New from Template
            </Button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="flex px-6">
            {[
              { id: 'overview', label: 'Overview', icon: MessageSquare },
              { id: 'search', label: 'Search & Filter', icon: Search },
              { id: 'templates', label: 'Templates', icon: FileText },
              { id: 'branches', label: 'Branches', icon: GitBranch },
              { id: 'export', label: 'Export/Import', icon: Download }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                  activeTab === id
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900 dark:text-blue-300">
                      Total Sessions
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-blue-900 dark:text-blue-300">
                    {sessions.length}
                  </div>
                </div>

                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-green-900 dark:text-green-300">
                      This Week
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-green-900 dark:text-green-300">
                    {sessions.filter(s => {
                      const sessionDate = new Date(s.lastActivity);
                      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                      return sessionDate > weekAgo;
                    }).length}
                  </div>
                </div>

                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <GitBranch className="w-4 h-4 text-purple-600" />
                    <span className="text-sm font-medium text-purple-900 dark:text-purple-300">
                      Branched
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-purple-900 dark:text-purple-300">
                    {sessions.filter(s => s.isBranched).length}
                  </div>
                </div>

                <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Tag className="w-4 h-4 text-orange-600" />
                    <span className="text-sm font-medium text-orange-900 dark:text-orange-300">
                      Tagged
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-orange-900 dark:text-orange-300">
                    {Array.from(sessionTags.values()).filter(tags => tags.length > 0).length}
                  </div>
                </div>
              </div>

              {/* Recent Sessions */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    Recent Sessions
                  </h3>
                  <div className="flex items-center gap-2">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700"
                    >
                      <option value="lastActivity">Last Activity</option>
                      <option value="summary">Name</option>
                      <option value="messageCount">Message Count</option>
                      <option value="created">Created</option>
                    </select>
                    <button
                      onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                      className="p-1 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                    >
                      {sortOrder === 'desc' ? <SortDesc className="w-4 h-4" /> : <SortAsc className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  {sortedSessions.slice(0, 10).map((session) => (
                    <div
                      key={session.id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer"
                      onClick={() => onSessionSelect && onSessionSelect(session.id)}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <MessageSquare className="w-4 h-4 text-gray-600" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900 dark:text-white">
                              {session.summary}
                            </span>
                            {session.isBranched && (
                              <GitBranch className="w-3 h-3 text-purple-600" />
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                            <span>{session.messageCount || 0} messages</span>
                            <span>{new Date(session.lastActivity).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {/* Session Tags */}
                        <div className="flex items-center gap-1">
                          {(sessionTags.get(session.id) || []).slice(0, 3).map((tag) => (
                            <Badge
                              key={tag}
                              className="text-xs bg-blue-100 text-blue-800 border-blue-200"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setBranchFromSession(session.id);
                            setShowBranchDialog(true);
                          }}
                          className="p-1 text-gray-600 hover:text-purple-600 dark:text-gray-400 dark:hover:text-purple-400"
                          title="Branch conversation"
                        >
                          <GitBranch className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Search & Filter Tab */}
          {activeTab === 'search' && (
            <div className="space-y-6">
              {/* Search Bar */}
              <div className="flex items-center gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search sessions by content or tags..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className={showFilters ? 'bg-blue-50 border-blue-200' : ''}
                >
                  <Filter className="w-4 h-4 mr-2" />
                  Filters
                </Button>

                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedFilters({ timeRange: 'all', messageCount: '', sessionType: '', tags: [] });
                  }}
                >
                  Clear
                </Button>
              </div>

              {/* Filter Panel */}
              {showFilters && (
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Time Range Filter */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Time Range
                      </label>
                      <select
                        value={selectedFilters.timeRange}
                        onChange={(e) => setSelectedFilters({
                          ...selectedFilters,
                          timeRange: e.target.value
                        })}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800"
                      >
                        {FILTER_OPTIONS.timeRange.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Message Count Filter */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Session Length
                      </label>
                      <select
                        value={selectedFilters.messageCount}
                        onChange={(e) => setSelectedFilters({
                          ...selectedFilters,
                          messageCount: e.target.value
                        })}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800"
                      >
                        <option value="">All Lengths</option>
                        {FILTER_OPTIONS.messageCount.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Session Type Filter */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Session Type
                      </label>
                      <select
                        value={selectedFilters.sessionType}
                        onChange={(e) => setSelectedFilters({
                          ...selectedFilters,
                          sessionType: e.target.value
                        })}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800"
                      >
                        <option value="">All Types</option>
                        {FILTER_OPTIONS.sessionType.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Tags Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Tags
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {availableTags.map((tag) => (
                        <button
                          key={tag}
                          onClick={() => {
                            const currentTags = selectedFilters.tags;
                            const newTags = currentTags.includes(tag)
                              ? currentTags.filter(t => t !== tag)
                              : [...currentTags, tag];
                            setSelectedFilters({ ...selectedFilters, tags: newTags });
                          }}
                          className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                            selectedFilters.tags.includes(tag)
                              ? 'bg-blue-100 text-blue-800 border-blue-200'
                              : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Search Results */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    Search Results ({filteredSessions.length})
                  </h3>
                  
                  {selectedSessions.size > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {selectedSessions.size} selected
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => exportSessions(Array.from(selectedSessions))}
                      >
                        <Download className="w-3 h-3 mr-1" />
                        Export
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedSessions(new Set())}
                      >
                        Clear
                      </Button>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  {sortedSessions.map((session) => (
                    <div
                      key={session.id}
                      className={`flex items-center p-3 rounded-lg border transition-colors ${
                        selectedSessions.has(session.id)
                          ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'
                          : 'bg-white border-gray-200 dark:bg-gray-700 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedSessions.has(session.id)}
                        onChange={(e) => {
                          const newSelected = new Set(selectedSessions);
                          if (e.target.checked) {
                            newSelected.add(session.id);
                          } else {
                            newSelected.delete(session.id);
                          }
                          setSelectedSessions(newSelected);
                        }}
                        className="mr-3"
                      />

                      <div
                        className="flex-1 cursor-pointer"
                        onClick={() => onSessionSelect && onSessionSelect(session.id)}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-900 dark:text-white">
                            {session.summary}
                          </span>
                          {session.isBranched && (
                            <GitBranch className="w-3 h-3 text-purple-600" />
                          )}
                        </div>
                        
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>{session.messageCount || 0} messages</span>
                          <span>{new Date(session.lastActivity).toLocaleDateString()}</span>
                        </div>

                        {/* Session Tags */}
                        <div className="flex items-center gap-1 mt-2">
                          {(sessionTags.get(session.id) || []).map((tag) => (
                            <Badge
                              key={tag}
                              className="text-xs bg-gray-100 text-gray-600 border-gray-200"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {filteredSessions.length === 0 && (
                  <div className="text-center py-12">
                    <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      No sessions found
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Try adjusting your search query or filters.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Templates Tab */}
          {activeTab === 'templates' && (
            <div className="space-y-6">
              <div className="text-center py-6">
                <FileText className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Session Templates
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                  Start conversations with pre-configured templates designed for specific workflows and use cases.
                </p>
              </div>

              {/* Template Categories */}
              {Object.entries(
                SESSION_TEMPLATES.reduce((acc, template) => {
                  if (!acc[template.category]) acc[template.category] = [];
                  acc[template.category].push(template);
                  return acc;
                }, {})
              ).map(([category, templates]) => (
                <div key={category} className="border border-gray-200 dark:border-gray-600 rounded-lg">
                  <button
                    onClick={() => toggleCategoryExpansion(category)}
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <div className="flex items-center gap-3">
                      {expandedCategories.has(category) ? 
                        <ChevronDown className="w-4 h-4 text-gray-600" /> :
                        <ChevronRight className="w-4 h-4 text-gray-600" />
                      }
                      <span className="font-medium text-gray-900 dark:text-white">
                        {category}
                      </span>
                      <Badge className="bg-gray-100 text-gray-600 border-gray-200">
                        {templates.length}
                      </Badge>
                    </div>
                  </button>

                  {expandedCategories.has(category) && (
                    <div className="border-t border-gray-200 dark:border-gray-600 p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {templates.map((template) => (
                          <div
                            key={template.id}
                            className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                            onClick={() => {
                              setSelectedTemplate(template);
                              setShowTemplateDialog(true);
                            }}
                          >
                            <div className="flex items-start gap-3">
                              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                <template.icon className="w-4 h-4 text-blue-600" />
                              </div>
                              
                              <div className="flex-1">
                                <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                                  {template.name}
                                </h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                                  {template.description}
                                </p>
                                
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2 text-xs text-gray-500">
                                    <Clock className="w-3 h-3" />
                                    {template.estimatedTime}
                                  </div>
                                  
                                  <div className="flex items-center gap-1">
                                    {template.tags.slice(0, 2).map((tag) => (
                                      <Badge
                                        key={tag}
                                        className="text-xs bg-blue-100 text-blue-600 border-blue-200"
                                      >
                                        {tag}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Branches Tab */}
          {activeTab === 'branches' && (
            <div className="space-y-6">
              <div className="text-center py-6">
                <GitBranch className="w-12 h-12 text-purple-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Conversation Branches
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                  Explore different conversation paths by branching from any point in your sessions.
                </p>
              </div>

              {/* Branch Visualization */}
              <div className="space-y-4">
                {sessions.filter(s => s.isBranched || s.hasChildren).map((session) => (
                  <div key={session.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <GitBranch className="w-4 h-4 text-purple-600" />
                      <span className="font-medium text-gray-900 dark:text-white">
                        {session.summary}
                      </span>
                      {session.parentSession && (
                        <Badge className="bg-purple-100 text-purple-800 border-purple-200">
                          Branch
                        </Badge>
                      )}
                    </div>
                    
                    {session.branches && session.branches.length > 0 && (
                      <div className="ml-7 space-y-2">
                        {session.branches.map((branch, index) => (
                          <div
                            key={branch.id}
                            className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                            onClick={() => onSessionSelect && onSessionSelect(branch.id)}
                          >
                            <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                            <span className="text-sm text-gray-900 dark:text-white">
                              {branch.summary}
                            </span>
                            <div className="text-xs text-gray-500 ml-auto">
                              {branch.messageCount || 0} messages
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {sessions.filter(s => s.isBranched || s.hasChildren).length === 0 && (
                <div className="text-center py-12">
                  <GitBranch className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No branches yet
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Start branching conversations to explore different paths and ideas.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Export/Import Tab */}
          {activeTab === 'export' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Export Section */}
                <div className="p-6 border border-gray-200 dark:border-gray-600 rounded-lg">
                  <div className="flex items-center gap-3 mb-4">
                    <Download className="w-5 h-5 text-blue-600" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      Export Sessions
                    </h3>
                  </div>
                  
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Export your conversation sessions for backup, sharing, or analysis.
                  </p>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Export Format
                      </label>
                      <select className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800">
                        <option value="json">JSON (Full Data)</option>
                        <option value="markdown">Markdown (Readable)</option>
                        <option value="csv">CSV (Summary)</option>
                        <option value="txt">Plain Text</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Sessions to Export
                      </label>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2">
                          <input type="radio" name="exportScope" value="all" defaultChecked />
                          <span className="text-sm">All Sessions ({sessions.length})</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input type="radio" name="exportScope" value="selected" />
                          <span className="text-sm">Selected Sessions ({selectedSessions.size})</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input type="radio" name="exportScope" value="filtered" />
                          <span className="text-sm">Filtered Results ({filteredSessions.length})</span>
                        </label>
                      </div>
                    </div>

                    <Button 
                      className="w-full bg-blue-600 hover:bg-blue-700"
                      onClick={() => exportSessions(sessions.map(s => s.id))}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export Sessions
                    </Button>
                  </div>
                </div>

                {/* Import Section */}
                <div className="p-6 border border-gray-200 dark:border-gray-600 rounded-lg">
                  <div className="flex items-center gap-3 mb-4">
                    <Upload className="w-5 h-5 text-green-600" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      Import Sessions
                    </h3>
                  </div>
                  
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Import previously exported sessions or conversations from other sources.
                  </p>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Import File
                      </label>
                      <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
                        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          Drag and drop your export file here
                        </p>
                        <Button variant="outline" size="sm">
                          Choose File
                        </Button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Import Options
                      </label>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2">
                          <input type="checkbox" defaultChecked />
                          <span className="text-sm">Preserve original timestamps</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input type="checkbox" defaultChecked />
                          <span className="text-sm">Import session tags</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input type="checkbox" />
                          <span className="text-sm">Merge with existing sessions</span>
                        </label>
                      </div>
                    </div>

                    <Button 
                      className="w-full bg-green-600 hover:bg-green-700"
                      disabled
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Import Sessions
                    </Button>
                  </div>
                </div>
              </div>

              {/* Recent Exports */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Recent Exports
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="w-4 h-4 text-gray-600" />
                      <div>
                        <span className="font-medium text-gray-900 dark:text-white">
                          sessions-export-2024-01-15.json
                        </span>
                        <div className="text-xs text-gray-500">
                          25 sessions • 2.3 MB • Exported today
                        </div>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      <Download className="w-3 h-3 mr-1" />
                      Download
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
            <span>{sessions.length} total sessions</span>
            <span>•</span>
            <span>{filteredSessions.length} filtered</span>
            <span>•</span>
            <span>{selectedSessions.size} selected</span>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button
              onClick={() => setShowTemplateDialog(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Session
            </Button>
          </div>
        </div>
      </div>

      {/* Template Dialog */}
      {showTemplateDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {selectedTemplate ? `Use Template: ${selectedTemplate.name}` : 'Choose Template'}
              </h3>
              <button
                onClick={() => {
                  setShowTemplateDialog(false);
                  setSelectedTemplate(null);
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              {selectedTemplate ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <selectedTemplate.icon className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {selectedTemplate.name}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {selectedTemplate.description}
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Initial Prompt (you can customize this)
                    </label>
                    <textarea
                      defaultValue={selectedTemplate.initialPrompt}
                      className="w-full h-32 border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Enter your initial prompt..."
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-700 dark:text-gray-300">Tags:</span>
                    {selectedTemplate.tags.map((tag) => (
                      <Badge key={tag} className="bg-blue-100 text-blue-800 border-blue-200">
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  <div className="flex justify-end gap-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowTemplateDialog(false);
                        setSelectedTemplate(null);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => createSessionFromTemplate(selectedTemplate)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Create Session
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">
                    Choose a template from the Templates tab to get started.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Branch Dialog */}
      {showBranchDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <GitBranch className="w-5 h-5 text-purple-600" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Create Branch
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowBranchDialog(false);
                  setBranchFromSession(null);
                  setBranchFromMessage(null);
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Branch from session
                </label>
                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <span className="font-medium text-gray-900 dark:text-white">
                    {sessions.find(s => s.id === branchFromSession)?.summary || 'Unknown Session'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  New direction for the conversation
                </label>
                <textarea
                  placeholder="What would you like to explore in this branch? Enter your new prompt or question..."
                  className="w-full h-24 border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowBranchDialog(false);
                    setBranchFromSession(null);
                    setBranchFromMessage(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => branchSession(branchFromSession, 0, 'New branch direction')}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <GitBranch className="w-4 h-4 mr-2" />
                  Create Branch
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdvancedSessionManager; 