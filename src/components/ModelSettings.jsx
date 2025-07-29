import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { Brain, Sliders, Globe, Building, Save, RefreshCw, Zap, Settings, X } from 'lucide-react';

const CLAUDE_MODELS = [
  {
    id: 'haiku',
    name: 'Claude 3 Haiku',
    description: 'Fast and efficient for everyday tasks',
    maxTokens: 200000,
    costTier: 'low',
    speed: 'fast'
  },
  {
    id: 'sonnet',
    name: 'Claude 3.5 Sonnet',
    description: 'Ideal balance of intelligence and speed',
    maxTokens: 200000,
    costTier: 'medium',
    speed: 'medium'
  },
  {
    id: 'opus',
    name: 'Claude 3 Opus',
    description: 'Most capable for complex reasoning',
    maxTokens: 200000,
    costTier: 'high',
    speed: 'slow'
  }
];

function ModelSettings({ isOpen, onClose }) {
  const [globalModelConfig, setGlobalModelConfig] = useState({
    defaultModel: 'sonnet',
    temperature: 0.7,
    maxTokens: 4096,
    topP: 1.0,
    presencePenalty: 0.0,
    frequencyPenalty: 0.0
  });

  const [projectModelConfig, setProjectModelConfig] = useState({
    enabled: false,
    model: 'sonnet',
    temperature: 0.7,
    maxTokens: 4096,
    topP: 1.0,
    presencePenalty: 0.0,
    frequencyPenalty: 0.0
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [currentProject, setCurrentProject] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadModelSettings();
      loadCurrentProject();
    }
  }, [isOpen]);

  const loadCurrentProject = async () => {
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/api/projects/current', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setCurrentProject(data.project);
      }
    } catch (error) {
      console.error('Error loading current project:', error);
    }
  };

  const loadModelSettings = () => {
    try {
      // Load global settings
      const globalSettings = localStorage.getItem('claude-model-settings-global');
      if (globalSettings) {
        setGlobalModelConfig(JSON.parse(globalSettings));
      }

      // Load project-specific settings
      const projectPath = localStorage.getItem('currentProjectPath');
      if (projectPath) {
        const projectSettings = localStorage.getItem(`claude-model-settings-${btoa(projectPath)}`);
        if (projectSettings) {
          setProjectModelConfig(JSON.parse(projectSettings));
        }
      }
    } catch (error) {
      console.error('Error loading model settings:', error);
    }
  };

  const saveModelSettings = async () => {
    setIsSaving(true);
    setSaveStatus(null);
    
    try {
      // Save global settings
      localStorage.setItem('claude-model-settings-global', JSON.stringify({
        ...globalModelConfig,
        lastUpdated: new Date().toISOString()
      }));

      // Save project-specific settings if enabled
      const projectPath = localStorage.getItem('currentProjectPath');
      if (projectPath && projectModelConfig.enabled) {
        localStorage.setItem(`claude-model-settings-${btoa(projectPath)}`, JSON.stringify({
          ...projectModelConfig,
          lastUpdated: new Date().toISOString()
        }));
      } else if (projectPath) {
        // Remove project settings if disabled
        localStorage.removeItem(`claude-model-settings-${btoa(projectPath)}`);
      }

      setSaveStatus('success');
      
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (error) {
      console.error('Error saving model settings:', error);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  const resetToDefaults = () => {
    setGlobalModelConfig({
      defaultModel: 'sonnet',
      temperature: 0.7,
      maxTokens: 4096,
      topP: 1.0,
      presencePenalty: 0.0,
      frequencyPenalty: 0.0
    });
    
    setProjectModelConfig({
      enabled: false,
      model: 'sonnet',
      temperature: 0.7,
      maxTokens: 4096,
      topP: 1.0,
      presencePenalty: 0.0,
      frequencyPenalty: 0.0
    });
  };

  const getModelBadgeColor = (model) => {
    switch (model.costTier) {
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      case 'medium': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'high': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSpeedIcon = (speed) => {
    switch (speed) {
      case 'fast': return <Zap className="w-3 h-3 text-green-600" />;
      case 'medium': return <Settings className="w-3 h-3 text-blue-600" />;
      case 'slow': return <Brain className="w-3 h-3 text-purple-600" />;
      default: return <Settings className="w-3 h-3" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Brain className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Model Configuration
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 p-6">
          <div className="space-y-8">
            {/* Global Settings */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Global Model Settings
                </h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                These settings apply to all projects unless overridden by project-specific settings.
              </p>

              {/* Model Selection */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Default Model
                </label>
                <div className="grid gap-3">
                  {CLAUDE_MODELS.map((model) => (
                    <div
                      key={model.id}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                        globalModelConfig.defaultModel === model.id
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                      }`}
                      onClick={() => setGlobalModelConfig(prev => ({ ...prev, defaultModel: model.id }))}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {getSpeedIcon(model.speed)}
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-white">
                              {model.name}
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {model.description}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getModelBadgeColor(model)}>
                            {model.costTier} cost
                          </Badge>
                          <Badge variant="outline">
                            {model.maxTokens.toLocaleString()} tokens
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Model Parameters */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Temperature ({globalModelConfig.temperature})
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={globalModelConfig.temperature}
                    onChange={(e) => setGlobalModelConfig(prev => ({ 
                      ...prev, 
                      temperature: parseFloat(e.target.value) 
                    }))}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500">Controls randomness in responses</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Max Tokens
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max="200000"
                    value={globalModelConfig.maxTokens}
                    onChange={(e) => setGlobalModelConfig(prev => ({ 
                      ...prev, 
                      maxTokens: parseInt(e.target.value) || 4096 
                    }))}
                  />
                  <p className="text-xs text-gray-500">Maximum tokens in response</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Top P ({globalModelConfig.topP})
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={globalModelConfig.topP}
                    onChange={(e) => setGlobalModelConfig(prev => ({ 
                      ...prev, 
                      topP: parseFloat(e.target.value) 
                    }))}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500">Controls diversity via nucleus sampling</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Presence Penalty ({globalModelConfig.presencePenalty})
                  </label>
                  <input
                    type="range"
                    min="-2"
                    max="2"
                    step="0.1"
                    value={globalModelConfig.presencePenalty}
                    onChange={(e) => setGlobalModelConfig(prev => ({ 
                      ...prev, 
                      presencePenalty: parseFloat(e.target.value) 
                    }))}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500">Penalizes new topics</p>
                </div>
              </div>
            </div>

            {/* Project-Specific Settings */}
            {currentProject && (
              <div className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-8">
                <div className="flex items-center gap-2">
                  <Building className="w-5 h-5 text-green-600" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    Project-Specific Settings
                  </h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Override global settings for: <strong>{currentProject?.name || 'Current Project'}</strong>
                </p>

                {/* Enable/Disable Toggle */}
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="enableProjectSettings"
                    checked={projectModelConfig.enabled}
                    onChange={(e) => setProjectModelConfig(prev => ({ 
                      ...prev, 
                      enabled: e.target.checked 
                    }))}
                    className="w-4 h-4"
                  />
                  <label htmlFor="enableProjectSettings" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Use custom settings for this project
                  </label>
                </div>

                {projectModelConfig.enabled && (
                  <div className="space-y-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    {/* Project Model Selection */}
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Project Model
                      </label>
                      <div className="grid gap-2">
                        {CLAUDE_MODELS.map((model) => (
                          <div
                            key={model.id}
                            className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                              projectModelConfig.model === model.id
                                ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                                : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                            }`}
                            onClick={() => setProjectModelConfig(prev => ({ ...prev, model: model.id }))}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {getSpeedIcon(model.speed)}
                                <span className="font-medium text-sm">{model.name}</span>
                              </div>
                              <Badge className={getModelBadgeColor(model)} size="sm">
                                {model.costTier}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Project Parameters */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Temperature ({projectModelConfig.temperature})
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={projectModelConfig.temperature}
                          onChange={(e) => setProjectModelConfig(prev => ({ 
                            ...prev, 
                            temperature: parseFloat(e.target.value) 
                          }))}
                          className="w-full"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Max Tokens
                        </label>
                        <Input
                          type="number"
                          min="1"
                          max="200000"
                          value={projectModelConfig.maxTokens}
                          onChange={(e) => setProjectModelConfig(prev => ({ 
                            ...prev, 
                            maxTokens: parseInt(e.target.value) || 4096 
                          }))}
                          size="sm"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700">
          <Button
            variant="outline"
            onClick={resetToDefaults}
            disabled={isSaving}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Reset to Defaults
          </Button>

          <div className="flex items-center gap-3">
            {saveStatus === 'success' && (
              <span className="text-sm text-green-600">Settings saved!</span>
            )}
            {saveStatus === 'error' && (
              <span className="text-sm text-red-600">Error saving settings</span>
            )}
            
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancel
            </Button>
            
            <Button
              onClick={saveModelSettings}
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
                  Save Settings
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ModelSettings; 