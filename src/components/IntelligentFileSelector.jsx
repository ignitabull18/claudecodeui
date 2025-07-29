import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import {
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  FileText,
  Target,
  Brain,
  Zap,
  Clock,
  Activity,
  Search,
  Filter,
  ArrowRight,
  TrendingUp,
  Lightbulb,
  Package,
  Sparkles,
  Focus,
  Eye,
  Settings,
  Star,
  ThumbsUp,
  Link
} from 'lucide-react';

function IntelligentFileSelector({ selectedProject, onSelectionComplete, initialFiles = [], operation = 'analysis' }) {
  const [isLoading, setIsLoading] = useState(false);
  const [smartSelection, setSmartSelection] = useState(null);
  const [contextAnalysis, setContextAnalysis] = useState(null);
  const [relevanceScores, setRelevanceScores] = useState([]);
  const [optimizedSelection, setOptimizedSelection] = useState(null);

  // Configuration state
  const [maxFiles, setMaxFiles] = useState(10);
  const [selectedOperation, setSelectedOperation] = useState(operation);
  const [contextData, setContextData] = useState({
    recentFiles: [],
    currentFile: '',
    workingSet: []
  });

  // Selection state
  const [selectedFiles, setSelectedFiles] = useState(initialFiles);
  const [candidateFiles, setCandidateFiles] = useState([]);
  const [constraints, setConstraints] = useState({
    maxFiles: 10,
    ensureDiversity: true
  });

  useEffect(() => {
    setSelectedFiles(initialFiles);
  }, [initialFiles]);

  const generateSmartSelection = async () => {
    if (!selectedProject) return;

    setIsLoading(true);
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`/api/code-analysis/${selectedProject.name}/smart-selection`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          projectRoot: selectedProject.path,
          context: contextData,
          operation: selectedOperation,
          targetFiles: selectedFiles,
          maxFiles
        })
      });

      if (response.ok) {
        const data = await response.json();
        setSmartSelection(data.selection);
        setSelectedFiles(data.selection.selectedFiles);
      }
    } catch (error) {
      console.error('Error generating smart selection:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const analyzeContext = async () => {
    if (!selectedProject) return;

    setIsLoading(true);
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`/api/code-analysis/${selectedProject.name}/context-analysis`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          projectRoot: selectedProject.path,
          recentFiles: contextData.recentFiles,
          currentFile: contextData.currentFile,
          workingSet: contextData.workingSet
        })
      });

      if (response.ok) {
        const data = await response.json();
        setContextAnalysis(data.contextAnalysis);
        setCandidateFiles(data.suggestions);
      }
    } catch (error) {
      console.error('Error analyzing context:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateRelevanceScores = async () => {
    if (!selectedProject || selectedFiles.length === 0) return;

    setIsLoading(true);
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`/api/code-analysis/${selectedProject.name}/file-relevance`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          projectRoot: selectedProject.path,
          baseFiles: selectedFiles.slice(0, 3),
          candidateFiles: candidateFiles.slice(0, 20),
          criteria: ['dependency', 'semantic', 'structural']
        })
      });

      if (response.ok) {
        const data = await response.json();
        setRelevanceScores(data.relevanceScores);
      }
    } catch (error) {
      console.error('Error calculating relevance scores:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const optimizeSelection = async () => {
    if (!selectedProject || selectedFiles.length === 0) return;

    setIsLoading(true);
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`/api/code-analysis/${selectedProject.name}/optimize-selection`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          projectRoot: selectedProject.path,
          operation: selectedOperation,
          currentSelection: selectedFiles,
          constraints
        })
      });

      if (response.ok) {
        const data = await response.json();
        setOptimizedSelection(data.optimizedSelection);
        setSelectedFiles(data.optimizedSelection.files);
      }
    } catch (error) {
      console.error('Error optimizing selection:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addFileToSelection = (file) => {
    if (!selectedFiles.includes(file)) {
      setSelectedFiles(prev => [...prev, file]);
    }
  };

  const removeFileFromSelection = (file) => {
    setSelectedFiles(prev => prev.filter(f => f !== file));
  };

  const getScoreColor = (score) => {
    if (score >= 0.8) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 0.6) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (score >= 0.4) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-gray-600 bg-gray-50 border-gray-200';
  };

  const getConfidenceIcon = (confidence) => {
    if (confidence >= 0.8) return <Star className="w-4 h-4 text-yellow-500" />;
    if (confidence >= 0.6) return <ThumbsUp className="w-4 h-4 text-blue-500" />;
    return <Eye className="w-4 h-4 text-gray-500" />;
  };

  return (
    <div className="space-y-6">
      {/* Configuration Panel */}
      <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Brain className="w-5 h-5 text-blue-600" />
          Intelligent File Selection
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Operation Type
            </label>
            <select
              value={selectedOperation}
              onChange={(e) => setSelectedOperation(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
            >
              <option value="analysis">Analysis</option>
              <option value="refactoring">Refactoring</option>
              <option value="testing">Testing</option>
              <option value="documentation">Documentation</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Max Files
            </label>
            <Input
              type="number"
              min="1"
              max="50"
              value={maxFiles}
              onChange={(e) => setMaxFiles(parseInt(e.target.value) || 10)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Current File (Context)
            </label>
            <Input
              placeholder="e.g., src/components/App.jsx"
              value={contextData.currentFile}
              onChange={(e) => setContextData(prev => ({ ...prev, currentFile: e.target.value }))}
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Recent Files (comma-separated)
          </label>
          <Input
            placeholder="src/utils/helpers.js, src/components/Button.jsx"
            value={contextData.recentFiles.join(', ')}
            onChange={(e) => setContextData(prev => ({ 
              ...prev, 
              recentFiles: e.target.value.split(',').map(f => f.trim()).filter(f => f)
            }))}
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <Button
          onClick={generateSmartSelection}
          disabled={isLoading}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isLoading ? (
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4 mr-2" />
          )}
          Generate Smart Selection
        </Button>

        <Button
          onClick={analyzeContext}
          disabled={isLoading}
          variant="outline"
        >
          {isLoading ? (
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Focus className="w-4 h-4 mr-2" />
          )}
          Analyze Context
        </Button>

        <Button
          onClick={calculateRelevanceScores}
          disabled={isLoading || selectedFiles.length === 0}
          variant="outline"
        >
          {isLoading ? (
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Target className="w-4 h-4 mr-2" />
          )}
          Calculate Relevance
        </Button>

        <Button
          onClick={optimizeSelection}
          disabled={isLoading || selectedFiles.length === 0}
          variant="outline"
        >
          {isLoading ? (
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Zap className="w-4 h-4 mr-2" />
          )}
          Optimize Selection
        </Button>
      </div>

      {/* Current Selection */}
      <div className="space-y-4">
        <h4 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          Selected Files ({selectedFiles.length})
        </h4>

        <div className="space-y-2 max-h-48 overflow-y-auto">
          {selectedFiles.map((file, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-green-600" />
                <span className="text-gray-900 dark:text-white">{file}</span>
              </div>
              <button
                onClick={() => removeFileFromSelection(file)}
                className="p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
              >
                ×
              </button>
            </div>
          ))}
          
          {selectedFiles.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No files selected. Generate a smart selection to get started.
            </div>
          )}
        </div>
      </div>

      {/* Smart Selection Results */}
      {smartSelection && (
        <div className="space-y-4">
          <h4 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
            <Brain className="w-5 h-5 text-blue-600" />
            Smart Selection Results
          </h4>

          {/* Selection Context */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Target className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900 dark:text-blue-300">Operation</span>
              </div>
              <div className="text-lg font-bold text-blue-900 dark:text-blue-300 capitalize">
                {smartSelection.context.operation}
              </div>
            </div>

            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Search className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-medium text-purple-900 dark:text-purple-300">Candidates</span>
              </div>
              <div className="text-lg font-bold text-purple-900 dark:text-purple-300">
                {smartSelection.context.totalCandidates}
              </div>
            </div>

            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-900 dark:text-green-300">Suggestions</span>
              </div>
              <div className="text-lg font-bold text-green-900 dark:text-green-300">
                {smartSelection.suggestions.length}
              </div>
            </div>
          </div>

          {/* Suggestions */}
          <div>
            <h5 className="font-medium text-gray-900 dark:text-white mb-3">
              Top Suggestions:
            </h5>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {smartSelection.suggestions.slice(0, 10).map((suggestion, index) => (
                <div key={index} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
                  <div className="flex items-center gap-3 flex-1">
                    <FileText className="w-4 h-4 text-gray-600" />
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {suggestion.file}
                        </span>
                        {getConfidenceIcon(suggestion.confidence)}
                      </div>
                      
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <div className={`px-2 py-1 rounded border ${getScoreColor(suggestion.score)}`}>
                          Score: {(suggestion.score * 100).toFixed(0)}%
                        </div>
                        <div className="px-2 py-1 bg-gray-100 dark:bg-gray-600 rounded">
                          Confidence: {(suggestion.confidence * 100).toFixed(0)}%
                        </div>
                      </div>
                      
                      {suggestion.reasons.length > 0 && (
                        <div className="mt-1">
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            {suggestion.reasons.slice(0, 2).join(', ')}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => addFileToSelection(suggestion.file)}
                    disabled={selectedFiles.includes(suggestion.file)}
                  >
                    {selectedFiles.includes(suggestion.file) ? 'Selected' : 'Add'}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Context Analysis Results */}
      {contextAnalysis && (
        <div className="space-y-4">
          <h4 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
            <Focus className="w-5 h-5 text-blue-600" />
            Context Analysis
          </h4>

          {/* Context Insights */}
          {contextAnalysis.insights.length > 0 && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <h5 className="font-medium text-blue-900 dark:text-blue-300 mb-2">Key Insights:</h5>
              <ul className="space-y-1">
                {contextAnalysis.insights.map((insight, index) => (
                  <li key={index} className="flex items-center gap-2 text-blue-800 dark:text-blue-400">
                    <Lightbulb className="w-3 h-3" />
                    <span className="text-sm">{insight}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Context Patterns */}
          {contextAnalysis.patterns && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {contextAnalysis.patterns.frequentDirectories && (
                <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                  <h5 className="font-medium text-gray-900 dark:text-white mb-3">Frequent Directories:</h5>
                  <div className="space-y-2">
                    {contextAnalysis.patterns.frequentDirectories.map((dir, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-gray-700 dark:text-gray-300">{dir.directory}</span>
                        <Badge variant="outline">{dir.frequency}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {contextAnalysis.patterns.primaryLanguages && (
                <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                  <h5 className="font-medium text-gray-900 dark:text-white mb-3">Primary Languages:</h5>
                  <div className="space-y-2">
                    {contextAnalysis.patterns.primaryLanguages.map((lang, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-gray-700 dark:text-gray-300">{lang.extension}</span>
                        <Badge variant="outline">{lang.count} files</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Relevance Scores */}
      {relevanceScores.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-600" />
            Relevance Scores
          </h4>

          <div className="space-y-2 max-h-48 overflow-y-auto">
            {relevanceScores.slice(0, 10).map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-600 rounded-lg">
                <div className="flex items-center gap-3 flex-1">
                  <FileText className="w-4 h-4 text-gray-600" />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-white">{item.file}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className={`px-2 py-1 rounded border text-xs ${getScoreColor(item.score)}`}>
                        {(item.score * 100).toFixed(0)}%
                      </div>
                      {item.reasons.length > 0 && (
                        <span className="text-xs text-gray-500">
                          {item.reasons[0]}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => addFileToSelection(item.file)}
                  disabled={selectedFiles.includes(item.file)}
                >
                  {selectedFiles.includes(item.file) ? 'Selected' : 'Add'}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Optimization Results */}
      {optimizedSelection && (
        <div className="space-y-4">
          <h4 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-blue-600" />
            Optimization Results
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-sm text-gray-600 dark:text-gray-400">Original Count</div>
              <div className="text-lg font-bold text-gray-900 dark:text-white">
                {optimizedSelection.statistics.originalCount}
              </div>
            </div>

            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="text-sm text-blue-600">Optimized Count</div>
              <div className="text-lg font-bold text-blue-900 dark:text-blue-300">
                {optimizedSelection.statistics.optimizedCount}
              </div>
            </div>

            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="text-sm text-green-600">Optimizations Applied</div>
              <div className="text-lg font-bold text-green-900 dark:text-green-300">
                {optimizedSelection.statistics.optimizationsApplied}
              </div>
            </div>
          </div>

          {optimizedSelection.optimizations.length > 0 && (
            <div>
              <h5 className="font-medium text-gray-900 dark:text-white mb-3">Applied Optimizations:</h5>
              <div className="space-y-2">
                {optimizedSelection.optimizations.map((opt, index) => (
                  <div key={index} className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Lightbulb className="w-4 h-4 text-yellow-600" />
                      <span className="font-medium text-yellow-900 dark:text-yellow-300 capitalize">
                        {opt.type.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-sm text-yellow-800 dark:text-yellow-400">
                      {opt.details}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Final Actions */}
      <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {selectedFiles.length} files selected for {selectedOperation}
        </div>
        
        <Button
          onClick={() => onSelectionComplete?.(selectedFiles)}
          disabled={selectedFiles.length === 0}
          className="bg-green-600 hover:bg-green-700"
        >
          <CheckCircle className="w-4 h-4 mr-2" />
          Apply Selection
        </Button>
      </div>
    </div>
  );
}

export default IntelligentFileSelector; 