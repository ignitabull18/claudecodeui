import React, { useState, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { 
  X, Plus, Play, Square, Settings, Globe, Server, Wrench, Shield, 
  CheckCircle, XCircle, AlertTriangle, Clock, Loader2, RefreshCw,
  Database, Search, Code, Image, FileText, Terminal, Zap, Link2,
  Eye, EyeOff, Edit3, Trash2, Download, Upload, Copy, ExternalLink,
  Activity, BarChart3, Network, Box, Puzzle, Layers, Target, Hash
} from 'lucide-react';

// MCP Server Categories
const MCP_CATEGORIES = {
  DATABASE: 'database',
  WEB: 'web',
  DEVELOPMENT: 'development',
  AUTOMATION: 'automation',
  AI: 'ai',
  UTILITIES: 'utilities'
};

// Popular MCP Servers Registry
const POPULAR_MCP_SERVERS = {
  puppeteer: {
    name: 'Puppeteer MCP',
    description: 'Browser automation and web scraping',
    category: MCP_CATEGORIES.WEB,
    icon: Globe,
    install: 'npx @modelcontextprotocol/server-puppeteer',
    config: {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-puppeteer']
    },
    tools: ['navigate', 'click', 'type', 'screenshot', 'extract_text'],
    popular: true
  },
  postgres: {
    name: 'PostgreSQL MCP',
    description: 'Database queries and management',
    category: MCP_CATEGORIES.DATABASE,
    icon: Database,
    install: 'npx @modelcontextprotocol/server-postgres',
    config: {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-postgres'],
      env: { DATABASE_URL: 'postgresql://user:password@localhost:5432/db' }
    },
    tools: ['query', 'schema', 'explain', 'vacuum'],
    popular: true
  },
  filesystem: {
    name: 'File System MCP',
    description: 'File operations and directory management',
    category: MCP_CATEGORIES.UTILITIES,
    icon: FileText,
    install: 'npx @modelcontextprotocol/server-filesystem',
    config: {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-filesystem', '/allowed/path']
    },
    tools: ['read_file', 'write_file', 'list_directory', 'create_directory'],
    popular: true
  },
  search: {
    name: 'Web Search MCP',
    description: 'Real-time web search and information retrieval',
    category: MCP_CATEGORIES.WEB,
    icon: Search,
    install: 'npx @modelcontextprotocol/server-search',
    config: {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-search'],
      env: { SEARCH_API_KEY: 'your-api-key' }
    },
    tools: ['web_search', 'news_search', 'image_search'],
    popular: true
  }
};

const SERVER_STATUS = {
  STOPPED: 'stopped',
  STARTING: 'starting', 
  RUNNING: 'running',
  ERROR: 'error'
};

function MCPManager({ isOpen, onClose, selectedProject, currentSession }) {
  const [activeTab, setActiveTab] = useState('servers');
  const [servers, setServers] = useState({});
  const [tools, setTools] = useState({});
  const [serverStates, setServerStates] = useState({});
  const [selectedServer, setSelectedServer] = useState(null);
  const [showAddServer, setShowAddServer] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [permissions, setPermissions] = useState({});
  const [mcpConfig, setMcpConfig] = useState({});

  // Load MCP servers and configuration
  const loadMCPData = useCallback(async () => {
    setLoading(true);
    try {
      const [serversRes, toolsRes, permissionsRes, configRes] = await Promise.all([
        fetch('/api/mcp/servers'),
        fetch('/api/mcp/tools'),
        fetch('/api/mcp/permissions'),
        fetch('/api/mcp/config')
      ]);

      if (serversRes.ok) {
        const serversData = await serversRes.json();
        setServers(serversData.servers || {});
        setServerStates(serversData.states || {});
      }

      if (toolsRes.ok) {
        const toolsData = await toolsRes.json();
        setTools(toolsData.tools || {});
      }

      if (permissionsRes.ok) {
        const permissionsData = await permissionsRes.json();
        setPermissions(permissionsData.permissions || {});
      }

      if (configRes.ok) {
        const configData = await configRes.json();
        setMcpConfig(configData.config || {});
      }
    } catch (error) {
      console.error('Failed to load MCP data:', error);
    }
    setLoading(false);
  }, []);

  // Start MCP server
  const startServer = async (serverId) => {
    try {
      setServerStates(prev => ({ ...prev, [serverId]: SERVER_STATUS.STARTING }));
      
      const response = await fetch(`/api/mcp/servers/${serverId}/start`, {
        method: 'POST'
      });

      if (response.ok) {
        const result = await response.json();
        setServerStates(prev => ({ 
          ...prev, 
          [serverId]: result.success ? SERVER_STATUS.RUNNING : SERVER_STATUS.ERROR 
        }));
        await loadMCPData(); // Refresh tools
      }
    } catch (error) {
      console.error('Failed to start server:', error);
      setServerStates(prev => ({ ...prev, [serverId]: SERVER_STATUS.ERROR }));
    }
  };

  // Stop MCP server
  const stopServer = async (serverId) => {
    try {
      const response = await fetch(`/api/mcp/servers/${serverId}/stop`, {
        method: 'POST'
      });

      if (response.ok) {
        setServerStates(prev => ({ ...prev, [serverId]: SERVER_STATUS.STOPPED }));
        await loadMCPData(); // Refresh tools
      }
    } catch (error) {
      console.error('Failed to stop server:', error);
    }
  };

  // Add new MCP server
  const addServer = async (serverConfig) => {
    try {
      const response = await fetch('/api/mcp/servers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(serverConfig)
      });

      if (response.ok) {
        await loadMCPData();
        setShowAddServer(false);
      }
    } catch (error) {
      console.error('Failed to add server:', error);
    }
  };

  // Execute MCP tool
  const executeTool = async (serverId, toolName, params = {}) => {
    try {
      const response = await fetch('/api/mcp/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serverId,
          tool: toolName,
          params,
          sessionId: currentSession?.id
        })
      });

      if (response.ok) {
        const result = await response.json();
        return result;
      }
    } catch (error) {
      console.error('Failed to execute tool:', error);
      throw error;
    }
  };

  // Update permissions
  const updatePermissions = async (serverId, toolName, allowed) => {
    try {
      const response = await fetch('/api/mcp/permissions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serverId,
          toolName,
          allowed,
          projectId: selectedProject?.id
        })
      });

      if (response.ok) {
        setPermissions(prev => ({
          ...prev,
          [`${serverId}:${toolName}`]: allowed
        }));
      }
    } catch (error) {
      console.error('Failed to update permissions:', error);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadMCPData();
    }
  }, [isOpen, loadMCPData]);

  // Filter servers based on search and category
  const filteredPopularServers = Object.entries(POPULAR_MCP_SERVERS).filter(([id, server]) => {
    const matchesSearch = searchQuery === '' || 
      server.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      server.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = filterCategory === 'all' || server.category === filterCategory;
    
    return matchesSearch && matchesCategory;
  });

  const getServerStatus = (serverId) => {
    return serverStates[serverId] || SERVER_STATUS.STOPPED;
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case SERVER_STATUS.RUNNING: return CheckCircle;
      case SERVER_STATUS.STARTING: return Loader2;
      case SERVER_STATUS.ERROR: return XCircle;
      default: return Clock;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case SERVER_STATUS.RUNNING: return 'text-green-600';
      case SERVER_STATUS.STARTING: return 'text-blue-600';
      case SERVER_STATUS.ERROR: return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop fixed inset-0 flex items-center justify-center z-[100] md:p-4 bg-background/95">
      <div className="bg-background border border-border md:rounded-lg shadow-xl w-full md:max-w-7xl h-full md:h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <Network className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
            <div>
              <h2 className="text-lg md:text-xl font-semibold text-foreground">
                MCP Manager
              </h2>
              <p className="text-sm text-muted-foreground">
                Model Context Protocol - External Tools & Servers
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadMCPData}
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
            { id: 'servers', label: 'Servers', icon: Server },
            { id: 'tools', label: 'Tools', icon: Wrench },
            { id: 'permissions', label: 'Permissions', icon: Shield },
            { id: 'registry', label: 'Registry', icon: Box }
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
          {/* Servers Tab */}
          {activeTab === 'servers' && (
            <div className="flex-1 flex flex-col">
              <div className="p-6 border-b border-border">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">MCP Servers</h3>
                  <Button onClick={() => setShowAddServer(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Server
                  </Button>
                </div>
                
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search servers..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <ScrollArea className="flex-1">
                <div className="p-6 space-y-4">
                  {Object.entries(servers).length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Server className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <h3 className="text-lg font-medium mb-2">No MCP Servers</h3>
                      <p>Add MCP servers to extend Claude's capabilities</p>
                      <Button 
                        className="mt-4"
                        onClick={() => setShowAddServer(true)}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Your First Server
                      </Button>
                    </div>
                  ) : (
                    Object.entries(servers).map(([id, server]) => {
                      const status = getServerStatus(id);
                      const StatusIcon = getStatusIcon(status);
                      const statusColor = getStatusColor(status);
                      
                      return (
                        <div
                          key={id}
                          className="p-4 border border-border rounded-lg hover:bg-muted/30 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3 flex-1">
                              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Server className="w-5 h-5 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-medium">{server.name}</h4>
                                  <StatusIcon className={`w-4 h-4 ${statusColor}`} />
                                  <Badge variant="outline" className="text-xs">
                                    {status}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground mb-2">
                                  {server.description}
                                </p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <span>Tools: {server.tools?.length || 0}</span>
                                  <span>•</span>
                                  <span>Category: {server.category}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {status === SERVER_STATUS.RUNNING ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => stopServer(id)}
                                >
                                                        <Square className="w-4 h-4 mr-2" />
                      Stop
                                </Button>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => startServer(id)}
                                  disabled={status === SERVER_STATUS.STARTING}
                                >
                                  {status === SERVER_STATUS.STARTING ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  ) : (
                                    <Play className="w-4 h-4 mr-2" />
                                  )}
                                  {status === SERVER_STATUS.STARTING ? 'Starting...' : 'Start'}
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedServer(server)}
                              >
                                <Settings className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Tools Tab */}
          {activeTab === 'tools' && (
            <div className="flex-1 flex flex-col">
              <div className="p-6 border-b border-border">
                <h3 className="text-lg font-semibold mb-4">Available Tools</h3>
                <div className="text-sm text-muted-foreground">
                  Tools provided by running MCP servers
                </div>
              </div>

              <ScrollArea className="flex-1">
                <div className="p-6">
                  {Object.keys(tools).length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Wrench className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <h3 className="text-lg font-medium mb-2">No Tools Available</h3>
                      <p>Start MCP servers to access their tools</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {Object.entries(tools).map(([toolId, tool]) => (
                        <ToolCard
                          key={toolId}
                          tool={tool}
                          onExecute={(params) => executeTool(tool.serverId, tool.name, params)}
                          permission={permissions[`${tool.serverId}:${tool.name}`]}
                          onPermissionChange={(allowed) => 
                            updatePermissions(tool.serverId, tool.name, allowed)
                          }
                        />
                      ))}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Permissions Tab */}
          {activeTab === 'permissions' && (
            <PermissionsManager
              permissions={permissions}
              tools={tools}
              servers={servers}
              onUpdatePermission={updatePermissions}
            />
          )}

          {/* Registry Tab */}
          {activeTab === 'registry' && (
            <div className="flex-1 flex flex-col">
              <div className="p-6 border-b border-border">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">MCP Server Registry</h3>
                  <div className="flex items-center gap-2">
                    <select
                      value={filterCategory}
                      onChange={(e) => setFilterCategory(e.target.value)}
                      className="p-2 border border-border rounded-md bg-background text-sm"
                    >
                      <option value="all">All Categories</option>
                      {Object.entries(MCP_CATEGORIES).map(([key, value]) => (
                        <option key={key} value={value}>
                          {key.charAt(0) + key.slice(1).toLowerCase()}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search popular servers..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <ScrollArea className="flex-1">
                <div className="p-6 space-y-4">
                  {filteredPopularServers.map(([id, server]) => {
                    const Icon = server.icon;
                    const isInstalled = servers[id];
                    
                    return (
                      <div
                        key={id}
                        className="p-4 border border-border rounded-lg hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Icon className="w-6 h-6 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-medium">{server.name}</h4>
                              {server.popular && (
                                <Badge variant="secondary" className="text-xs">
                                  Popular
                                </Badge>
                              )}
                              {isInstalled && (
                                <Badge variant="outline" className="text-xs text-green-600">
                                  Installed
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mb-3">
                              {server.description}
                            </p>
                            <div className="flex flex-wrap gap-2 mb-3">
                              {server.tools.map(tool => (
                                <Badge key={tool} variant="outline" className="text-xs">
                                  {tool}
                                </Badge>
                              ))}
                            </div>
                            <div className="text-xs text-muted-foreground font-mono bg-muted/50 p-2 rounded">
                              {server.install}
                            </div>
                          </div>
                          <div className="flex flex-col gap-2">
                            <Button
                              variant={isInstalled ? "outline" : "default"}
                              size="sm"
                              onClick={() => addServer({ id, ...server })}
                              disabled={isInstalled}
                            >
                              {isInstalled ? 'Installed' : 'Install'}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(`https://github.com/modelcontextprotocol/servers/tree/main/${id}`, '_blank')}
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        {/* Add Server Modal */}
        {showAddServer && (
          <AddServerModal
            onClose={() => setShowAddServer(false)}
            onAdd={addServer}
          />
        )}

        {/* Server Details Modal */}
        {selectedServer && (
          <ServerDetailsModal
            server={selectedServer}
            onClose={() => setSelectedServer(null)}
            onUpdate={loadMCPData}
          />
        )}
      </div>
    </div>
  );
}

// Tool Card Component
function ToolCard({ tool, onExecute, permission, onPermissionChange }) {
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState(null);
  const [showParams, setShowParams] = useState(false);

  const handleExecute = async (params = {}) => {
    setExecuting(true);
    try {
      const result = await onExecute(params);
      setResult(result);
    } catch (error) {
      setResult({ error: error.message });
    }
    setExecuting(false);
  };

  return (
    <div className="p-4 border border-border rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium">{tool.name}</h4>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onPermissionChange(!permission)}
            className={permission ? 'text-green-600' : 'text-red-600'}
          >
            {permission ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </Button>
        </div>
      </div>
      <p className="text-sm text-muted-foreground mb-3">{tool.description}</p>
      
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={() => handleExecute()}
          disabled={executing || !permission}
        >
          {executing ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Play className="w-4 h-4 mr-2" />
          )}
          Execute
        </Button>
        {tool.parameters && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowParams(!showParams)}
          >
            <Settings className="w-4 h-4 mr-2" />
            Params
          </Button>
        )}
      </div>

      {result && (
        <div className="mt-3 p-2 bg-muted/50 rounded text-xs">
          <pre className="whitespace-pre-wrap">{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

// Permissions Manager Component
function PermissionsManager({ permissions, tools, servers, onUpdatePermission }) {
  return (
    <div className="flex-1 flex flex-col">
      <div className="p-6 border-b border-border">
        <h3 className="text-lg font-semibold mb-2">Tool Permissions</h3>
        <p className="text-sm text-muted-foreground">
          Manage which tools Claude can access and execute
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {Object.entries(servers).map(([serverId, server]) => (
            <div key={serverId} className="border border-border rounded-lg p-4">
              <h4 className="font-medium mb-3">{server.name}</h4>
              <div className="space-y-2">
                {Object.entries(tools)
                  .filter(([, tool]) => tool.serverId === serverId)
                  .map(([toolId, tool]) => {
                    const permissionKey = `${serverId}:${tool.name}`;
                    const allowed = permissions[permissionKey];
                    
                    return (
                      <div key={toolId} className="flex items-center justify-between p-2 rounded hover:bg-muted/30">
                        <div>
                          <span className="font-medium text-sm">{tool.name}</span>
                          <p className="text-xs text-muted-foreground">{tool.description}</p>
                        </div>
                        <Button
                          variant={allowed ? "default" : "outline"}
                          size="sm"
                          onClick={() => onUpdatePermission(serverId, tool.name, !allowed)}
                        >
                          {allowed ? 'Allowed' : 'Blocked'}
                        </Button>
                      </div>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

// Add Server Modal Component
function AddServerModal({ onClose, onAdd }) {
  const [serverConfig, setServerConfig] = useState({
    name: '',
    command: '',
    args: [],
    env: {},
    description: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onAdd(serverConfig);
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-background border border-border rounded-lg shadow-xl w-full max-w-2xl m-4">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h3 className="text-lg font-semibold">Add MCP Server</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Server Name</label>
            <Input
              value={serverConfig.name}
              onChange={(e) => setServerConfig(prev => ({ ...prev, name: e.target.value }))}
              placeholder="My MCP Server"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Command</label>
            <Input
              value={serverConfig.command}
              onChange={(e) => setServerConfig(prev => ({ ...prev, command: e.target.value }))}
              placeholder="npx"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Arguments (one per line)</label>
            <textarea
              value={serverConfig.args.join('\n')}
              onChange={(e) => setServerConfig(prev => ({ 
                ...prev, 
                args: e.target.value.split('\n').filter(arg => arg.trim()) 
              }))}
              placeholder="-y&#10;@modelcontextprotocol/server-example"
              className="w-full p-2 border border-border rounded-md bg-background h-24 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <Input
              value={serverConfig.description}
              onChange={(e) => setServerConfig(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Server description..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Add Server</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Server Details Modal Component
function ServerDetailsModal({ server, onClose, onUpdate }) {
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-background border border-border rounded-lg shadow-xl w-full max-w-2xl m-4">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h3 className="text-lg font-semibold">{server.name}</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <p className="text-sm text-muted-foreground">{server.description}</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Command</label>
              <code className="text-sm bg-muted/50 p-2 rounded block">
                {server.command} {server.args?.join(' ')}
              </code>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Tools</label>
              <div className="flex flex-wrap gap-2">
                {server.tools?.map(tool => (
                  <Badge key={tool} variant="outline" className="text-xs">
                    {tool}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MCPManager; 