import React, { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { 
  X,
  Play,
  Square,
  RefreshCw,
  Bug,
  TestTube,
  BarChart3,
  Settings,
  Terminal,
  FileText,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Zap,
  Target,
  Activity,
  Filter,
  Search,
  Download,
  Upload,
  GitBranch,
  Wrench,
  Database,
  Code,
  Eye,
  EyeOff,
  Pause,
  ArrowDown,
  StepForward,
  ArrowRightCircle,
  SkipForward,
  Repeat,
  List,
  Package,
  Layers,
  Monitor,
  PieChart,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Info,
  ArrowRight,
  Plus,
  Trash2,
  Edit3,
  Copy,
  ExternalLink,
  FolderOpen,
  History
} from 'lucide-react';

const TEST_FRAMEWORKS = {
  jest: {
    name: 'Jest',
    icon: TestTube,
    color: 'red',
    commands: {
      run: 'npm test',
      watch: 'npm test -- --watch',
      coverage: 'npm test -- --coverage',
      debug: 'node --inspect-brk node_modules/.bin/jest --runInBand'
    },
    configFiles: ['jest.config.js', 'jest.config.json', 'package.json'],
    patterns: ['**/*.test.js', '**/*.spec.js', '**/__tests__/**/*.js']
  },
  vitest: {
    name: 'Vitest',
    icon: Zap,
    color: 'yellow',
    commands: {
      run: 'npx vitest run',
      watch: 'npx vitest',
      coverage: 'npx vitest run --coverage',
      debug: 'npx vitest --inspect-brk'
    },
    configFiles: ['vitest.config.js', 'vitest.config.ts', 'vite.config.js'],
    patterns: ['**/*.test.js', '**/*.spec.js', '**/__tests__/**/*.js']
  },
  mocha: {
    name: 'Mocha',
    icon: Target,
    color: 'brown',
    commands: {
      run: 'npx mocha',
      watch: 'npx mocha --watch',
      coverage: 'npx nyc mocha',
      debug: 'npx mocha --inspect-brk'
    },
    configFiles: ['.mocharc.json', '.mocharc.js', 'mocha.opts'],
    patterns: ['test/**/*.js', '**/*.test.js', '**/*.spec.js']
  },
  cypress: {
    name: 'Cypress',
    icon: Activity,
    color: 'green',
    commands: {
      run: 'npx cypress run',
      watch: 'npx cypress open',
      coverage: 'npx cypress run --coverage',
      debug: 'npx cypress run --headed'
    },
    configFiles: ['cypress.config.js', 'cypress.json'],
    patterns: ['cypress/e2e/**/*.cy.js', 'cypress/integration/**/*.spec.js']
  },
  playwright: {
    name: 'Playwright',
    icon: Monitor,
    color: 'blue',
    commands: {
      run: 'npx playwright test',
      watch: 'npx playwright test --ui',
      coverage: 'npx playwright test --coverage',
      debug: 'npx playwright test --debug'
    },
    configFiles: ['playwright.config.js', 'playwright.config.ts'],
    patterns: ['tests/**/*.spec.js', 'e2e/**/*.test.js']
  }
};

const DEBUG_TOOLS = {
  node: {
    name: 'Node.js Debugger',
    icon: Bug,
    color: 'green',
    commands: {
      start: 'node --inspect-brk',
      attach: 'node --inspect'
    }
  },
  chrome: {
    name: 'Chrome DevTools',
    icon: Monitor,
    color: 'blue',
    url: 'chrome://inspect'
  },
  vscode: {
    name: 'VS Code Debugger',
    icon: Code,
    color: 'blue',
    configFile: '.vscode/launch.json'
  }
};

function TestingDebugPanel({ isOpen, onClose, selectedProject }) {
  const [activeTab, setActiveTab] = useState('tests');
  const [detectedFrameworks, setDetectedFrameworks] = useState([]);
  const [testResults, setTestResults] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [coverageData, setCoverageData] = useState(null);
  const [debugSessions, setDebugSessions] = useState([]);
  const [activeDebugSession, setActiveDebugSession] = useState(null);
  const [testFilters, setTestFilters] = useState({
    status: 'all', // all, passed, failed, skipped
    file: '',
    suite: ''
  });
  const [testWatcher, setTestWatcher] = useState(null);
  const [debugBreakpoints, setDebugBreakpoints] = useState([]);
  const [debugVariables, setDebugVariables] = useState({});
  const [testHistory, setTestHistory] = useState([]);
  const [selectedFramework, setSelectedFramework] = useState(null);
  const wsRef = useRef(null);

  useEffect(() => {
    if (isOpen && selectedProject) {
      detectTestFrameworks();
      loadTestHistory();
      connectWebSocket();
    }
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [isOpen, selectedProject]);

  const connectWebSocket = () => {
    if (!selectedProject) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/shell`;
    
    wsRef.current = new WebSocket(wsUrl);
    
    wsRef.current.onopen = () => {
      wsRef.current.send(JSON.stringify({
        type: 'init',
        projectPath: selectedProject.fullPath
      }));
    };

    wsRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      handleTestOutput(data);
    };
  };

  const detectTestFrameworks = async () => {
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`/api/testing/${selectedProject.name}/detect-frameworks`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setDetectedFrameworks(data.frameworks || []);
        if (data.frameworks.length > 0 && !selectedFramework) {
          setSelectedFramework(data.frameworks[0]);
        }
      }
    } catch (error) {
      console.error('Error detecting test frameworks:', error);
    }
  };

  const loadTestHistory = async () => {
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`/api/testing/${selectedProject.name}/history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setTestHistory(data.history || []);
      }
    } catch (error) {
      console.error('Error loading test history:', error);
    }
  };

  const runTests = async (framework, mode = 'run') => {
    if (!framework || isRunning) return;

    setIsRunning(true);
    setTestResults(null);

    try {
      const command = framework.commands[mode];
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'input',
          data: `${command}\n`
        }));
      }

      // Also track via API
      const token = localStorage.getItem('auth-token');
      await fetch(`/api/testing/${selectedProject.name}/run`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          framework: framework.name.toLowerCase(),
          command: command,
          mode: mode
        })
      });
    } catch (error) {
      console.error('Error running tests:', error);
      setIsRunning(false);
    }
  };

  const stopTests = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'input',
        data: '\x03' // Ctrl+C
      }));
    }
    setIsRunning(false);
  };

  const handleTestOutput = (data) => {
    if (data.type === 'output') {
      // Parse test output for results
      parseTestResults(data.data);
    }
  };

  const parseTestResults = (output) => {
    // Simple test result parsing (would be more sophisticated in real implementation)
    const lines = output.split('\n');
    let testResults = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      suites: [],
      timestamp: new Date().toISOString()
    };

    // Jest/Vitest pattern matching
    lines.forEach(line => {
      if (line.includes('Tests:')) {
        const match = line.match(/(\d+) passed.*?(\d+) failed.*?(\d+) total/);
        if (match) {
          testResults.passed = parseInt(match[1]);
          testResults.failed = parseInt(match[2]);
          testResults.total = parseInt(match[3]);
        }
      }
    });

    if (testResults.total > 0) {
      setTestResults(testResults);
      setIsRunning(false);
      
      // Add to history
      setTestHistory(prev => [testResults, ...prev.slice(0, 9)]);
    }
  };

  const startDebugSession = async (type = 'node') => {
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`/api/debugging/${selectedProject.name}/start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: type,
          projectPath: selectedProject.fullPath
        })
      });

      if (response.ok) {
        const data = await response.json();
        const newSession = {
          id: data.sessionId,
          type: type,
          status: 'running',
          startTime: new Date().toISOString(),
          port: data.port,
          url: data.debugUrl
        };
        
        setDebugSessions(prev => [...prev, newSession]);
        setActiveDebugSession(newSession);
      }
    } catch (error) {
      console.error('Error starting debug session:', error);
    }
  };

  const stopDebugSession = async (sessionId) => {
    try {
      const token = localStorage.getItem('auth-token');
      await fetch(`/api/debugging/${selectedProject.name}/stop/${sessionId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      setDebugSessions(prev => prev.filter(s => s.id !== sessionId));
      if (activeDebugSession?.id === sessionId) {
        setActiveDebugSession(null);
      }
    } catch (error) {
      console.error('Error stopping debug session:', error);
    }
  };

  const loadCoverageReport = async () => {
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`/api/testing/${selectedProject.name}/coverage`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setCoverageData(data.coverage);
      }
    } catch (error) {
      console.error('Error loading coverage report:', error);
    }
  };

  const getCoverageColor = (percentage) => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'passed': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-600" />;
      case 'skipped': return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      default: return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-7xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <TestTube className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Testing & Debugging
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {selectedProject?.displayName || selectedProject?.name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {selectedFramework && (
              <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-900/20 rounded-full">
                <selectedFramework.icon className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900 dark:text-blue-300">
                  {selectedFramework.name}
                </span>
              </div>
            )}
            <Button
              variant="outline"
              onClick={() => detectTestFrameworks()}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
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
              { id: 'tests', label: 'Test Runner', icon: TestTube },
              { id: 'debug', label: 'Debugging', icon: Bug },
              { id: 'coverage', label: 'Coverage', icon: BarChart3 },
              { id: 'workflows', label: 'Workflows', icon: GitBranch },
              { id: 'history', label: 'History', icon: History }
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
          {/* Test Runner Tab */}
          {activeTab === 'tests' && (
            <div className="space-y-6">
              {/* Framework Selection */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Test Frameworks
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {detectedFrameworks.map((framework) => (
                    <div
                      key={framework.name}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedFramework?.name === framework.name
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                      onClick={() => setSelectedFramework(framework)}
                    >
                      <div className="flex items-center gap-3">
                        <framework.icon className={`w-5 h-5 text-${framework.color}-600`} />
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            {framework.name}
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {framework.patterns.length} test patterns
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {selectedFramework && (
                <>
                  {/* Test Controls */}
                  <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <Button
                      onClick={() => runTests(selectedFramework, 'run')}
                      disabled={isRunning}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {isRunning ? (
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Play className="w-4 h-4 mr-2" />
                      )}
                      Run Tests
                    </Button>
                    
                    <Button
                      variant="outline"
                      onClick={() => runTests(selectedFramework, 'watch')}
                      disabled={isRunning}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Watch Mode
                    </Button>
                    
                    <Button
                      variant="outline"
                      onClick={() => runTests(selectedFramework, 'coverage')}
                      disabled={isRunning}
                    >
                      <BarChart3 className="w-4 h-4 mr-2" />
                      Coverage
                    </Button>
                    
                    <Button
                      variant="outline"
                      onClick={() => runTests(selectedFramework, 'debug')}
                      disabled={isRunning}
                    >
                      <Bug className="w-4 h-4 mr-2" />
                      Debug Tests
                    </Button>

                    {isRunning && (
                      <Button
                        variant="outline"
                        onClick={stopTests}
                        className="border-red-300 text-red-600 hover:bg-red-50"
                      >
                        <Square className="w-4 h-4 mr-2" />
                        Stop
                      </Button>
                    )}
                  </div>

                  {/* Test Results */}
                  {testResults && (
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                        Test Results
                      </h3>
                      
                      {/* Summary Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <TestTube className="w-4 h-4 text-blue-600" />
                            <span className="text-sm font-medium text-blue-900 dark:text-blue-300">
                              Total Tests
                            </span>
                          </div>
                          <div className="text-2xl font-bold text-blue-900 dark:text-blue-300">
                            {testResults.total}
                          </div>
                        </div>

                        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span className="text-sm font-medium text-green-900 dark:text-green-300">
                              Passed
                            </span>
                          </div>
                          <div className="text-2xl font-bold text-green-900 dark:text-green-300">
                            {testResults.passed}
                          </div>
                        </div>

                        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <XCircle className="w-4 h-4 text-red-600" />
                            <span className="text-sm font-medium text-red-900 dark:text-red-300">
                              Failed
                            </span>
                          </div>
                          <div className="text-2xl font-bold text-red-900 dark:text-red-300">
                            {testResults.failed}
                          </div>
                        </div>

                        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle className="w-4 h-4 text-yellow-600" />
                            <span className="text-sm font-medium text-yellow-900 dark:text-yellow-300">
                              Skipped
                            </span>
                          </div>
                          <div className="text-2xl font-bold text-yellow-900 dark:text-yellow-300">
                            {testResults.skipped}
                          </div>
                        </div>
                      </div>

                      {/* Success Rate */}
                      <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-gray-900 dark:text-white">
                            Success Rate
                          </span>
                          <span className={`font-bold ${
                            testResults.passed / testResults.total >= 0.8 ? 'text-green-600' :
                            testResults.passed / testResults.total >= 0.6 ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>
                            {Math.round((testResults.passed / testResults.total) * 100)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              testResults.passed / testResults.total >= 0.8 ? 'bg-green-600' :
                              testResults.passed / testResults.total >= 0.6 ? 'bg-yellow-600' :
                              'bg-red-600'
                            }`}
                            style={{ width: `${(testResults.passed / testResults.total) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {detectedFrameworks.length === 0 && (
                <div className="text-center py-12">
                  <TestTube className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No Test Frameworks Detected
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                    We couldn't find any supported test frameworks in this project.
                  </p>
                  <Button onClick={detectTestFrameworks}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Scan Again
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Debug Tab */}
          {activeTab === 'debug' && (
            <div className="space-y-6">
              {/* Debug Controls */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Debug Sessions
                </h3>
                
                <div className="flex items-center gap-4 mb-6">
                  <Button
                    onClick={() => startDebugSession('node')}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Bug className="w-4 h-4 mr-2" />
                    Start Debug Session
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => window.open('chrome://inspect', '_blank')}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Chrome DevTools
                  </Button>
                </div>

                {/* Active Debug Sessions */}
                <div className="space-y-3">
                  {debugSessions.map((session) => (
                    <div
                      key={session.id}
                      className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                          <Bug className="w-4 h-4 text-green-600" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            {session.type} Debug Session
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Port: {session.port} • Started {new Date(session.startTime).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {session.url && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(session.url, '_blank')}
                          >
                            <ExternalLink className="w-3 h-3 mr-1" />
                            Open
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => stopDebugSession(session.id)}
                          className="border-red-300 text-red-600 hover:bg-red-50"
                        >
                          <Square className="w-3 h-3 mr-1" />
                          Stop
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {debugSessions.length === 0 && (
                  <div className="text-center py-8 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                    <Bug className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 dark:text-gray-400">
                      No active debug sessions
                    </p>
                  </div>
                )}
              </div>

              {/* Debug Tools */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Debug Tools
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {Object.entries(DEBUG_TOOLS).map(([key, tool]) => (
                    <div key={key} className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                      <div className="flex items-center gap-3 mb-3">
                        <tool.icon className={`w-5 h-5 text-${tool.color}-600`} />
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {tool.name}
                        </h4>
                      </div>
                      
                      {tool.url && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(tool.url, '_blank')}
                          className="w-full"
                        >
                          <ExternalLink className="w-3 h-3 mr-2" />
                          Open
                        </Button>
                      )}
                      
                      {tool.configFile && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                          Config: {tool.configFile}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Coverage Tab */}
          {activeTab === 'coverage' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Code Coverage Report
                </h3>
                <Button onClick={loadCoverageReport}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Load Coverage
                </Button>
              </div>

              {coverageData ? (
                <>
                  {/* Coverage Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {Object.entries(coverageData.summary || {}).map(([metric, data]) => (
                      <div key={metric} className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                            {metric}
                          </span>
                          <span className={`font-bold ${getCoverageColor(data.percentage)}`}>
                            {data.percentage}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              data.percentage >= 80 ? 'bg-green-600' :
                              data.percentage >= 60 ? 'bg-yellow-600' :
                              'bg-red-600'
                            }`}
                            style={{ width: `${data.percentage}%` }}
                          ></div>
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          {data.covered}/{data.total} covered
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* File Coverage */}
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                      File Coverage
                    </h4>
                    <div className="space-y-2">
                      {(coverageData.files || []).map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-600 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <FileText className="w-4 h-4 text-gray-600" />
                            <span className="font-medium text-gray-900 dark:text-white">
                              {file.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className={`text-sm ${getCoverageColor(file.coverage)}`}>
                              {file.coverage}%
                            </span>
                            <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${
                                  file.coverage >= 80 ? 'bg-green-600' :
                                  file.coverage >= 60 ? 'bg-yellow-600' :
                                  'bg-red-600'
                                }`}
                                style={{ width: `${file.coverage}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No Coverage Data
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                    Run tests with coverage to see detailed coverage reports.
                  </p>
                  <Button onClick={loadCoverageReport}>
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Load Coverage Report
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Workflows Tab */}
          {activeTab === 'workflows' && (
            <div className="space-y-6">
              <div className="text-center py-12">
                <GitBranch className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Automated Testing Workflows
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                  Set up CI/CD integration, pre-commit hooks, and automated testing workflows.
                </p>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Workflow
                </Button>
              </div>
            </div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Test History
              </h3>
              
              <div className="space-y-3">
                {testHistory.map((result, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        result.failed === 0 ? 'bg-green-100 dark:bg-green-900/30' :
                        'bg-red-100 dark:bg-red-900/30'
                      }`}>
                        {result.failed === 0 ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-600" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {result.passed}/{result.total} tests passed
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {new Date(result.timestamp).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-green-600">{result.passed} passed</span>
                      {result.failed > 0 && (
                        <span className="text-red-600">{result.failed} failed</span>
                      )}
                      {result.skipped > 0 && (
                        <span className="text-yellow-600">{result.skipped} skipped</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {testHistory.length === 0 && (
                <div className="text-center py-12">
                  <History className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No Test History
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Run some tests to see your test history here.
                  </p>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
            {detectedFrameworks.length > 0 && (
              <>
                <span>{detectedFrameworks.length} frameworks detected</span>
                <span>•</span>
              </>
            )}
            {debugSessions.length > 0 && (
              <>
                <span>{debugSessions.length} debug sessions active</span>
                <span>•</span>
              </>
            )}
            <span>Ready to test</span>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            {selectedFramework && (
              <Button
                onClick={() => runTests(selectedFramework, 'run')}
                disabled={isRunning}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isRunning ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Run Tests
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default TestingDebugPanel; 