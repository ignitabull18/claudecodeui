import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { 
  X,
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Clock,
  MessageSquare,
  Zap,
  Target,
  Activity,
  Users,
  Calendar,
  Download,
  RefreshCw,
  Filter,
  Settings,
  Eye,
  EyeOff,
  PieChart,
  LineChart,
  AreaChart,
  Database,
  Cpu,
  Code,
  GitBranch,
  FileText,
  Search,
  Play,
  Pause,
  AlertTriangle,
  CheckCircle,
  Info,
  Globe,
  Layers,
  Hash,
  Timer,
  Gauge
} from 'lucide-react';

const TIME_RANGES = {
  '24h': { label: 'Last 24 Hours', hours: 24 },
  '7d': { label: 'Last 7 Days', hours: 24 * 7 },
  '30d': { label: 'Last 30 Days', hours: 24 * 30 },
  '90d': { label: 'Last 90 Days', hours: 24 * 90 },
  'all': { label: 'All Time', hours: null }
};

const METRIC_CATEGORIES = {
  USAGE: 'usage',
  PRODUCTIVITY: 'productivity',
  COSTS: 'costs',
  TOOLS: 'tools',
  SESSIONS: 'sessions'
};

const CLAUDE_MODELS = {
  'haiku': { name: 'Claude 3 Haiku', costPer1MTokens: 0.25, color: '#10B981' },
  'sonnet': { name: 'Claude 3.5 Sonnet', costPer1MTokens: 3.0, color: '#3B82F6' },
  'opus': { name: 'Claude 3 Opus', costPer1MTokens: 15.0, color: '#8B5CF6' }
};

const PRODUCTIVITY_METRICS = [
  { key: 'sessionsPerDay', label: 'Sessions per Day', icon: MessageSquare, format: 'number' },
  { key: 'avgSessionDuration', label: 'Avg Session Duration', icon: Clock, format: 'duration' },
  { key: 'messagesPerSession', label: 'Messages per Session', icon: Activity, format: 'number' },
  { key: 'codeGenerated', label: 'Code Lines Generated', icon: Code, format: 'number' },
  { key: 'filesModified', label: 'Files Modified', icon: FileText, format: 'number' },
  { key: 'tasksCompleted', label: 'Tasks Completed', icon: CheckCircle, format: 'number' }
];

const TOOL_CATEGORIES = {
  'file': { label: 'File Operations', icon: FileText, color: 'blue' },
  'code': { label: 'Code Tools', icon: Code, color: 'green' },
  'git': { label: 'Git Operations', icon: GitBranch, color: 'orange' },
  'search': { label: 'Search Tools', icon: Search, color: 'purple' },
  'analysis': { label: 'Analysis Tools', icon: BarChart3, color: 'red' },
  'other': { label: 'Other Tools', icon: Zap, color: 'gray' }
};

function AnalyticsDashboard({ isOpen, onClose, selectedProject }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [timeRange, setTimeRange] = useState('7d');
  const [loading, setLoading] = useState(false);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [usageMetrics, setUsageMetrics] = useState(null);
  const [costData, setCostData] = useState(null);
  const [toolStats, setToolStats] = useState(null);
  const [sessionAnalytics, setSessionAnalytics] = useState(null);
  const [productivityData, setProductivityData] = useState(null);
  const [selectedMetrics, setSelectedMetrics] = useState(['tokens', 'sessions', 'cost']);
  const [chartType, setChartType] = useState('line');
  const [showDetailedBreakdown, setShowDetailedBreakdown] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadAnalyticsData();
    }
  }, [isOpen, timeRange, selectedProject]);

  const loadAnalyticsData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth-token');
      const params = new URLSearchParams({
        timeRange,
        projectName: selectedProject?.name || 'all'
      });

      // Load all analytics data in parallel
      const [
        overviewResponse,
        usageResponse,
        costResponse,
        toolsResponse,
        sessionsResponse,
        productivityResponse
      ] = await Promise.all([
        fetch(`/api/analytics/overview?${params}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`/api/analytics/usage?${params}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`/api/analytics/costs?${params}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`/api/analytics/tools?${params}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`/api/analytics/sessions?${params}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`/api/analytics/productivity?${params}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (overviewResponse.ok) {
        const data = await overviewResponse.json();
        setAnalyticsData(data);
      }

      if (usageResponse.ok) {
        const data = await usageResponse.json();
        setUsageMetrics(data);
      }

      if (costResponse.ok) {
        const data = await costResponse.json();
        setCostData(data);
      }

      if (toolsResponse.ok) {
        const data = await toolsResponse.json();
        setToolStats(data);
      }

      if (sessionsResponse.ok) {
        const data = await sessionsResponse.json();
        setSessionAnalytics(data);
      }

      if (productivityResponse.ok) {
        const data = await productivityResponse.json();
        setProductivityData(data);
      }
    } catch (error) {
      console.error('Error loading analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportAnalytics = async () => {
    try {
      const token = localStorage.getItem('auth-token');
      const params = new URLSearchParams({
        timeRange,
        projectName: selectedProject?.name || 'all',
        format: 'csv'
      });

      const response = await fetch(`/api/analytics/export?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `claude-analytics-${timeRange}-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error exporting analytics:', error);
    }
  };

  const formatNumber = (num, format = 'number') => {
    if (num === null || num === undefined) return 'N/A';
    
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 2
        }).format(num);
      case 'duration':
        const hours = Math.floor(num / 3600);
        const minutes = Math.floor((num % 3600) / 60);
        return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
      case 'percentage':
        return `${(num * 100).toFixed(1)}%`;
      case 'tokens':
        return num >= 1000000 ? `${(num / 1000000).toFixed(1)}M` : 
               num >= 1000 ? `${(num / 1000).toFixed(1)}K` : 
               num.toLocaleString();
      default:
        return num.toLocaleString();
    }
  };

  const getTrendIcon = (trend) => {
    if (!trend || trend === 0) return <Activity className="w-4 h-4 text-gray-500" />;
    return trend > 0 ? 
      <TrendingUp className="w-4 h-4 text-green-600" /> : 
      <TrendingDown className="w-4 h-4 text-red-600" />;
  };

  const getTrendColor = (trend) => {
    if (!trend || trend === 0) return 'text-gray-600';
    return trend > 0 ? 'text-green-600' : 'text-red-600';
  };

  const MetricCard = ({ title, value, format, trend, icon: Icon, color = 'blue' }) => (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 bg-${color}-100 dark:bg-${color}-900/30 rounded-lg`}>
          <Icon className={`w-6 h-6 text-${color}-600`} />
        </div>
        {getTrendIcon(trend)}
      </div>
      <div className="space-y-1">
        <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
          {title}
        </h3>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">
          {formatNumber(value, format)}
        </p>
        {trend !== undefined && (
          <p className={`text-sm ${getTrendColor(trend)}`}>
            {trend > 0 ? '+' : ''}{formatNumber(trend, 'percentage')} vs previous period
          </p>
        )}
      </div>
    </div>
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-7xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Analytics & Usage Insights
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {selectedProject ? selectedProject.displayName || selectedProject.name : 'All Projects'} • {TIME_RANGES[timeRange].label}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="text-sm border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700"
            >
              {Object.entries(TIME_RANGES).map(([key, range]) => (
                <option key={key} value={key}>
                  {range.label}
                </option>
              ))}
            </select>
            <Button
              variant="outline"
              onClick={loadAnalyticsData}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              variant="outline"
              onClick={exportAnalytics}
            >
              <Download className="w-4 h-4 mr-2" />
              Export
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
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'usage', label: 'Token Usage', icon: Zap },
              { id: 'costs', label: 'Cost Analysis', icon: DollarSign },
              { id: 'productivity', label: 'Productivity', icon: Target },
              { id: 'tools', label: 'Tool Usage', icon: Settings },
              { id: 'sessions', label: 'Session Analytics', icon: MessageSquare }
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
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mr-3" />
              <span className="text-lg text-gray-600 dark:text-gray-400">Loading analytics...</span>
            </div>
          ) : (
            <>
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Key Metrics Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                    <MetricCard
                      title="Total Tokens Used"
                      value={analyticsData?.totalTokens || 0}
                      format="tokens"
                      trend={analyticsData?.tokensTrend}
                      icon={Zap}
                      color="blue"
                    />
                    <MetricCard
                      title="Total Cost"
                      value={analyticsData?.totalCost || 0}
                      format="currency"
                      trend={analyticsData?.costTrend}
                      icon={DollarSign}
                      color="green"
                    />
                    <MetricCard
                      title="Active Sessions"
                      value={analyticsData?.totalSessions || 0}
                      format="number"
                      trend={analyticsData?.sessionsTrend}
                      icon={MessageSquare}
                      color="purple"
                    />
                    <MetricCard
                      title="Productivity Score"
                      value={analyticsData?.productivityScore || 0}
                      format="number"
                      trend={analyticsData?.productivityTrend}
                      icon={Target}
                      color="orange"
                    />
                  </div>

                  {/* Usage Timeline Chart */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                        Usage Timeline
                      </h3>
                      <div className="flex items-center gap-2">
                        <select
                          value={chartType}
                          onChange={(e) => setChartType(e.target.value)}
                          className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700"
                        >
                          <option value="line">Line Chart</option>
                          <option value="area">Area Chart</option>
                          <option value="bar">Bar Chart</option>
                        </select>
                      </div>
                    </div>
                    
                    {/* Placeholder for chart */}
                    <div className="h-64 bg-gray-50 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                      <div className="text-center">
                        <LineChart className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Usage timeline chart would be rendered here
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Integration with charting library (Chart.js, Recharts, etc.)
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Quick Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Model Usage Breakdown */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                        Model Usage
                      </h3>
                      <div className="space-y-3">
                        {Object.entries(CLAUDE_MODELS).map(([key, model]) => {
                          const usage = analyticsData?.modelUsage?.[key] || 0;
                          const percentage = analyticsData?.totalTokens > 0 ? 
                            (usage / analyticsData.totalTokens) * 100 : 0;
                          
                          return (
                            <div key={key} className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div 
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: model.color }}
                                ></div>
                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                  {model.name}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                  {formatNumber(usage, 'tokens')}
                                </span>
                                <span className="text-xs text-gray-500">
                                  ({percentage.toFixed(1)}%)
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Top Tools */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                        Most Used Tools
                      </h3>
                      <div className="space-y-3">
                        {(analyticsData?.topTools || []).slice(0, 5).map((tool, index) => (
                          <div key={tool.name} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="w-6 h-6 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center text-xs font-medium">
                                {index + 1}
                              </span>
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {tool.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                {tool.usage} uses
                              </span>
                              <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                                {tool.category}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Token Usage Tab */}
              {activeTab === 'usage' && (
                <div className="space-y-6">
                  <div className="text-center py-12">
                    <Zap className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      Token Usage Analytics
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                      Detailed token consumption analysis across models, sessions, and time periods.
                    </p>
                  </div>
                </div>
              )}

              {/* Cost Analysis Tab */}
              {activeTab === 'costs' && (
                <div className="space-y-6">
                  <div className="text-center py-12">
                    <DollarSign className="w-16 h-16 text-green-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      Cost Analysis & Monitoring
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                      Track spending patterns, budget alerts, and cost optimization insights.
                    </p>
                  </div>
                </div>
              )}

              {/* Productivity Tab */}
              {activeTab === 'productivity' && (
                <div className="space-y-6">
                  <div className="text-center py-12">
                    <Target className="w-16 h-16 text-orange-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      Productivity Metrics
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                      Analyze coding efficiency, task completion rates, and workflow optimization.
                    </p>
                  </div>
                </div>
              )}

              {/* Tool Usage Tab */}
              {activeTab === 'tools' && (
                <div className="space-y-6">
                  <div className="text-center py-12">
                    <Settings className="w-16 h-16 text-purple-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      Tool Usage Statistics
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                      Monitor tool effectiveness, usage patterns, and optimization opportunities.
                    </p>
                  </div>
                </div>
              )}

              {/* Session Analytics Tab */}
              {activeTab === 'sessions' && (
                <div className="space-y-6">
                  <div className="text-center py-12">
                    <MessageSquare className="w-16 h-16 text-indigo-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      Session Analytics
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                      Analyze conversation patterns, session duration, and engagement metrics.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
            <span>Data range: {TIME_RANGES[timeRange].label}</span>
            {analyticsData?.lastUpdated && (
              <>
                <span>•</span>
                <span>Updated: {new Date(analyticsData.lastUpdated).toLocaleString()}</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button onClick={loadAnalyticsData} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh Data
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AnalyticsDashboard; 