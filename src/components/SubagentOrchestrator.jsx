import React, { useState, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { 
  X, Plus, Play, Square as Stop, Settings, Users, Brain, Network, Target,
  Activity, BarChart3, Clock, Zap, AlertTriangle, CheckCircle,
  XCircle, RefreshCw, Copy, Edit3, Trash2, Eye, Send, MessageSquare,
  GitBranch, Layers, Box, Puzzle, Crown, Shield, User, Code,
  Terminal, FileText, Search, Filter, MoreHorizontal, Link2,
  ArrowRight, ArrowDown, TrendingUp, Cpu, Database as Memory, Timer
} from 'lucide-react';

// Agent Roles and Types
const AGENT_ROLES = {
  ORCHESTRATOR: 'orchestrator',
  WORKER: 'worker',
  SPECIALIST: 'specialist',
  COORDINATOR: 'coordinator',
  MONITOR: 'monitor'
};

const AGENT_SPECIALIZATIONS = {
  FRONTEND: 'frontend',
  BACKEND: 'backend',
  DATABASE: 'database',
  TESTING: 'testing',
  DOCUMENTATION: 'documentation',
  ARCHITECTURE: 'architecture',
  SECURITY: 'security',
  PERFORMANCE: 'performance',
  DEVOPS: 'devops',
  UI_UX: 'ui-ux'
};

const AGENT_STATUS = {
  IDLE: 'idle',
  WORKING: 'working',
  WAITING: 'waiting',
  COMPLETED: 'completed',
  ERROR: 'error',
  OFFLINE: 'offline'
};

// Agent Templates
const AGENT_TEMPLATES = {
  fullstack_dev: {
    name: 'Full-Stack Developer',
    description: 'Complete application development with frontend and backend',
    specializations: [AGENT_SPECIALIZATIONS.FRONTEND, AGENT_SPECIALIZATIONS.BACKEND],
    role: AGENT_ROLES.SPECIALIST,
    capabilities: ['react', 'node.js', 'databases', 'apis', 'testing'],
    maxConcurrentTasks: 3,
    priority: 'high'
  },
  code_reviewer: {
    name: 'Code Reviewer',
    description: 'Code quality analysis and security review',
    specializations: [AGENT_SPECIALIZATIONS.SECURITY, AGENT_SPECIALIZATIONS.ARCHITECTURE],
    role: AGENT_ROLES.SPECIALIST,
    capabilities: ['code-review', 'security-audit', 'best-practices', 'refactoring'],
    maxConcurrentTasks: 5,
    priority: 'medium'
  },
  test_engineer: {
    name: 'Test Engineer',
    description: 'Test automation and quality assurance',
    specializations: [AGENT_SPECIALIZATIONS.TESTING],
    role: AGENT_ROLES.SPECIALIST,
    capabilities: ['unit-testing', 'integration-testing', 'e2e-testing', 'performance-testing'],
    maxConcurrentTasks: 2,
    priority: 'high'
  },
  devops_specialist: {
    name: 'DevOps Specialist',
    description: 'Deployment, CI/CD, and infrastructure management',
    specializations: [AGENT_SPECIALIZATIONS.DEVOPS],
    role: AGENT_ROLES.SPECIALIST,
    capabilities: ['docker', 'kubernetes', 'ci-cd', 'monitoring', 'infrastructure'],
    maxConcurrentTasks: 2,
    priority: 'medium'
  },
  ui_designer: {
    name: 'UI/UX Designer',
    description: 'User interface and experience design',
    specializations: [AGENT_SPECIALIZATIONS.UI_UX],
    role: AGENT_ROLES.SPECIALIST,
    capabilities: ['design-systems', 'user-research', 'prototyping', 'accessibility'],
    maxConcurrentTasks: 3,
    priority: 'medium'
  }
};

function SubagentOrchestrator({ isOpen, onClose, selectedProject, currentSession }) {
  const [activeTab, setActiveTab] = useState('agents');
  const [agents, setAgents] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [workflows, setWorkflows] = useState([]);
  const [communications, setCommunications] = useState([]);
  const [performance, setPerformance] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [showCreateAgent, setShowCreateAgent] = useState(false);
  const [showCreateWorkflow, setShowCreateWorkflow] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Load orchestrator data
  const loadOrchestratorData = useCallback(async () => {
    setLoading(true);
    try {
      const [agentsRes, tasksRes, workflowsRes, commRes, perfRes] = await Promise.all([
        fetch('/api/subagents/agents'),
        fetch('/api/subagents/tasks'),
        fetch('/api/subagents/workflows'),
        fetch('/api/subagents/communications'),
        fetch('/api/subagents/performance')
      ]);

      if (agentsRes.ok) {
        const agentsData = await agentsRes.json();
        setAgents(agentsData.agents || []);
      }

      if (tasksRes.ok) {
        const tasksData = await tasksRes.json();
        setTasks(tasksData.tasks || []);
      }

      if (workflowsRes.ok) {
        const workflowsData = await workflowsRes.json();
        setWorkflows(workflowsData.workflows || []);
      }

      if (commRes.ok) {
        const commData = await commRes.json();
        setCommunications(commData.communications || []);
      }

      if (perfRes.ok) {
        const perfData = await perfRes.json();
        setPerformance(perfData.performance || {});
      }
    } catch (error) {
      console.error('Failed to load orchestrator data:', error);
    }
    setLoading(false);
  }, []);

  // Create new agent
  const createAgent = async (agentConfig) => {
    try {
      const response = await fetch('/api/subagents/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...agentConfig,
          projectId: selectedProject?.id,
          sessionId: currentSession?.id
        })
      });

      if (response.ok) {
        await loadOrchestratorData();
        setShowCreateAgent(false);
      }
    } catch (error) {
      console.error('Failed to create agent:', error);
    }
  };

  // Start agent
  const startAgent = async (agentId) => {
    try {
      const response = await fetch(`/api/subagents/agents/${agentId}/start`, {
        method: 'POST'
      });

      if (response.ok) {
        await loadOrchestratorData();
      }
    } catch (error) {
      console.error('Failed to start agent:', error);
    }
  };

  // Stop agent
  const stopAgent = async (agentId) => {
    try {
      const response = await fetch(`/api/subagents/agents/${agentId}/stop`, {
        method: 'POST'
      });

      if (response.ok) {
        await loadOrchestratorData();
      }
    } catch (error) {
      console.error('Failed to stop agent:', error);
    }
  };

  // Delegate task to agent
  const delegateTask = async (agentId, taskData) => {
    try {
      const response = await fetch('/api/subagents/delegate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId,
          task: taskData,
          projectId: selectedProject?.id,
          sessionId: currentSession?.id
        })
      });

      if (response.ok) {
        await loadOrchestratorData();
      }
    } catch (error) {
      console.error('Failed to delegate task:', error);
    }
  };

  // Create workflow
  const createWorkflow = async (workflowData) => {
    try {
      const response = await fetch('/api/subagents/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...workflowData,
          projectId: selectedProject?.id
        })
      });

      if (response.ok) {
        await loadOrchestratorData();
        setShowCreateWorkflow(false);
      }
    } catch (error) {
      console.error('Failed to create workflow:', error);
    }
  };

  // Send message between agents
  const sendAgentMessage = async (fromAgentId, toAgentId, message) => {
    try {
      const response = await fetch('/api/subagents/communicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromAgentId,
          toAgentId,
          message,
          sessionId: currentSession?.id
        })
      });

      if (response.ok) {
        await loadOrchestratorData();
      }
    } catch (error) {
      console.error('Failed to send agent message:', error);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadOrchestratorData();
      // Set up real-time updates
      const interval = setInterval(loadOrchestratorData, 5000);
      return () => clearInterval(interval);
    }
  }, [isOpen, loadOrchestratorData]);

  // Filter agents based on search and status
  const filteredAgents = agents.filter(agent => {
    const matchesSearch = searchQuery === '' || 
      agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.role.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || agent.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusIcon = (status) => {
    switch (status) {
      case AGENT_STATUS.IDLE: return Clock;
      case AGENT_STATUS.WORKING: return Activity;
      case AGENT_STATUS.WAITING: return Timer;
      case AGENT_STATUS.COMPLETED: return CheckCircle;
      case AGENT_STATUS.ERROR: return XCircle;
      case AGENT_STATUS.OFFLINE: return AlertTriangle;
      default: return Brain;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case AGENT_STATUS.IDLE: return 'text-gray-600 bg-gray-100';
      case AGENT_STATUS.WORKING: return 'text-blue-600 bg-blue-100';
      case AGENT_STATUS.WAITING: return 'text-yellow-600 bg-yellow-100';
      case AGENT_STATUS.COMPLETED: return 'text-green-600 bg-green-100';
      case AGENT_STATUS.ERROR: return 'text-red-600 bg-red-100';
      case AGENT_STATUS.OFFLINE: return 'text-gray-600 bg-gray-200';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case AGENT_ROLES.ORCHESTRATOR: return Crown;
      case AGENT_ROLES.COORDINATOR: return Network;
      case AGENT_ROLES.SPECIALIST: return Target;
      case AGENT_ROLES.MONITOR: return Eye;
      case AGENT_ROLES.WORKER: return User;
      default: return Brain;
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
                Subagent Orchestrator
              </h2>
              <p className="text-sm text-muted-foreground">
                Manage multiple Claude instances and coordinate complex tasks
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {agents.filter(a => a.status === AGENT_STATUS.WORKING).length} Active
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={loadOrchestratorData}
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
            { id: 'agents', label: 'Agents', icon: Users },
            { id: 'tasks', label: 'Tasks', icon: Target },
            { id: 'workflows', label: 'Workflows', icon: GitBranch },
            { id: 'communication', label: 'Communication', icon: MessageSquare },
            { id: 'performance', label: 'Performance', icon: BarChart3 }
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
          {/* Agents Tab */}
          {activeTab === 'agents' && (
            <div className="flex-1 flex flex-col">
              <div className="p-6 border-b border-border">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Subagents</h3>
                  <Button onClick={() => setShowCreateAgent(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    New Agent
                  </Button>
                </div>
                
                <div className="flex items-center gap-4">
                  {/* Search */}
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search agents..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  {/* Status Filter */}
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="p-2 border border-border rounded-md bg-background text-sm"
                  >
                    <option value="all">All Status</option>
                    {Object.entries(AGENT_STATUS).map(([key, value]) => (
                      <option key={key} value={value}>
                        {key.charAt(0) + key.slice(1).toLowerCase()}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <ScrollArea className="flex-1">
                <div className="p-6">
                  {filteredAgents.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <h3 className="text-lg font-medium mb-2">No Agents</h3>
                      <p>Create subagents to distribute and coordinate complex tasks</p>
                      <Button 
                        className="mt-4"
                        onClick={() => setShowCreateAgent(true)}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Create Your First Agent
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredAgents.map(agent => (
                        <AgentCard
                          key={agent.id}
                          agent={agent}
                          onStart={() => startAgent(agent.id)}
                          onStop={() => stopAgent(agent.id)}
                          onView={() => setSelectedAgent(agent)}
                          onDelegate={(task) => delegateTask(agent.id, task)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Tasks Tab */}
          {activeTab === 'tasks' && (
            <TasksManager
              tasks={tasks}
              agents={agents}
              onDelegate={delegateTask}
              onRefresh={loadOrchestratorData}
            />
          )}

          {/* Workflows Tab */}
          {activeTab === 'workflows' && (
            <WorkflowsManager
              workflows={workflows}
              agents={agents}
              onCreate={createWorkflow}
              onRefresh={loadOrchestratorData}
            />
          )}

          {/* Communication Tab */}
          {activeTab === 'communication' && (
            <CommunicationManager
              communications={communications}
              agents={agents}
              onSendMessage={sendAgentMessage}
              onRefresh={loadOrchestratorData}
            />
          )}

          {/* Performance Tab */}
          {activeTab === 'performance' && (
            <PerformanceMonitor
              agents={agents}
              performance={performance}
              onRefresh={loadOrchestratorData}
            />
          )}
        </div>

        {/* Create Agent Modal */}
        {showCreateAgent && (
          <CreateAgentModal
            templates={AGENT_TEMPLATES}
            onSave={createAgent}
            onClose={() => setShowCreateAgent(false)}
          />
        )}

        {/* Create Workflow Modal */}
        {showCreateWorkflow && (
          <CreateWorkflowModal
            agents={agents}
            onSave={createWorkflow}
            onClose={() => setShowCreateWorkflow(false)}
          />
        )}

        {/* Agent Details Modal */}
        {selectedAgent && (
          <AgentDetailsModal
            agent={selectedAgent}
            onClose={() => setSelectedAgent(null)}
            onDelegate={(task) => delegateTask(selectedAgent.id, task)}
          />
        )}
      </div>
    </div>
  );
}

// Agent Card Component
function AgentCard({ agent, onStart, onStop, onView, onDelegate }) {
  const StatusIcon = getStatusIcon(agent.status);
  const RoleIcon = getRoleIcon(agent.role);
  const isWorking = agent.status === AGENT_STATUS.WORKING;
  
  const getStatusIcon = (status) => {
    switch (status) {
      case AGENT_STATUS.IDLE: return Clock;
      case AGENT_STATUS.WORKING: return Activity;
      case AGENT_STATUS.WAITING: return Timer;
      case AGENT_STATUS.COMPLETED: return CheckCircle;
      case AGENT_STATUS.ERROR: return XCircle;
      case AGENT_STATUS.OFFLINE: return AlertTriangle;
      default: return Brain;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case AGENT_STATUS.IDLE: return 'text-gray-600 bg-gray-100';
      case AGENT_STATUS.WORKING: return 'text-blue-600 bg-blue-100';
      case AGENT_STATUS.WAITING: return 'text-yellow-600 bg-yellow-100';
      case AGENT_STATUS.COMPLETED: return 'text-green-600 bg-green-100';
      case AGENT_STATUS.ERROR: return 'text-red-600 bg-red-100';
      case AGENT_STATUS.OFFLINE: return 'text-gray-600 bg-gray-200';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case AGENT_ROLES.ORCHESTRATOR: return Crown;
      case AGENT_ROLES.COORDINATOR: return Network;
      case AGENT_ROLES.SPECIALIST: return Target;
      case AGENT_ROLES.MONITOR: return Eye;
      case AGENT_ROLES.WORKER: return User;
      default: return Brain;
    }
  };

  return (
    <div className="p-4 border border-border rounded-lg hover:bg-muted/30 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <RoleIcon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h4 className="font-medium">{agent.name}</h4>
            <Badge variant="outline" className={`text-xs ${getStatusColor(agent.status)}`}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {agent.status}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={onView}>
            <Eye className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onDelegate({})}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
        {agent.description}
      </p>
      
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs text-muted-foreground">
          Role: {agent.role}
        </div>
        <div className="text-xs text-muted-foreground">
          Tasks: {agent.activeTasks || 0}/{agent.maxConcurrentTasks || 3}
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        {isWorking ? (
          <Button
            size="sm"
            variant="outline"
            onClick={onStop}
            className="flex-1"
          >
            <Stop className="w-4 h-4 mr-2" />
            Stop
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={onStart}
            className="flex-1"
          >
            <Play className="w-4 h-4 mr-2" />
            Start
          </Button>
        )}
        
        <div className="flex gap-1">
          {agent.specializations?.slice(0, 2).map(spec => (
            <Badge key={spec} variant="outline" className="text-xs">
              {spec}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}

// Tasks Manager Component
function TasksManager({ tasks, agents, onDelegate, onRefresh }) {
  return (
    <div className="flex-1 flex flex-col">
      <div className="p-6 border-b border-border">
        <h3 className="text-lg font-semibold mb-2">Task Management</h3>
        <p className="text-sm text-muted-foreground">
          Distribute and coordinate tasks across multiple agents
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6">
          {tasks.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Target className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No Active Tasks</h3>
              <p>Tasks will appear here when delegated to agents</p>
            </div>
          ) : (
            <div className="space-y-4">
              {tasks.map(task => (
                <div key={task.id} className="p-4 border border-border rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium">{task.title}</h4>
                    <Badge variant="outline" className="text-xs">
                      {task.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{task.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      Agent: {task.agentName}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Progress: {task.progress || 0}%
                    </span>
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

// Workflows Manager Component
function WorkflowsManager({ workflows, agents, onCreate, onRefresh }) {
  return (
    <div className="flex-1 flex flex-col">
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Workflows</h3>
          <Button onClick={() => onCreate({})}>
            <Plus className="w-4 h-4 mr-2" />
            New Workflow
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Create and manage multi-agent workflows
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6">
          {workflows.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <GitBranch className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No Workflows</h3>
              <p>Create workflows to coordinate multiple agents</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {workflows.map(workflow => (
                <div key={workflow.id} className="p-4 border border-border rounded-lg">
                  <h4 className="font-medium mb-2">{workflow.name}</h4>
                  <p className="text-sm text-muted-foreground mb-3">{workflow.description}</p>
                  <div className="text-xs text-muted-foreground">
                    Steps: {workflow.steps?.length || 0} | Agents: {workflow.agentCount || 0}
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

// Communication Manager Component
function CommunicationManager({ communications, agents, onSendMessage, onRefresh }) {
  return (
    <div className="flex-1 flex flex-col">
      <div className="p-6 border-b border-border">
        <h3 className="text-lg font-semibold mb-2">Agent Communication</h3>
        <p className="text-sm text-muted-foreground">
          Monitor and manage communication between agents
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6">
          {communications.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No Communications</h3>
              <p>Agent communications will appear here</p>
            </div>
          ) : (
            <div className="space-y-4">
              {communications.map(comm => (
                <div key={comm.id} className="p-4 border border-border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{comm.fromAgent}</span>
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{comm.toAgent}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(comm.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm">{comm.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// Performance Monitor Component
function PerformanceMonitor({ agents, performance, onRefresh }) {
  return (
    <div className="flex-1 flex flex-col">
      <div className="p-6 border-b border-border">
        <h3 className="text-lg font-semibold mb-2">Performance Monitor</h3>
        <p className="text-sm text-muted-foreground">
          Track agent performance and resource utilization
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* Overall Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 border border-border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-blue-600" />
                <span className="font-medium">Total Agents</span>
              </div>
              <div className="text-2xl font-bold">{agents.length}</div>
            </div>
            <div className="p-4 border border-border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-4 h-4 text-green-600" />
                <span className="font-medium">Active</span>
              </div>
              <div className="text-2xl font-bold">
                {agents.filter(a => a.status === AGENT_STATUS.WORKING).length}
              </div>
            </div>
            <div className="p-4 border border-border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-purple-600" />
                <span className="font-medium">Tasks Completed</span>
              </div>
              <div className="text-2xl font-bold">{performance.completedTasks || 0}</div>
            </div>
            <div className="p-4 border border-border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-yellow-600" />
                <span className="font-medium">Efficiency</span>
              </div>
              <div className="text-2xl font-bold">{performance.efficiency || 0}%</div>
            </div>
          </div>

          {/* Agent Performance */}
          <div>
            <h4 className="font-medium mb-4">Agent Performance</h4>
            <div className="space-y-3">
              {agents.map(agent => (
                <div key={agent.id} className="p-3 border border-border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{agent.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {agent.status}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">CPU:</span>
                      <div className="font-mono">{agent.cpuUsage || 0}%</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Memory:</span>
                      <div className="font-mono">{agent.memoryUsage || 0}MB</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Uptime:</span>
                      <div className="font-mono">{agent.uptime || '0h 0m'}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

// Create Agent Modal Component
function CreateAgentModal({ templates, onSave, onClose }) {
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    role: AGENT_ROLES.WORKER,
    specializations: [],
    capabilities: [],
    maxConcurrentTasks: 3,
    priority: 'medium'
  });

  const handleTemplateSelect = (templateId) => {
    setSelectedTemplate(templateId);
    if (templateId && templates[templateId]) {
      const template = templates[templateId];
      setFormData({
        name: template.name,
        description: template.description,
        role: template.role,
        specializations: template.specializations,
        capabilities: template.capabilities,
        maxConcurrentTasks: template.maxConcurrentTasks,
        priority: template.priority
      });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-background border border-border rounded-lg shadow-xl w-full max-w-2xl m-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h3 className="text-lg font-semibold">Create New Agent</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Template Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">Agent Template</label>
            <select
              value={selectedTemplate}
              onChange={(e) => handleTemplateSelect(e.target.value)}
              className="w-full p-2 border border-border rounded-md bg-background"
            >
              <option value="">Custom Agent</option>
              {Object.entries(templates).map(([id, template]) => (
                <option key={id} value={id}>{template.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Agent Name</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="My Agent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Role</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                className="w-full p-2 border border-border rounded-md bg-background"
              >
                {Object.entries(AGENT_ROLES).map(([key, value]) => (
                  <option key={key} value={value}>
                    {key.charAt(0) + key.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="What does this agent do?"
              className="w-full p-2 border border-border rounded-md bg-background h-20 resize-none"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Max Concurrent Tasks</label>
              <Input
                type="number"
                value={formData.maxConcurrentTasks}
                onChange={(e) => setFormData(prev => ({ ...prev, maxConcurrentTasks: parseInt(e.target.value) }))}
                min="1"
                max="10"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                className="w-full p-2 border border-border rounded-md bg-background"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Create Agent</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Create Workflow Modal Component
function CreateWorkflowModal({ agents, onSave, onClose }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    steps: [],
    agentIds: []
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-background border border-border rounded-lg shadow-xl w-full max-w-2xl m-4">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h3 className="text-lg font-semibold">Create Workflow</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Workflow Name</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="My Workflow"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Workflow description..."
              className="w-full p-2 border border-border rounded-md bg-background h-20 resize-none"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Create Workflow</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Agent Details Modal Component
function AgentDetailsModal({ agent, onClose, onDelegate }) {
  const RoleIcon = getRoleIcon(agent.role);

  const getRoleIcon = (role) => {
    switch (role) {
      case AGENT_ROLES.ORCHESTRATOR: return Crown;
      case AGENT_ROLES.COORDINATOR: return Network;
      case AGENT_ROLES.SPECIALIST: return Target;
      case AGENT_ROLES.MONITOR: return Eye;
      case AGENT_ROLES.WORKER: return User;
      default: return Brain;
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-background border border-border rounded-lg shadow-xl w-full max-w-2xl m-4">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <RoleIcon className="w-6 h-6 text-primary" />
            <h3 className="text-lg font-semibold">{agent.name}</h3>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <h4 className="font-medium mb-2">Description</h4>
            <p className="text-sm text-muted-foreground">{agent.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">Role</h4>
              <p className="text-sm">{agent.role}</p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Status</h4>
              <p className="text-sm">{agent.status}</p>
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-2">Specializations</h4>
            <div className="flex flex-wrap gap-2">
              {agent.specializations?.map(spec => (
                <Badge key={spec} variant="outline" className="text-xs">
                  {spec}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-2">Capabilities</h4>
            <div className="flex flex-wrap gap-2">
              {agent.capabilities?.map(cap => (
                <Badge key={cap} variant="secondary" className="text-xs">
                  {cap}
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button onClick={() => onDelegate({})}>
              <Send className="w-4 h-4 mr-2" />
              Delegate Task
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SubagentOrchestrator; 