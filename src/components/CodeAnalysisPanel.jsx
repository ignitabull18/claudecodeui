import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { 
  X, 
  BarChart3, 
  RefreshCw, 
  Play, 
  CheckCircle, 
  Activity, 
  AlertTriangle, 
  Lightbulb,
  FileText,
  TrendingUp,
  TrendingDown,
  Brain,
  TreePine,
  Code,
  Network,
  Layers
} from 'lucide-react';

function CodeAnalysisPanel({ isOpen, onClose, projectName }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisData, setAnalysisData] = useState(null);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'quality', label: 'Quality', icon: CheckCircle },
    { id: 'complexity', label: 'Complexity', icon: Activity },
    { id: 'architecture', label: 'Architecture', icon: TreePine }
  ];

  const runCodeAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const response = await fetch(`/api/code-analysis/${projectName}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          includeMetrics: true,
          includeDependencies: true,
          includeComplexity: true
        })
      });

      if (response.ok) {
        const result = await response.json();
        setAnalysisData(result);
      } else {
        console.error('Analysis failed:', response.statusText);
      }
    } catch (error) {
      console.error('Error running analysis:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-7xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="relative bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 p-6">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl border border-white/30">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">
                  Code Analysis Panel
                </h2>
                <p className="text-blue-100 font-medium">
                  Multi-file Codebase Intelligence System
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge 
                variant="secondary" 
                className="bg-white/20 hover:bg-white/30 border-white/30 text-white backdrop-blur-sm transition-all duration-200 hover:scale-105"
              >
                {projectName || 'Current Project'}
              </Badge>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-xl transition-all duration-200 hover:scale-105 text-white/80 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
          <div className="flex px-6 overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    group relative px-5 py-4 text-sm font-semibold transition-all duration-200 whitespace-nowrap flex items-center gap-2
                    ${isActive 
                      ? 'text-blue-600 dark:text-blue-400' 
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                    }
                  `}
                >
                  <IconComponent className={`w-4 h-4 transition-all duration-200 ${
                    isActive ? 'scale-110' : 'group-hover:scale-105'
                  }`} />
                  {tab.label}
                  
                  <div className={`
                    absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-200
                    ${isActive ? 'w-full opacity-100' : 'w-0 opacity-0 group-hover:w-full group-hover:opacity-50'}
                  `} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 p-8 bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
          {!analysisData && !isAnalyzing ? (
            <div className="text-center py-16">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full blur-3xl opacity-20 w-32 h-32 mx-auto"></div>
                <BarChart3 className="relative w-20 h-20 text-blue-500 mx-auto mb-6" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                Ready to Analyze
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                Get comprehensive insights about code quality, complexity, patterns, and refactoring opportunities for your project.
              </p>
              <Button 
                onClick={runCodeAnalysis} 
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 rounded-xl transition-all duration-200 hover:scale-105 shadow-lg hover:shadow-xl"
              >
                <Play className="w-5 h-5 mr-2" />
                Start Intelligence Analysis
              </Button>
            </div>
          ) : isAnalyzing ? (
            <div className="text-center py-16">
              <RefreshCw className="w-16 h-16 text-blue-500 mx-auto mb-6 animate-spin" />
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                Analyzing Codebase...
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Running comprehensive analysis on your project files.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Overview Tab */}
              {activeTab === 'overview' && analysisData && (
                <div className="space-y-6">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    Analysis Overview
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                      <div className="flex items-center gap-3 mb-3">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                          Quality Score
                        </span>
                      </div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {analysisData.overall?.qualityScore || 85}/100
                      </div>
                    </div>
                    
                    <div className="p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                      <div className="flex items-center gap-3 mb-3">
                        <Activity className="w-5 h-5 text-orange-600" />
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                          Complexity
                        </span>
                      </div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {analysisData.overall?.complexity || 'Medium'}
                      </div>
                    </div>
                    
                    <div className="p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                      <div className="flex items-center gap-3 mb-3">
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                          Issues
                        </span>
                      </div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {analysisData.issues?.length || 0}
                      </div>
                    </div>
                    
                    <div className="p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                      <div className="flex items-center gap-3 mb-3">
                        <FileText className="w-5 h-5 text-blue-600" />
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                          Files
                        </span>
                      </div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {analysisData.filesAnalyzed || 0}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Quality Tab */}
              {activeTab === 'quality' && (
                <div className="text-center py-16">
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-6" />
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                    Quality Analysis
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Quality metrics and recommendations will be displayed here.
                  </p>
                </div>
              )}

              {/* Complexity Tab */}
              {activeTab === 'complexity' && (
                <div className="text-center py-16">
                  <Activity className="w-16 h-16 text-orange-500 mx-auto mb-6" />
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                    Complexity Analysis
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Code complexity metrics and insights will be displayed here.
                  </p>
                </div>
              )}

              {/* Architecture Tab */}
              {activeTab === 'architecture' && (
                <div className="text-center py-16">
                  <TreePine className="w-16 h-16 text-green-500 mx-auto mb-6" />
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                    Architecture Analysis
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Project architecture patterns and structure will be displayed here.
                  </p>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
            {analysisData && (
              <>
                <span>Last analyzed: {new Date(analysisData.timestamp || Date.now()).toLocaleString()}</span>
                <span>•</span>
                <span>{analysisData.filesAnalyzed || 0} files analyzed</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button 
              onClick={runCodeAnalysis} 
              disabled={isAnalyzing}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                  Analyzing...
                </>
              ) : (
                <>
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Re-analyze
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CodeAnalysisPanel; 