import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { 
  X, 
  Save, 
  RefreshCw, 
  Settings, 
  Shield, 
  AlertTriangle, 
  Server, 
  Edit3, 
  Trash2, 
  Play, 
  Globe, 
  Terminal, 
  Zap,
  Plus,
  Eye,
  EyeOff,
  BarChart3,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Activity,
  Wrench,
  Database,
  Network,
  HardDrive,
  Cpu,
  Search,
  Filter,
  Download,
  Upload,
  Copy,
  Check
} from 'lucide-react';

const TOOL_CATEGORIES = {
  'system': { name: 'System Tools', icon: Cpu, color: 'blue' },
  'file': { name: 'File Operations', icon: HardDrive, color: 'green' },
  'network': { name: 'Network & Web', icon: Network, color: 'purple' },
  'database': { name: 'Database', icon: Database, color: 'orange' },
  'development': { name: 'Development', icon: Wrench, color: 'red' },
  'mcp': { name: 'MCP Servers', icon: Server, color: 'indigo' }
};

const PERMISSION_LEVELS = {
  'allowed': { name: 'Always Allow', color: 'green', icon: CheckCircle },
  'prompt': { name: 'Ask Permission', color: 'yellow', icon: AlertCircle },
  'restricted': { name: 'Restricted Access', color: 'orange', icon: AlertTriangle },
  'blocked': { name: 'Always Block', color: 'red', icon: XCircle }
};

function AdvancedToolManager({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('permissions');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  
  // Tool management state
  const [availableTools, setAvailableTools] = useState([]);
  const [toolPermissions, setToolPermissions] = useState({});
  const [toolConfigurations, setToolConfigurations] = useState({});
  const [toolUsageStats, setToolUsageStats] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedPermissionLevel, setSelectedPermissionLevel] = useState('all');
  
  // MCP management state
  const [mcpServers, setMcpServers] = useState([]);
  const [showMcpDetails, setShowMcpDetails] = useState({});
  const [mcpServerStats, setMcpServerStats] = useState({});
  
  // Analytics state
  const [analyticsData, setAnalyticsData] = useState({
    totalToolCalls: 0,
    mostUsedTools: [],
    recentActivity: [],
    errorRate: 0,
    avgResponseTime: 0
  });
  const [analyticsTimeRange, setAnalyticsTimeRange] = useState('7d');
  
  // Configuration editing state
  const [editingTool, setEditingTool] = useState(null);
  const [editingConfig, setEditingConfig] = useState({});

  useEffect(() => {
    if (isOpen) {
      loadToolData();
      loadMcpServers();
      loadAnalytics();
    }
  }, [isOpen]);

  const loadToolData = async () => {
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/api/tools/advanced', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAvailableTools(data.tools || []);
        setToolPermissions(data.permissions || {});
        setToolConfigurations(data.configurations || {});
        setToolUsageStats(data.usageStats || {});
      }
    } catch (error) {
      console.error('Error loading tool data:', error);
    }
  };

  const loadMcpServers = async () => {
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/api/mcp/advanced', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setMcpServers(data.servers || []);
        setMcpServerStats(data.stats || {});
      }
    } catch (error) {
      console.error('Error loading MCP servers:', error);
    }
  };

  const loadAnalytics = async () => {
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`/api/tools/analytics?timeRange=${analyticsTimeRange}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAnalyticsData(data);
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
  };

  const saveToolPermissions = async () => {
    setIsSaving(true);
    setSaveStatus(null);

    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/api/tools/permissions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          permissions: toolPermissions,
          configurations: toolConfigurations
        })
      });

      if (response.ok) {
        setSaveStatus('success');
        setTimeout(() => onClose(), 1000);
      } else {
        setSaveStatus('error');
      }
    } catch (error) {
      console.error('Error saving tool permissions:', error);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  const updateToolPermission = (toolId, permission) => {
    setToolPermissions(prev => ({
      ...prev,
      [toolId]: permission
    }));
  };

  const updateToolConfiguration = (toolId, config) => {
    setToolConfigurations(prev => ({
      ...prev,
      [toolId]: config
    }));
  };

  const resetToolToDefaults = (toolId) => {
    setToolPermissions(prev => {
      const newPermissions = { ...prev };
      delete newPermissions[toolId];
      return newPermissions;
    });
    setToolConfigurations(prev => {
      const newConfigurations = { ...prev };
      delete newConfigurations[toolId];
      return newConfigurations;
    });
  };

  const exportConfiguration = () => {
    const config = {
      permissions: toolPermissions,
      configurations: toolConfigurations,
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };

    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tool-configuration.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const importConfiguration = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const config = JSON.parse(text);
      
      if (config.permissions) {
        setToolPermissions(config.permissions);
      }
      if (config.configurations) {
        setToolConfigurations(config.configurations);
      }
      
      setSaveStatus('imported');
    } catch (error) {
      console.error('Error importing configuration:', error);
      setSaveStatus('error');
    }
  };

  const filteredTools = availableTools.filter(tool => {
    const matchesSearch = !searchQuery || 
      tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || tool.category === selectedCategory;
    
    const currentPermission = toolPermissions[tool.id] || 'prompt';
    const matchesPermission = selectedPermissionLevel === 'all' || currentPermission === selectedPermissionLevel;
    
    return matchesSearch && matchesCategory && matchesPermission;
  });

  const getToolIcon = (category) => {
    const categoryInfo = TOOL_CATEGORIES[category] || TOOL_CATEGORIES.system;
    const IconComponent = categoryInfo.icon;
    return <IconComponent className="w-4 h-4" />;
  };

  const getPermissionBadge = (permission) => {
    const permissionInfo = PERMISSION_LEVELS[permission] || PERMISSION_LEVELS.prompt;
    const IconComponent = permissionInfo.icon;
    
    return (
      <Badge className={`bg-${permissionInfo.color}-100 text-${permissionInfo.color}-800 border-${permissionInfo.color}-200`}>
        <IconComponent className="w-3 h-3 mr-1" />
        {permissionInfo.name}
      </Badge>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-7xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Wrench className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Advanced Tool Management
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Configure tools, permissions, and monitor usage
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="flex px-6">
            {[
              { id: 'permissions', label: 'Tool Permissions', icon: Shield },
              { id: 'configurations', label: 'Tool Configurations', icon: Settings },
              { id: 'mcp', label: 'MCP Servers', icon: Server },
              { id: 'analytics', label: 'Usage Analytics', icon: BarChart3 }
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
          {/* Tool Permissions Tab */}
          {activeTab === 'permissions' && (
            <div className="space-y-6">
              {/* Filters and Search */}
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex-1 min-w-64">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Search tools..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                >
                  <option value="all">All Categories</option>
                  {Object.entries(TOOL_CATEGORIES).map(([key, category]) => (
                    <option key={key} value={key}>{category.name}</option>
                  ))}
                </select>

                <select
                  value={selectedPermissionLevel}
                  onChange={(e) => setSelectedPermissionLevel(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                >
                  <option value="all">All Permissions</option>
                  {Object.entries(PERMISSION_LEVELS).map(([key, permission]) => (
                    <option key={key} value={key}>{permission.name}</option>
                  ))}
                </select>

                <Button variant="outline" onClick={() => loadToolData()}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </div>

              {/* Tools List */}
              <div className="grid gap-4">
                {filteredTools.map((tool) => {
                  const currentPermission = toolPermissions[tool.id] || 'prompt';
                  const usageStats = toolUsageStats[tool.id] || { calls: 0, lastUsed: null, avgResponseTime: 0 };
                  
                  return (
                    <div
                      key={tool.id}
                      className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                            {getToolIcon(tool.category)}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-medium text-gray-900 dark:text-white">
                                {tool.name}
                              </h3>
                              {getPermissionBadge(currentPermission)}
                            </div>
                            
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                              {tool.description}
                            </p>
                            
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Activity className="w-3 h-3" />
                                {usageStats.calls} calls
                              </span>
                              {usageStats.lastUsed && (
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  Last used {new Date(usageStats.lastUsed).toLocaleDateString()}
                                </span>
                              )}
                              {usageStats.avgResponseTime > 0 && (
                                <span className="flex items-center gap-1">
                                  <Zap className="w-3 h-3" />
                                  {usageStats.avgResponseTime}ms avg
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Permission Controls */}
                        <div className="flex items-center gap-2 ml-4">
                          <select
                            value={currentPermission}
                            onChange={(e) => updateToolPermission(tool.id, e.target.value)}
                            className="text-sm px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                          >
                            {Object.entries(PERMISSION_LEVELS).map(([key, permission]) => (
                              <option key={key} value={key}>{permission.name}</option>
                            ))}
                          </select>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingTool(tool);
                              setEditingConfig(toolConfigurations[tool.id] || {});
                            }}
                          >
                            <Settings className="w-3 h-3" />
                          </Button>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => resetToolToDefaults(tool.id)}
                            title="Reset to defaults"
                          >
                            <RefreshCw className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {filteredTools.length === 0 && (
                <div className="text-center py-12">
                  <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No tools found
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Try adjusting your search or filter criteria
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Tool Configurations Tab */}
          {activeTab === 'configurations' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Tool Configurations
                </h3>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={exportConfiguration}>
                    <Download className="w-4 h-4 mr-2" />
                    Export Config
                  </Button>
                  <Button variant="outline" onClick={() => document.getElementById('import-config').click()}>
                    <Upload className="w-4 h-4 mr-2" />
                    Import Config
                  </Button>
                  <input
                    id="import-config"
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={importConfiguration}
                  />
                </div>
              </div>

              <div className="grid gap-4">
                {Object.entries(toolConfigurations).map(([toolId, config]) => {
                  const tool = availableTools.find(t => t.id === toolId);
                  if (!tool) return null;
                  
                  return (
                    <div
                      key={toolId}
                      className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {getToolIcon(tool.category)}
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            {tool.name}
                          </h4>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingTool(tool);
                            setEditingConfig(config);
                          }}
                        >
                          <Edit3 className="w-3 h-3 mr-1" />
                          Edit
                        </Button>
                      </div>
                      
                      <div className="bg-gray-50 dark:bg-gray-700 rounded p-3">
                        <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                          {JSON.stringify(config, null, 2)}
                        </pre>
                      </div>
                    </div>
                  );
                })}
              </div>

              {Object.keys(toolConfigurations).length === 0 && (
                <div className="text-center py-12">
                  <Settings className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No custom configurations
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Configure tools from the Permissions tab to see their settings here
                  </p>
                </div>
              )}
            </div>
          )}

          {/* MCP Servers Tab */}
          {activeTab === 'mcp' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  MCP Server Management
                </h3>
                <Button onClick={() => loadMcpServers()}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh Servers
                </Button>
              </div>

              <div className="grid gap-4">
                {mcpServers.map((server) => {
                  const stats = mcpServerStats[server.id] || { tools: 0, uptime: 0, lastSeen: null };
                  const isExpanded = showMcpDetails[server.id];
                  
                  return (
                    <div
                      key={server.id}
                      className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                            <Server className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-white">
                              {server.name}
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {server.type} • {stats.tools} tools
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Badge variant={stats.lastSeen ? 'default' : 'secondary'}>
                            {stats.lastSeen ? 'Active' : 'Inactive'}
                          </Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowMcpDetails(prev => ({
                              ...prev,
                              [server.id]: !prev[server.id]
                            }))}
                          >
                            {isExpanded ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </Button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-gray-600 dark:text-gray-400">Uptime:</span>
                              <div className="font-mono">{Math.floor(stats.uptime / 3600)}h</div>
                            </div>
                            <div>
                              <span className="text-gray-600 dark:text-gray-400">Tools:</span>
                              <div className="font-mono">{stats.tools}</div>
                            </div>
                            <div>
                              <span className="text-gray-600 dark:text-gray-400">Type:</span>
                              <div className="font-mono">{server.type}</div>
                            </div>
                            <div>
                              <span className="text-gray-600 dark:text-gray-400">Status:</span>
                              <div className="font-mono">{stats.lastSeen ? 'Online' : 'Offline'}</div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Usage Analytics
                </h3>
                <select
                  value={analyticsTimeRange}
                  onChange={(e) => {
                    setAnalyticsTimeRange(e.target.value);
                    loadAnalytics();
                  }}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                >
                  <option value="1d">Last 24 hours</option>
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                  <option value="90d">Last 90 days</option>
                </select>
              </div>

              {/* Analytics Overview */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900 dark:text-blue-300">
                      Total Tool Calls
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-blue-900 dark:text-blue-300">
                    {analyticsData.totalToolCalls.toLocaleString()}
                  </div>
                </div>

                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-green-900 dark:text-green-300">
                      Success Rate
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-green-900 dark:text-green-300">
                    {((1 - analyticsData.errorRate) * 100).toFixed(1)}%
                  </div>
                </div>

                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-4 h-4 text-purple-600" />
                    <span className="text-sm font-medium text-purple-900 dark:text-purple-300">
                      Avg Response Time
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-purple-900 dark:text-purple-300">
                    {analyticsData.avgResponseTime}ms
                  </div>
                </div>

                <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Wrench className="w-4 h-4 text-orange-600" />
                    <span className="text-sm font-medium text-orange-900 dark:text-orange-300">
                      Active Tools
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-orange-900 dark:text-orange-300">
                    {analyticsData.mostUsedTools.length}
                  </div>
                </div>
              </div>

              {/* Most Used Tools */}
              <div>
                <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Most Used Tools
                </h4>
                <div className="space-y-2">
                  {analyticsData.mostUsedTools.slice(0, 10).map((tool, index) => (
                    <div
                      key={tool.id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-gray-500 w-6">
                          #{index + 1}
                        </span>
                        {getToolIcon(tool.category)}
                        <span className="font-medium text-gray-900 dark:text-white">
                          {tool.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <span>{tool.calls} calls</span>
                        <span>{tool.avgResponseTime}ms avg</span>
                        <div className="w-24 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ 
                              width: `${(tool.calls / analyticsData.mostUsedTools[0]?.calls * 100) || 0}%` 
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Activity */}
              <div>
                <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Recent Activity
                </h4>
                <div className="space-y-2">
                  {analyticsData.recentActivity.slice(0, 20).map((activity, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-600 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {activity.success ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-600" />
                        )}
                        <span className="font-medium text-gray-900 dark:text-white">
                          {activity.toolName}
                        </span>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {activity.responseTime}ms
                        </span>
                      </div>
                      <span className="text-sm text-gray-500">
                        {new Date(activity.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            {saveStatus === 'success' && (
              <span className="text-sm text-green-600 flex items-center gap-1">
                <Check className="w-4 h-4" />
                Settings saved!
              </span>
            )}
            {saveStatus === 'imported' && (
              <span className="text-sm text-blue-600 flex items-center gap-1">
                <Upload className="w-4 h-4" />
                Configuration imported!
              </span>
            )}
            {saveStatus === 'error' && (
              <span className="text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                Error saving settings
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancel
            </Button>
            
            <Button
              onClick={saveToolPermissions}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Tool Configuration Modal */}
        {editingTool && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Configure {editingTool.name}
                </h3>
                <button
                  onClick={() => setEditingTool(null)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="flex-1 p-4 overflow-y-auto">
                <textarea
                  value={JSON.stringify(editingConfig, null, 2)}
                  onChange={(e) => {
                    try {
                      const config = JSON.parse(e.target.value);
                      setEditingConfig(config);
                    } catch (error) {
                      // Invalid JSON, ignore
                    }
                  }}
                  rows="15"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
                  placeholder="Enter tool configuration as JSON..."
                />
              </div>
              
              <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
                <Button
                  variant="outline"
                  onClick={() => setEditingTool(null)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    updateToolConfiguration(editingTool.id, editingConfig);
                    setEditingTool(null);
                  }}
                >
                  Save Configuration
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdvancedToolManager; 