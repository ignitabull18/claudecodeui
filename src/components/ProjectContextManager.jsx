import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { 
  X, 
  Save, 
  RefreshCw, 
  Folder, 
  FileText, 
  Settings, 
  LayoutTemplate, 
  Eye, 
  EyeOff,
  Plus,
  Trash2,
  Upload,
  Download,
  Copy,
  Check,
  AlertCircle,
  Building
} from 'lucide-react';

function ProjectContextManager({ isOpen, onClose, selectedProject }) {
  const [activeTab, setActiveTab] = useState('settings');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  
  // Project-specific settings
  const [projectSettings, setProjectSettings] = useState({
    customInstructions: '',
    defaultModel: '',
    temperature: null,
    maxTokens: null,
    autoExpand: false,
    skipPermissions: false,
    description: '',
    tags: []
  });

  // Context files state
  const [contextFiles, setContextFiles] = useState({
    include: [],
    exclude: [],
    includePatterns: '',
    excludePatterns: ''
  });

  // Template state
  const [availableTemplates, setAvailableTemplates] = useState([]);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
    instructions: '',
    includePatterns: '',
    excludePatterns: '',
    settings: {}
  });

  // Context preview
  const [contextPreview, setContextPreview] = useState({ included: [], excluded: [] });
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  // UI states
  const [copiedStates, setCopiedStates] = useState({});

  useEffect(() => {
    if (isOpen && selectedProject) {
      loadProjectContext();
      loadAvailableTemplates();
    }
  }, [isOpen, selectedProject]);

  const loadProjectContext = async () => {
    if (!selectedProject) return;

    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`/api/projects/${selectedProject.name}/context`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setProjectSettings(data.settings || {
          customInstructions: '',
          defaultModel: '',
          temperature: null,
          maxTokens: null,
          autoExpand: false,
          skipPermissions: false,
          description: '',
          tags: []
        });
        setContextFiles(data.contextFiles || {
          include: [],
          exclude: [],
          includePatterns: '',
          excludePatterns: ''
        });
      }
    } catch (error) {
      console.error('Error loading project context:', error);
    }
  };

  const loadAvailableTemplates = async () => {
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/api/project-templates', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAvailableTemplates(data.templates || []);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const saveProjectContext = async () => {
    if (!selectedProject) return;

    setIsSaving(true);
    setSaveStatus(null);
    
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`/api/projects/${selectedProject.name}/context`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          settings: projectSettings,
          contextFiles: contextFiles
        })
      });

      if (response.ok) {
        setSaveStatus('success');
        setTimeout(() => onClose(), 1000);
      } else {
        setSaveStatus('error');
      }
    } catch (error) {
      console.error('Error saving project context:', error);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  const generateContextPreview = async () => {
    if (!selectedProject) return;

    setIsLoadingPreview(true);
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`/api/projects/${selectedProject.name}/context-preview`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          includePatterns: contextFiles.includePatterns,
          excludePatterns: contextFiles.excludePatterns
        })
      });

      if (response.ok) {
        const data = await response.json();
        setContextPreview(data);
      }
    } catch (error) {
      console.error('Error generating context preview:', error);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const applyTemplate = (template) => {
    setProjectSettings(prev => ({
      ...prev,
      customInstructions: template.instructions,
      ...template.settings
    }));
    setContextFiles(prev => ({
      ...prev,
      includePatterns: template.includePatterns || '',
      excludePatterns: template.excludePatterns || ''
    }));
  };

  const exportConfiguration = () => {
    const config = {
      projectName: selectedProject?.displayName || selectedProject?.name,
      settings: projectSettings,
      contextFiles: contextFiles,
      exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedProject?.name || 'project'}-context.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = async (text, key) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedStates(prev => ({ ...prev, [key]: true }));
      setTimeout(() => {
        setCopiedStates(prev => ({ ...prev, [key]: false }));
      }, 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const addTag = (tag) => {
    if (tag && !projectSettings.tags.includes(tag)) {
      setProjectSettings(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }));
    }
  };

  const removeTag = (tagToRemove) => {
    setProjectSettings(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  if (!isOpen || !selectedProject) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Building className="w-6 h-6 text-green-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Project Context Manager
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {selectedProject.displayName || selectedProject.name}
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
              { id: 'settings', label: 'Project Settings', icon: Settings },
              { id: 'context', label: 'Context Files', icon: FileText },
              { id: 'templates', label: 'Templates', icon: LayoutTemplate },
              { id: 'preview', label: 'Context Preview', icon: Eye }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                  activeTab === id
                    ? 'border-green-600 text-green-600 dark:text-green-400'
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
          {/* Project Settings Tab */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Basic Information
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Project Description
                    </label>
                    <textarea
                      value={projectSettings.description}
                      onChange={(e) => setProjectSettings(prev => ({ 
                        ...prev, 
                        description: e.target.value 
                      }))}
                      placeholder="Describe this project..."
                      rows="3"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Project Tags
                    </label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {projectSettings.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary" className="flex items-center gap-1">
                          {tag}
                          <button
                            onClick={() => removeTag(tag)}
                            className="ml-1 hover:text-red-500"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add tag..."
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            addTag(e.target.value);
                            e.target.value = '';
                          }
                        }}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          const input = e.target.parentElement.querySelector('input');
                          addTag(input.value);
                          input.value = '';
                        }}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Custom Instructions */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    Custom Instructions
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(projectSettings.customInstructions, 'instructions')}
                  >
                    {copiedStates.instructions ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <textarea
                  value={projectSettings.customInstructions}
                  onChange={(e) => setProjectSettings(prev => ({ 
                    ...prev, 
                    customInstructions: e.target.value 
                  }))}
                  placeholder="Enter project-specific instructions for Claude..."
                  rows="8"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
                />
                <p className="text-xs text-gray-500">
                  These instructions will be sent to Claude at the beginning of each conversation for this project.
                </p>
              </div>

              {/* Project-Specific Preferences */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Project Preferences
                </h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        Auto-expand Tools
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Automatically expand tool outputs in this project
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={projectSettings.autoExpand}
                      onChange={(e) => setProjectSettings(prev => ({ 
                        ...prev, 
                        autoExpand: e.target.checked 
                      }))}
                      className="w-4 h-4"
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        Skip Permissions
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Skip permission prompts for this project (use with caution)
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={projectSettings.skipPermissions}
                      onChange={(e) => setProjectSettings(prev => ({ 
                        ...prev, 
                        skipPermissions: e.target.checked 
                      }))}
                      className="w-4 h-4"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Context Files Tab */}
          {activeTab === 'context' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Context File Management
                </h3>
                <Button
                  variant="outline"
                  onClick={generateContextPreview}
                  disabled={isLoadingPreview}
                >
                  {isLoadingPreview ? (
                    <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Eye className="w-4 h-4 mr-2" />
                  )}
                  Preview Context
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Include Patterns */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      Include Patterns
                    </h4>
                  </div>
                  <textarea
                    value={contextFiles.includePatterns}
                    onChange={(e) => setContextFiles(prev => ({ 
                      ...prev, 
                      includePatterns: e.target.value 
                    }))}
                    placeholder="*.js&#10;*.jsx&#10;*.ts&#10;*.tsx&#10;src/&#10;docs/README.md"
                    rows="8"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500">
                    One pattern per line. Use * for wildcards.
                  </p>
                </div>

                {/* Exclude Patterns */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      Exclude Patterns
                    </h4>
                  </div>
                  <textarea
                    value={contextFiles.excludePatterns}
                    onChange={(e) => setContextFiles(prev => ({ 
                      ...prev, 
                      excludePatterns: e.target.value 
                    }))}
                    placeholder="node_modules/&#10;*.log&#10;*.tmp&#10;dist/&#10;build/&#10;.git/"
                    rows="8"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500">
                    One pattern per line. These will override include patterns.
                  </p>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setContextFiles(prev => ({ 
                    ...prev, 
                    includePatterns: '*.js\n*.jsx\n*.ts\n*.tsx\n*.py\n*.md' 
                  }))}
                >
                  Add Common Code Files
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setContextFiles(prev => ({ 
                    ...prev, 
                    excludePatterns: 'node_modules/\n*.log\n*.tmp\ndist/\nbuild/\n.git/\n.env' 
                  }))}
                >
                  Add Common Excludes
                </Button>
              </div>
            </div>
          )}

          {/* Templates Tab */}
          {activeTab === 'templates' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Project Templates
                </h3>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowTemplateForm(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Template
                  </Button>
                  <Button variant="outline" onClick={exportConfiguration}>
                    <Download className="w-4 h-4 mr-2" />
                    Export Config
                  </Button>
                </div>
              </div>

              {availableTemplates.length > 0 ? (
                <div className="grid gap-4">
                  {availableTemplates.map((template, index) => (
                    <div
                      key={index}
                      className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {template.name}
                        </h4>
                        <Button
                          size="sm"
                          onClick={() => applyTemplate(template)}
                        >
                          Apply Template
                        </Button>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        {template.description}
                      </p>
                      <div className="flex gap-2 text-xs">
                        {template.includePatterns && (
                          <Badge variant="outline">Has Include Patterns</Badge>
                        )}
                        {template.excludePatterns && (
                          <Badge variant="outline">Has Exclude Patterns</Badge>
                        )}
                        {template.instructions && (
                          <Badge variant="outline">Has Instructions</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <LayoutTemplate className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No Templates Available
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Create templates to quickly setup similar projects
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Context Preview Tab */}
          {activeTab === 'preview' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Context Preview
                </h3>
                <Button
                  onClick={generateContextPreview}
                  disabled={isLoadingPreview}
                >
                  {isLoadingPreview ? (
                    <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  Refresh Preview
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Included Files */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      Included Files ({contextPreview.included.length})
                    </h4>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 max-h-96 overflow-y-auto">
                    {contextPreview.included.length > 0 ? (
                      <div className="space-y-1">
                        {contextPreview.included.map((file, index) => (
                          <div key={index} className="text-sm font-mono text-gray-700 dark:text-gray-300">
                            {file}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 italic">No files match include patterns</p>
                    )}
                  </div>
                </div>

                {/* Excluded Files */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      Excluded Files ({contextPreview.excluded.length})
                    </h4>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 max-h-96 overflow-y-auto">
                    {contextPreview.excluded.length > 0 ? (
                      <div className="space-y-1">
                        {contextPreview.excluded.map((file, index) => (
                          <div key={index} className="text-sm font-mono text-gray-500 dark:text-gray-400">
                            {file}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 italic">No files excluded</p>
                    )}
                  </div>
                </div>
              </div>

              {contextPreview.included.length === 0 && contextPreview.excluded.length === 0 && (
                <div className="text-center py-8">
                  <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No Context Preview Available
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Configure include/exclude patterns and click "Refresh Preview" to see which files will be included in your project context.
                  </p>
                </div>
              )}
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
              onClick={saveProjectContext}
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
      </div>
    </div>
  );
}

export default ProjectContextManager; 