import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import {
  Settings, User, Palette, Keyboard, Code, Cpu, Users, 
  Lock, RefreshCw as Sync, Cog, MessageSquare, Hash, 
  Zap, Wrench, Server, Brain, ChevronLeft, Loader2, Plus, 
  Trash2, Save, RotateCcw, Database, AlertTriangle, Layout, Network, Shield, Cloud,
  Slash, FolderOpen, Edit, FileText
} from 'lucide-react';

const SettingsPage = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('mcp');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    user: {
      username: '',
      email: '',
      theme: 'dark'
    },
    api: {
      anthropicKey: '',
      openaiKey: '',
      endpoint: ''
    },
    tools: {
      autoExpandTools: true,
      showRawParameters: false,
      enabledTools: []
    },
    mcp: {
      servers: []
    }
  });

  // MCP specific state
  const [mcpServers, setMcpServers] = useState([]);
  const [mcpLoading, setMcpLoading] = useState(false);
  const [showAddServer, setShowAddServer] = useState(false);
  const [newServer, setNewServer] = useState({ name: '', command: '' });
  const [addingServer, setAddingServer] = useState(false);
  const [removingServer, setRemovingServer] = useState(null);

  // Slash Commands specific state
  const [slashCommands, setSlashCommands] = useState({ project: [], user: [] });
  const [slashLoading, setSlashLoading] = useState(false);
  const [showAddCommand, setShowAddCommand] = useState(false);
  const [editingCommand, setEditingCommand] = useState(null);
  const [commandForm, setCommandForm] = useState({
    type: 'user',
    name: '',
    category: '',
    content: ''
  });

  // Load settings on component mount
  useEffect(() => {
    loadSettings();
    if (activeTab === 'mcp') {
      loadMcpServers();
    }
    if (activeTab === 'slash') {
      loadSlashCommands();
    }
  }, [activeTab]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth-token');
      
      // Load user info
      const userResponse = await fetch('/api/auth/user', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (userResponse.ok) {
        const userData = await userResponse.json();
        setSettings(prev => ({
          ...prev,
          user: {
            ...prev.user,
            username: userData.user?.username || '',
            email: userData.user?.email || ''
          }
        }));
      }
      
      // Load other settings from localStorage
      const savedSettings = {
        api: {
          anthropicKey: localStorage.getItem('anthropic-api-key') || '',
          openaiKey: localStorage.getItem('openai-api-key') || '',
          endpoint: localStorage.getItem('api-endpoint') || ''
        },
        tools: {
          autoExpandTools: JSON.parse(localStorage.getItem('autoExpandTools') || 'true'),
          showRawParameters: JSON.parse(localStorage.getItem('showRawParameters') || 'false'),
          enabledTools: JSON.parse(localStorage.getItem('enabledTools') || '[]')
        }
      };
      
      setSettings(prev => ({ ...prev, ...savedSettings }));
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMcpServers = async () => {
    try {
      setMcpLoading(true);
      const response = await fetch('/api/mcp/list');
      if (response.ok) {
        const data = await response.json();
        // Convert object to array format
        const serversArray = Object.entries(data).map(([name, server]) => ({
          name,
          ...server
        }));
        setMcpServers(serversArray);
      }
    } catch (error) {
      console.error('Error loading MCP servers:', error);
    } finally {
      setMcpLoading(false);
    }
  };

  const addMcpServer = async () => {
    if (!newServer.name || !newServer.command) {
      alert('Please provide both server name and command');
      return;
    }

    try {
      setAddingServer(true);
      const response = await fetch('/api/mcp/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newServer)
      });

      if (response.ok) {
        const data = await response.json();
        alert(data.message || 'Server added successfully!');
        setShowAddServer(false);
        setNewServer({ name: '', command: '' });
        loadMcpServers(); // Reload the list
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to add server');
      }
    } catch (error) {
      console.error('Error adding MCP server:', error);
      alert('Failed to add server');
    } finally {
      setAddingServer(false);
    }
  };

  const removeMcpServer = async (serverName) => {
    if (!confirm(`Are you sure you want to remove "${serverName}"?`)) {
      return;
    }

    try {
      setRemovingServer(serverName);
      const response = await fetch(`/api/mcp/remove/${encodeURIComponent(serverName)}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        const data = await response.json();
        alert(data.message || 'Server removed successfully!');
        loadMcpServers(); // Reload the list
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to remove server');
      }
    } catch (error) {
      console.error('Error removing MCP server:', error);
      alert('Failed to remove server');
    } finally {
      setRemovingServer(null);
    }
  };

  const loadSlashCommands = async () => {
    try {
      setSlashLoading(true);
      const response = await fetch('/api/slash-commands/list');
      if (response.ok) {
        const data = await response.json();
        setSlashCommands(data);
      }
    } catch (error) {
      console.error('Error loading slash commands:', error);
    } finally {
      setSlashLoading(false);
    }
  };

  const saveSlashCommand = async () => {
    if (!commandForm.name || !commandForm.content) {
      alert('Please provide both command name and content');
      return;
    }

    try {
      const response = await fetch('/api/slash-commands/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(commandForm)
      });

      if (response.ok) {
        alert('Command saved successfully!');
        setShowAddCommand(false);
        setEditingCommand(null);
        setCommandForm({ type: 'user', name: '', category: '', content: '' });
        loadSlashCommands();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to save command');
      }
    } catch (error) {
      console.error('Error saving slash command:', error);
      alert('Failed to save command');
    }
  };

  const deleteSlashCommand = async (type, path) => {
    if (!confirm(`Are you sure you want to delete this command?`)) {
      return;
    }

    try {
      const response = await fetch('/api/slash-commands/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, path })
      });

      if (response.ok) {
        alert('Command deleted successfully!');
        loadSlashCommands();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete command');
      }
    } catch (error) {
      console.error('Error deleting slash command:', error);
      alert('Failed to delete command');
    }
  };

  const loadCommandContent = async (type, path) => {
    try {
      const response = await fetch(`/api/slash-commands/content?type=${type}&path=${encodeURIComponent(path)}`);
      if (response.ok) {
        const data = await response.json();
        const pathParts = path.split('/');
        const name = pathParts[pathParts.length - 1].replace('.md', '');
        const category = pathParts.length > 1 ? pathParts[0] : '';
        
        setCommandForm({
          type,
          name,
          category,
          content: data.content
        });
        setEditingCommand({ type, path });
        setShowAddCommand(true);
      }
    } catch (error) {
      console.error('Error loading command content:', error);
      alert('Failed to load command content');
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      
      // Save to localStorage
      if (settings.api.anthropicKey) {
        localStorage.setItem('anthropic-api-key', settings.api.anthropicKey);
      }
      if (settings.api.openaiKey) {
        localStorage.setItem('openai-api-key', settings.api.openaiKey);
      }
      if (settings.api.endpoint) {
        localStorage.setItem('api-endpoint', settings.api.endpoint);
      }
      
      localStorage.setItem('autoExpandTools', JSON.stringify(settings.tools.autoExpandTools));
      localStorage.setItem('showRawParameters', JSON.stringify(settings.tools.showRawParameters));
      localStorage.setItem('enabledTools', JSON.stringify(settings.tools.enabledTools));
      
      // Show success message
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'user', label: 'User Settings', icon: User },
    { id: 'theme', label: 'Appearance', icon: Palette },
    { id: 'api', label: 'API Configuration', icon: Code },
    { id: 'tools', label: 'Tools & Features', icon: Wrench },
    { id: 'mcp', label: 'MCP Servers', icon: Server },
    { id: 'slash', label: 'Slash Commands', icon: Slash },
    { id: 'advanced', label: 'Advanced', icon: Cog }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 flex items-center"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back to Claude Code UI
              </button>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                Settings
              </h1>
            </div>
            <button
              onClick={saveSettings}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-md transition-colors flex items-center gap-2"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Changes
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Sidebar Navigation */}
          <div className="w-64 flex-shrink-0">
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Content Area */}
          <div className="flex-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              {loading ? (
                <div className="text-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-gray-400 mx-auto" />
                  <p className="text-gray-500 dark:text-gray-400 mt-4">Loading settings...</p>
                </div>
              ) : (
                <>
                  {/* User Settings Tab */}
                  {activeTab === 'user' && (
                    <div className="space-y-6">
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">User Settings</h2>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Username
                        </label>
                        <input
                          type="text"
                          value={settings.user.username}
                          onChange={(e) => setSettings(prev => ({
                            ...prev,
                            user: { ...prev.user, username: e.target.value }
                          }))}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          disabled
                        />
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          Username cannot be changed after registration
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Email
                        </label>
                        <input
                          type="email"
                          value={settings.user.email}
                          onChange={(e) => setSettings(prev => ({
                            ...prev,
                            user: { ...prev.user, email: e.target.value }
                          }))}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          placeholder="your@email.com"
                        />
                      </div>
                    </div>
                  )}

                  {/* Theme Settings Tab */}
                  {activeTab === 'theme' && (
                    <div className="space-y-6">
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Appearance</h2>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                          Theme Mode
                        </label>
                        <div className="flex gap-4">
                          <button
                            onClick={() => theme === 'dark' && toggleTheme()}
                            className={`px-4 py-2 rounded-md flex items-center gap-2 ${
                              theme === 'light'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                            }`}
                          >
                            <Sun className="w-4 h-4" />
                            Light
                          </button>
                          <button
                            onClick={() => theme === 'light' && toggleTheme()}
                            className={`px-4 py-2 rounded-md flex items-center gap-2 ${
                              theme === 'dark'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                            }`}
                          >
                            <Moon className="w-4 h-4" />
                            Dark
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* API Configuration Tab */}
                  {activeTab === 'api' && (
                    <div className="space-y-6">
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">API Configuration</h2>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Anthropic API Key
                        </label>
                        <input
                          type="password"
                          value={settings.api.anthropicKey}
                          onChange={(e) => setSettings(prev => ({
                            ...prev,
                            api: { ...prev.api, anthropicKey: e.target.value }
                          }))}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono"
                          placeholder="sk-ant-..."
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          OpenAI API Key (for Whisper)
                        </label>
                        <input
                          type="password"
                          value={settings.api.openaiKey}
                          onChange={(e) => setSettings(prev => ({
                            ...prev,
                            api: { ...prev.api, openaiKey: e.target.value }
                          }))}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono"
                          placeholder="sk-..."
                        />
                      </div>
                    </div>
                  )}

                  {/* Tools Settings Tab */}
                  {activeTab === 'tools' && (
                    <div className="space-y-6">
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Tools & Features</h2>
                      
                      <div className="space-y-4">
                        <label className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={settings.tools.autoExpandTools}
                            onChange={(e) => setSettings(prev => ({
                              ...prev,
                              tools: { ...prev.tools, autoExpandTools: e.target.checked }
                            }))}
                            className="w-5 h-5 text-blue-600 rounded"
                          />
                          <span className="text-gray-700 dark:text-gray-300">Auto-expand tool results</span>
                        </label>

                        <label className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={settings.tools.showRawParameters}
                            onChange={(e) => setSettings(prev => ({
                              ...prev,
                              tools: { ...prev.tools, showRawParameters: e.target.checked }
                            }))}
                            className="w-5 h-5 text-blue-600 rounded"
                          />
                          <span className="text-gray-700 dark:text-gray-300">Show raw tool parameters</span>
                        </label>
                      </div>
                    </div>
                  )}

                  {/* MCP Servers Tab */}
                  {activeTab === 'mcp' && (
                    <div className="space-y-8">
                      <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                          MCP Servers
                        </h2>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setShowAddServer(true)}
                            className="px-4 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors flex items-center gap-2"
                          >
                            <Plus className="w-4 h-4" />
                            Add Server
                          </button>
                          <button
                            onClick={loadMcpServers}
                            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors flex items-center gap-2"
                            disabled={mcpLoading}
                          >
                            <Sync className={`w-4 h-4 ${mcpLoading ? 'animate-spin' : ''}`} />
                            Refresh
                          </button>
                        </div>
                      </div>

                      {mcpLoading ? (
                        <div className="text-center py-8">
                          <div className="text-gray-500 dark:text-gray-400">Loading MCP servers...</div>
                        </div>
                      ) : mcpServers.length === 0 ? (
                        <div className="text-center py-8 bg-gray-50 dark:bg-gray-900 rounded-lg">
                          <Server className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                          <div className="text-gray-600 dark:text-gray-400">No MCP servers found</div>
                          <div className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                            Run <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">claude mcp list</code> in terminal
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {mcpServers.map((server) => (
                            <div
                              key={server.name}
                              className="p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <h3 className="font-medium text-gray-900 dark:text-white">
                                      {server.name}
                                    </h3>
                                    <span
                                      className={`px-2 py-1 text-xs rounded-full ${
                                        server.status === 'connected'
                                          ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                                          : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
                                      }`}
                                    >
                                      {server.status === 'connected' ? '✓ Connected' : '✗ Failed'}
                                    </span>
                                  </div>
                                  <div className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                                    {server.command}
                                  </div>
                                  {server.statusText && server.statusText !== 'Connected' && (
                                    <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                      {server.statusText}
                                    </div>
                                  )}
                                </div>
                                <button
                                  onClick={() => removeMcpServer(server.name)}
                                  disabled={removingServer === server.name}
                                  className="ml-4 p-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20 rounded-md transition-colors"
                                  title="Remove server"
                                >
                                  {removingServer === server.name ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="w-4 h-4" />
                                  )}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* How to Manage Section */}
                      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                          Managing MCP Servers
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                          Use Claude Code's built-in commands to manage MCP servers:
                        </p>
                        <div className="space-y-2 font-mono text-sm">
                          <div className="p-3 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
                            <span className="text-blue-600 dark:text-blue-400">claude mcp add</span>{' '}
                            <span className="text-gray-600 dark:text-gray-400">&lt;name&gt; &lt;command&gt; [args...]</span>
                            <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">Add a new MCP server</div>
                          </div>
                          <div className="p-3 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
                            <span className="text-blue-600 dark:text-blue-400">claude mcp remove</span>{' '}
                            <span className="text-gray-600 dark:text-gray-400">&lt;name&gt;</span>
                            <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">Remove an MCP server</div>
                          </div>
                          <div className="p-3 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
                            <span className="text-blue-600 dark:text-blue-400">claude mcp list</span>
                            <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">List all configured servers</div>
                          </div>
                        </div>
                      </div>

                      {/* Add Server Modal */}
                      {showAddServer && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-lg">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                              Add New MCP Server
                            </h3>
                            
                            <div className="space-y-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                  Server Name
                                </label>
                                <input
                                  type="text"
                                  value={newServer.name}
                                  onChange={(e) => setNewServer({ ...newServer, name: e.target.value })}
                                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                  placeholder="my-server"
                                  autoFocus
                                />
                              </div>
                              
                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                  Command
                                </label>
                                <input
                                  type="text"
                                  value={newServer.command}
                                  onChange={(e) => setNewServer({ ...newServer, command: e.target.value })}
                                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono"
                                  placeholder="npx my-mcp-server"
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  Full command to run the server (e.g., npx @modelcontextprotocol/server-github)
                                </p>
                              </div>
                              
                              <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                                <p className="text-sm text-blue-800 dark:text-blue-200">
                                  <strong>Examples:</strong><br />
                                  • npx @modelcontextprotocol/server-github<br />
                                  • npx @playwright/mcp@latest<br />
                                  • npx -y coolify-mcp-server
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex justify-end gap-3 mt-6">
                              <button
                                onClick={() => {
                                  setShowAddServer(false);
                                  setNewServer({ name: '', command: '' });
                                }}
                                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={addMcpServer}
                                disabled={addingServer || !newServer.name || !newServer.command}
                                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-md transition-colors flex items-center gap-2"
                              >
                                {addingServer ? (
                                  <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Adding...
                                  </>
                                ) : (
                                  <>
                                    <Plus className="w-4 h-4" />
                                    Add Server
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Slash Commands Tab */}
                  {activeTab === 'slash' && (
                    <div className="space-y-8">
                      <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                          Slash Commands
                        </h2>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setCommandForm({ type: 'user', name: '', category: '', content: '' });
                              setEditingCommand(null);
                              setShowAddCommand(true);
                            }}
                            className="px-4 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors flex items-center gap-2"
                          >
                            <Plus className="w-4 h-4" />
                            Add Command
                          </button>
                          <button
                            onClick={loadSlashCommands}
                            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors flex items-center gap-2"
                            disabled={slashLoading}
                          >
                            <Sync className={`w-4 h-4 ${slashLoading ? 'animate-spin' : ''}`} />
                            Refresh
                          </button>
                        </div>
                      </div>

                      {slashLoading ? (
                        <div className="text-center py-8">
                          <div className="text-gray-500 dark:text-gray-400">Loading slash commands...</div>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          {/* User Commands */}
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                              <User className="w-5 h-5" />
                              Personal Commands
                            </h3>
                            {slashCommands.user.length === 0 ? (
                              <div className="text-gray-500 dark:text-gray-400 text-sm">
                                No personal commands found. Create your first command!
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {slashCommands.user.map((cmd) => (
                                  <div
                                    key={cmd.path}
                                    className="p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg flex items-center justify-between"
                                  >
                                    <div>
                                      <div className="font-medium text-gray-900 dark:text-white">
                                        {cmd.fullCommand}
                                      </div>
                                      {cmd.category && (
                                        <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1">
                                          <FolderOpen className="w-3 h-3" />
                                          {cmd.category}
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => loadCommandContent('user', cmd.path)}
                                        className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900/20 rounded-md transition-colors"
                                        title="Edit command"
                                      >
                                        <Edit className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={() => deleteSlashCommand('user', cmd.path)}
                                        className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20 rounded-md transition-colors"
                                        title="Delete command"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Project Commands */}
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                              <FileText className="w-5 h-5" />
                              Project Commands
                            </h3>
                            {slashCommands.project.length === 0 ? (
                              <div className="text-gray-500 dark:text-gray-400 text-sm">
                                No project commands found. Add commands to .claude/commands/ in your project.
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {slashCommands.project.map((cmd) => (
                                  <div
                                    key={cmd.path}
                                    className="p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg flex items-center justify-between"
                                  >
                                    <div>
                                      <div className="font-medium text-gray-900 dark:text-white">
                                        {cmd.fullCommand}
                                      </div>
                                      {cmd.category && (
                                        <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1">
                                          <FolderOpen className="w-3 h-3" />
                                          {cmd.category}
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => loadCommandContent('project', cmd.path)}
                                        className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900/20 rounded-md transition-colors"
                                        title="Edit command"
                                      >
                                        <Edit className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={() => deleteSlashCommand('project', cmd.path)}
                                        className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20 rounded-md transition-colors"
                                        title="Delete command"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Usage Instructions */}
                          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                              How to Use Slash Commands
                            </h3>
                            <div className="space-y-3 text-sm">
                              <div>
                                <span className="font-medium text-gray-700 dark:text-gray-300">Personal Commands:</span>
                                <p className="text-gray-600 dark:text-gray-400 mt-1">
                                  Stored in <code className="bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded">~/.claude/commands/</code>
                                  <br />Use with <code className="bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded">/user:commandname</code>
                                </p>
                              </div>
                              <div>
                                <span className="font-medium text-gray-700 dark:text-gray-300">Project Commands:</span>
                                <p className="text-gray-600 dark:text-gray-400 mt-1">
                                  Stored in <code className="bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded">.claude/commands/</code>
                                  <br />Use with <code className="bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded">/project:commandname</code>
                                </p>
                              </div>
                              <div>
                                <span className="font-medium text-gray-700 dark:text-gray-300">Arguments:</span>
                                <p className="text-gray-600 dark:text-gray-400 mt-1">
                                  Use <code className="bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded">$ARGUMENTS</code> in your commands
                                  <br />Example: <code className="bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded">/user:find-issue 123</code>
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Add/Edit Command Modal */}
                      {showAddCommand && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                              {editingCommand ? 'Edit' : 'Add New'} Slash Command
                            </h3>
                            
                            <div className="space-y-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                  Command Type
                                </label>
                                <div className="flex gap-4">
                                  <label className="flex items-center gap-2">
                                    <input
                                      type="radio"
                                      name="type"
                                      value="user"
                                      checked={commandForm.type === 'user'}
                                      onChange={(e) => setCommandForm({ ...commandForm, type: e.target.value })}
                                      className="text-blue-600"
                                      disabled={editingCommand}
                                    />
                                    <span className="text-gray-700 dark:text-gray-300">Personal</span>
                                  </label>
                                  <label className="flex items-center gap-2">
                                    <input
                                      type="radio"
                                      name="type"
                                      value="project"
                                      checked={commandForm.type === 'project'}
                                      onChange={(e) => setCommandForm({ ...commandForm, type: e.target.value })}
                                      className="text-blue-600"
                                      disabled={editingCommand}
                                    />
                                    <span className="text-gray-700 dark:text-gray-300">Project</span>
                                  </label>
                                </div>
                              </div>
                              
                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                  Command Name
                                </label>
                                <input
                                  type="text"
                                  value={commandForm.name}
                                  onChange={(e) => setCommandForm({ ...commandForm, name: e.target.value })}
                                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                  placeholder="my-command"
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  Access with /{commandForm.type}:{commandForm.category ? commandForm.category + ':' : ''}{commandForm.name || 'commandname'}
                                </p>
                              </div>
                              
                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                  Category (Optional)
                                </label>
                                <input
                                  type="text"
                                  value={commandForm.category}
                                  onChange={(e) => setCommandForm({ ...commandForm, category: e.target.value })}
                                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                  placeholder="frontend, backend, utils, etc."
                                />
                              </div>
                              
                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                  Command Content (Markdown)
                                </label>
                                <textarea
                                  value={commandForm.content}
                                  onChange={(e) => setCommandForm({ ...commandForm, content: e.target.value })}
                                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono"
                                  rows="10"
                                  placeholder="# Command Title&#10;&#10;Your command instructions here...&#10;&#10;Use $ARGUMENTS for dynamic input"
                                />
                              </div>
                              
                              <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                                <p className="text-sm text-blue-800 dark:text-blue-200">
                                  <strong>Example Command:</strong><br />
                                  # Fix Issue<br />
                                  Please help me fix issue #$ARGUMENTS<br />
                                  - Check the issue details<br />
                                  - Analyze the problem<br />
                                  - Provide a solution
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex justify-end gap-3 mt-6">
                              <button
                                onClick={() => {
                                  setShowAddCommand(false);
                                  setEditingCommand(null);
                                  setCommandForm({ type: 'user', name: '', category: '', content: '' });
                                }}
                                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={saveSlashCommand}
                                disabled={!commandForm.name || !commandForm.content}
                                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-md transition-colors"
                              >
                                {editingCommand ? 'Update' : 'Create'} Command
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Advanced Settings Tab */}
                  {activeTab === 'advanced' && (
                    <div className="space-y-6">
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Advanced Settings</h2>
                      
                      <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium">
                              Caution: Advanced Settings
                            </p>
                            <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                              These settings are for advanced users. Changing them may affect application performance or behavior.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Custom API Endpoint
                        </label>
                        <input
                          type="url"
                          value={settings.api.endpoint}
                          onChange={(e) => setSettings(prev => ({
                            ...prev,
                            api: { ...prev.api, endpoint: e.target.value }
                          }))}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono"
                          placeholder="https://api.anthropic.com"
                        />
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          Leave empty to use default Anthropic API endpoint
                        </p>
                      </div>

                      <div>
                        <button
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
                          onClick={() => {
                            if (confirm('Are you sure you want to reset all settings to defaults?')) {
                              localStorage.clear();
                              window.location.reload();
                            }
                          }}
                        >
                          Reset All Settings
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Add missing icon imports that were referenced
const Sun = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const Moon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
  </svg>
);

export default SettingsPage; 