import React, { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { 
  Brain, 
  Code, 
  Sparkles, 
  RefreshCw, 
  Play, 
  Download, 
  Copy, 
  CheckCircle, 
  AlertTriangle, 
  FileText, 
  Layers, 
  Target, 
  Settings, 
  Zap, 
  Eye,
  ArrowRight,
  Lightbulb,
  Cpu,
  Network
} from 'lucide-react';

function ContextAwareCodeGenerator({ selectedProject, isOpen, onClose }) {
  // State for code generation
  const [requirement, setRequirement] = useState('');
  const [generatedCode, setGeneratedCode] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationHistory, setGenerationHistory] = useState([]);
  
  // Context selection state
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [projectContext, setProjectContext] = useState(null);
  const [contextFactors, setContextFactors] = useState({
    codePatterns: true,
    namingConventions: true,
    architectureStyle: true,
    dependencies: true,
    recentChanges: false
  });
  
  // Generation settings
  const [generationSettings, setGenerationSettings] = useState({
    outputType: 'component', // component, function, class, module, test
    language: 'auto', // auto, javascript, typescript, python, etc.
    framework: 'auto', // auto, react, vue, express, etc.
    style: 'project-convention', // project-convention, modern, minimal, verbose
    includeTests: false,
    includeDocumentation: true
  });

  // UI state
  const [activeTab, setActiveTab] = useState('generate');
  const [analysisMode, setAnalysisMode] = useState('claude-code');
  const textareaRef = useRef(null);

  // Load analysis mode info on mount
  useEffect(() => {
    if (selectedProject) {
      loadAnalysisMode();
      loadProjectContext();
    }
  }, [selectedProject]);

  const loadAnalysisMode = async () => {
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/api/code-analysis/mode', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAnalysisMode(data.mode.currentMode);
      }
    } catch (error) {
      console.error('Error loading analysis mode:', error);
    }
  };

  const loadProjectContext = async () => {
    if (!selectedProject) return;
    
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`/api/code-analysis/${selectedProject.name}/analyze`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectRoot: selectedProject.path })
      });

      if (response.ok) {
        const data = await response.json();
        setProjectContext(data.analysis);
      }
    } catch (error) {
      console.error('Error loading project context:', error);
    }
  };

  const generateCode = async () => {
    if (!requirement.trim() || !selectedProject) return;

    setIsGenerating(true);
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`/api/code-analysis/${selectedProject.name}/generate-code`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectRoot: selectedProject.path,
          requirement,
          options: {
            selectedFiles,
            contextFactors,
            generationSettings,
            projectContext: projectContext ? {
              patterns: projectContext.codePatterns,
              architecture: projectContext.architecturePatterns,
              technologies: projectContext.summary?.technologies
            } : null
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        setGeneratedCode(data.generatedCode);
        
        // Add to history
        const historyItem = {
          id: Date.now(),
          requirement,
          code: data.generatedCode,
          timestamp: new Date().toISOString(),
          mode: data.mode,
          settings: { ...generationSettings }
        };
        setGenerationHistory(prev => [historyItem, ...prev.slice(0, 9)]); // Keep last 10
      }
    } catch (error) {
      console.error('Error generating code:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const applyFromHistory = (historyItem) => {
    setRequirement(historyItem.requirement);
    setGeneratedCode(historyItem.code);
    setGenerationSettings(historyItem.settings);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-7xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 p-6">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl border border-white/30">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">
                  AI Code Generation
                </h2>
                <p className="text-purple-100 font-medium">
                  {selectedProject?.displayName || selectedProject?.name} • Claude Code CLI
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge 
                variant={analysisMode === 'claude-code' ? 'default' : 'secondary'}
                className="bg-white/20 border-white/30 text-white backdrop-blur-sm"
              >
                Claude Code CLI
              </Badge>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-xl transition-all duration-200 hover:scale-105 text-white/80 hover:text-white"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
          <div className="flex px-6 overflow-x-auto scrollbar-hide">
            {[
              { id: 'generate', label: 'Generate Code', icon: Code },
              { id: 'context', label: 'Context Settings', icon: Settings },
              { id: 'history', label: 'Generation History', icon: FileText }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`relative px-5 py-4 text-sm font-semibold transition-all duration-200 flex items-center gap-2 whitespace-nowrap group ${
                  activeTab === id
                    ? 'text-purple-600 dark:text-purple-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400'
                }`}
              >
                <Icon className={`w-4 h-4 transition-transform duration-200 ${
                  activeTab === id ? 'scale-110' : 'group-hover:scale-105'
                }`} />
                {label}
                {/* Active tab indicator */}
                <div className={`absolute bottom-0 left-1/2 transform -translate-x-1/2 h-0.5 bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-300 ${
                  activeTab === id ? 'w-full opacity-100' : 'w-0 opacity-0 group-hover:w-full group-hover:opacity-50'
                }`}></div>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 p-8 bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
          {/* Code Generation Tab */}
          {activeTab === 'generate' && (
            <div className="space-y-6">
                             {/* Code Requirement Input */}
               <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden">
                 <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 px-6 py-4 border-b border-gray-200 dark:border-gray-600">
                   <div className="flex items-center gap-3 mb-2">
                     <div className="p-2 bg-purple-500 text-white rounded-xl shadow-lg">
                       <Lightbulb className="w-5 h-5" />
                     </div>
                     <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                       What would you like me to generate?
                     </h3>
                   </div>
                   <p className="text-sm text-purple-700 dark:text-purple-300">
                     Describe your requirements in detail for the best results
                   </p>
                 </div>
                 <div className="p-6">
                   <textarea
                     ref={textareaRef}
                     value={requirement}
                     onChange={(e) => setRequirement(e.target.value)}
                     placeholder="Describe the code you want to generate. Be specific about functionality, style, and any requirements. Examples:
• Create a React component for user authentication with email/password
• Generate a REST API endpoint for managing user profiles  
• Build a utility function for data validation with TypeScript types
• Create a responsive navigation component with mobile menu"
                     className="w-full h-36 p-4 border-2 border-gray-200 dark:border-gray-600 rounded-xl resize-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 bg-gray-50 dark:bg-gray-700 hover:bg-white dark:hover:bg-gray-600"
                   />
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <Cpu className="w-4 h-4" />
                      Context: {projectContext ? 'Loaded' : 'Loading...'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Network className="w-4 h-4" />
                      Files: {selectedFiles.length} selected
                    </span>
                  </div>
                                      <Button
                      onClick={generateCode}
                      disabled={!requirement.trim() || isGenerating}
                      className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-6 py-3 rounded-xl transition-all duration-200 hover:scale-105 shadow-lg hover:shadow-xl"
                    >
                      {isGenerating ? (
                        <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Sparkles className="w-4 h-4 mr-2" />
                      )}
                      {isGenerating ? 'Generating...' : 'Generate Code'}
                    </Button>
                  </div>
                </div>
               </div>

              {/* Quick Generation Settings */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Output Type</label>
                  <select
                    value={generationSettings.outputType}
                    onChange={(e) => setGenerationSettings(prev => ({ ...prev, outputType: e.target.value }))}
                    className="w-full mt-1 p-2 border border-gray-300 dark:border-gray-600 rounded text-sm"
                  >
                    <option value="component">React Component</option>
                    <option value="function">Function</option>
                    <option value="class">Class</option>
                    <option value="module">Module</option>
                    <option value="test">Test File</option>
                    <option value="api">API Endpoint</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Language</label>
                  <select
                    value={generationSettings.language}
                    onChange={(e) => setGenerationSettings(prev => ({ ...prev, language: e.target.value }))}
                    className="w-full mt-1 p-2 border border-gray-300 dark:border-gray-600 rounded text-sm"
                  >
                    <option value="auto">Auto-detect</option>
                    <option value="javascript">JavaScript</option>
                    <option value="typescript">TypeScript</option>
                    <option value="python">Python</option>
                    <option value="java">Java</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Style</label>
                  <select
                    value={generationSettings.style}
                    onChange={(e) => setGenerationSettings(prev => ({ ...prev, style: e.target.value }))}
                    className="w-full mt-1 p-2 border border-gray-300 dark:border-gray-600 rounded text-sm"
                  >
                    <option value="project-convention">Follow Project Style</option>
                    <option value="modern">Modern Best Practices</option>
                    <option value="minimal">Minimal Code</option>
                    <option value="verbose">Detailed & Documented</option>
                  </select>
                </div>
              </div>

              {/* Generated Code Display */}
              {generatedCode && (
                <div className="border border-gray-200 dark:border-gray-600 rounded-lg">
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 border-b">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <h4 className="font-medium text-gray-900 dark:text-white">Generated Code</h4>
                      {generatedCode.note && (
                        <Badge variant="secondary" className="text-xs">
                          {generatedCode.note}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(generatedCode.content || generatedCode)}
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Copy
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Save
                      </Button>
                    </div>
                  </div>
                  <div className="p-4">
                    <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                      <code>{generatedCode.content || generatedCode}</code>
                    </pre>
                  </div>
                </div>
              )}

              {/* Generation Status */}
              {isGenerating && (
                <div className="text-center py-8">
                  <RefreshCw className="w-16 h-16 text-purple-600 mx-auto mb-4 animate-spin" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    {analysisMode === 'claude-code' ? 'Claude Code Generating...' : 'Generating Demo Code...'}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Analyzing project context and generating code that follows your conventions
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Context Settings Tab */}
          {activeTab === 'context' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Target className="w-5 h-5 text-purple-600" />
                  Context Factors
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(contextFactors).map(([factor, enabled]) => (
                    <label key={factor} className="flex items-center space-x-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg">
                      <input
                        type="checkbox"
                        checked={enabled}
                        onChange={(e) => setContextFactors(prev => ({ ...prev, [factor]: e.target.checked }))}
                        className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      />
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white capitalize">
                          {factor.replace(/([A-Z])/g, ' $1').trim()}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {factor === 'codePatterns' && 'Analyze existing code patterns and conventions'}
                          {factor === 'namingConventions' && 'Follow project naming conventions'}
                          {factor === 'architectureStyle' && 'Match project architecture and structure'}
                          {factor === 'dependencies' && 'Consider existing dependencies and imports'}
                          {factor === 'recentChanges' && 'Consider recent file modifications'}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {projectContext && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Eye className="w-5 h-5 text-purple-600" />
                    Project Context
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                      <h4 className="font-medium text-gray-900 dark:text-white mb-2">Technologies</h4>
                      <div className="flex flex-wrap gap-1">
                        {projectContext.summary?.technologies?.frameworks?.map((tech, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {tech}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                      <h4 className="font-medium text-gray-900 dark:text-white mb-2">Code Patterns</h4>
                      <div className="space-y-1">
                        {projectContext.codePatterns?.slice(0, 3).map((pattern, index) => (
                          <div key={index} className="text-sm text-gray-600 dark:text-gray-400">
                            {pattern.type}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-600" />
                Generation History
              </h3>
              {generationHistory.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No Generation History
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Generate some code to see your history here.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {generationHistory.map((item, index) => (
                    <div key={item.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 dark:text-white mb-1">
                            {item.requirement}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {new Date(item.timestamp).toLocaleString()} • {item.mode} mode
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => applyFromHistory(item)}
                        >
                          <ArrowRight className="w-4 h-4 mr-2" />
                          Apply
                        </Button>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-500">
                        {item.settings.outputType} • {item.settings.language} • {item.settings.style}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}

export default ContextAwareCodeGenerator; 