import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import {
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  FileText,
  FolderPlus,
  GitMerge,
  Edit3,
  Eye,
  Play,
  Shield,
  ArrowRight,
  Lightbulb,
  Code,
  Package,
  Zap,
  Target,
  Scissors,
  Combine
} from 'lucide-react';

function CrossFileRefactoringPanel({ selectedProject, onRefactorComplete }) {
  const [activeOperation, setActiveOperation] = useState('rename');
  const [isProcessing, setIsProcessing] = useState(false);
  const [refactoringResult, setRefactoringResult] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [validationData, setValidationData] = useState(null);

  // Rename operation state
  const [renameParams, setRenameParams] = useState({
    oldName: '',
    newName: '',
    symbolType: 'function',
    targetFiles: null
  });

  // Extract operation state
  const [extractParams, setExtractParams] = useState({
    sourceFile: '',
    targetFile: '',
    startLine: 1,
    endLine: 10,
    extractType: 'function'
  });

  // Merge operation state
  const [mergeParams, setMergeParams] = useState({
    sourceFiles: [],
    targetFile: '',
    mergeStrategy: 'combine'
  });

  // Add source file to merge list
  const addSourceFile = () => {
    const newFile = prompt('Enter file path:');
    if (newFile && !mergeParams.sourceFiles.includes(newFile)) {
      setMergeParams(prev => ({
        ...prev,
        sourceFiles: [...prev.sourceFiles, newFile]
      }));
    }
  };

  const removeSourceFile = (fileToRemove) => {
    setMergeParams(prev => ({
      ...prev,
      sourceFiles: prev.sourceFiles.filter(file => file !== fileToRemove)
    }));
  };

  const previewRefactoring = async () => {
    if (!selectedProject) return;

    setIsProcessing(true);
    try {
      const token = localStorage.getItem('auth-token');
      let parameters;

      switch (activeOperation) {
        case 'rename':
          parameters = renameParams;
          break;
        case 'extract':
          parameters = {
            ...extractParams,
            codeSelection: { startLine: extractParams.startLine, endLine: extractParams.endLine }
          };
          break;
        case 'merge':
          parameters = mergeParams;
          break;
      }

      const response = await fetch(`/api/code-analysis/${selectedProject.name}/refactor/preview`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          projectRoot: selectedProject.path,
          operation: activeOperation,
          parameters
        })
      });

      if (response.ok) {
        const data = await response.json();
        setPreviewData(data.preview);
      }
    } catch (error) {
      console.error('Error previewing refactoring:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const validateRefactoring = async () => {
    if (!selectedProject) return;

    setIsProcessing(true);
    try {
      const token = localStorage.getItem('auth-token');
      let parameters;

      switch (activeOperation) {
        case 'rename':
          parameters = renameParams;
          break;
        case 'extract':
          parameters = {
            ...extractParams,
            codeSelection: { startLine: extractParams.startLine, endLine: extractParams.endLine }
          };
          break;
        case 'merge':
          parameters = mergeParams;
          break;
      }

      const response = await fetch(`/api/code-analysis/${selectedProject.name}/refactor/validate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          projectRoot: selectedProject.path,
          operation: activeOperation,
          parameters
        })
      });

      if (response.ok) {
        const data = await response.json();
        setValidationData(data.validation);
      }
    } catch (error) {
      console.error('Error validating refactoring:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const executeRefactoring = async () => {
    if (!selectedProject) return;

    setIsProcessing(true);
    try {
      const token = localStorage.getItem('auth-token');
      let endpoint;
      let body;

      switch (activeOperation) {
        case 'rename':
          endpoint = `${selectedProject.name}/refactor/rename`;
          body = {
            projectRoot: selectedProject.path,
            ...renameParams
          };
          break;
        case 'extract':
          endpoint = `${selectedProject.name}/refactor/extract`;
          body = {
            projectRoot: selectedProject.path,
            ...extractParams,
            codeSelection: { startLine: extractParams.startLine, endLine: extractParams.endLine }
          };
          break;
        case 'merge':
          endpoint = `${selectedProject.name}/refactor/merge`;
          body = {
            projectRoot: selectedProject.path,
            ...mergeParams
          };
          break;
      }

      const response = await fetch(`/api/code-analysis/${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        const data = await response.json();
        setRefactoringResult(data);
        onRefactorComplete?.(data);
      }
    } catch (error) {
      console.error('Error executing refactoring:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const getRiskLevelColor = (riskLevel) => {
    switch (riskLevel) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getOperationIcon = (operation) => {
    switch (operation) {
      case 'rename': return <Edit3 className="w-5 h-5" />;
      case 'extract': return <Scissors className="w-5 h-5" />;
      case 'merge': return <Combine className="w-5 h-5" />;
      default: return <Code className="w-5 h-5" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Operation Selection */}
      <div className="flex gap-2 p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
        {[
          { id: 'rename', label: 'Rename Symbol', icon: Edit3 },
          { id: 'extract', label: 'Extract to File', icon: Scissors },
          { id: 'merge', label: 'Merge Files', icon: Combine }
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => {
              setActiveOperation(id);
              setRefactoringResult(null);
              setPreviewData(null);
              setValidationData(null);
            }}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeOperation === id
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Operation Parameters */}
      <div className="space-y-4">
        {/* Rename Parameters */}
        {activeOperation === 'rename' && (
          <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-blue-600" />
              Rename Symbol Across Files
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Current Name
                </label>
                <Input
                  placeholder="e.g., calculateTotal"
                  value={renameParams.oldName}
                  onChange={(e) => setRenameParams(prev => ({ ...prev, oldName: e.target.value }))}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  New Name
                </label>
                <Input
                  placeholder="e.g., computeSum"
                  value={renameParams.newName}
                  onChange={(e) => setRenameParams(prev => ({ ...prev, newName: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Symbol Type
              </label>
              <select
                value={renameParams.symbolType}
                onChange={(e) => setRenameParams(prev => ({ ...prev, symbolType: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              >
                <option value="function">Function</option>
                <option value="class">Class</option>
                <option value="variable">Variable</option>
                <option value="type">Type/Interface</option>
              </select>
            </div>
          </div>
        )}

        {/* Extract Parameters */}
        {activeOperation === 'extract' && (
          <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
              <Scissors className="w-5 h-5 text-green-600" />
              Extract Code to New File
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Source File
                </label>
                <Input
                  placeholder="e.g., src/components/App.jsx"
                  value={extractParams.sourceFile}
                  onChange={(e) => setExtractParams(prev => ({ ...prev, sourceFile: e.target.value }))}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Target File
                </label>
                <Input
                  placeholder="e.g., src/utils/helpers.js"
                  value={extractParams.targetFile}
                  onChange={(e) => setExtractParams(prev => ({ ...prev, targetFile: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Start Line
                </label>
                <Input
                  type="number"
                  min="1"
                  value={extractParams.startLine}
                  onChange={(e) => setExtractParams(prev => ({ ...prev, startLine: parseInt(e.target.value) || 1 }))}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  End Line
                </label>
                <Input
                  type="number"
                  min="1"
                  value={extractParams.endLine}
                  onChange={(e) => setExtractParams(prev => ({ ...prev, endLine: parseInt(e.target.value) || 10 }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Extract Type
                </label>
                <select
                  value={extractParams.extractType}
                  onChange={(e) => setExtractParams(prev => ({ ...prev, extractType: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                >
                  <option value="function">Function</option>
                  <option value="class">Class</option>
                  <option value="component">Component</option>
                  <option value="utility">Utility</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Merge Parameters */}
        {activeOperation === 'merge' && (
          <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
              <Combine className="w-5 h-5 text-purple-600" />
              Merge Files Intelligently
            </h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Source Files
              </label>
              <div className="space-y-2">
                {mergeParams.sourceFiles.map((file, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-white dark:bg-gray-600 rounded border">
                    <FileText className="w-4 h-4 text-gray-600" />
                    <span className="flex-1 text-gray-900 dark:text-white">{file}</span>
                    <button
                      onClick={() => removeSourceFile(file)}
                      className="p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  onClick={addSourceFile}
                  className="w-full"
                >
                  <FolderPlus className="w-4 h-4 mr-2" />
                  Add Source File
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Target File
                </label>
                <Input
                  placeholder="e.g., src/combined/merged.js"
                  value={mergeParams.targetFile}
                  onChange={(e) => setMergeParams(prev => ({ ...prev, targetFile: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Merge Strategy
                </label>
                <select
                  value={mergeParams.mergeStrategy}
                  onChange={(e) => setMergeParams(prev => ({ ...prev, mergeStrategy: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                >
                  <option value="combine">Combine All</option>
                  <option value="selective">Selective Merge</option>
                  <option value="smart">Smart Merge</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <Button
          onClick={validateRefactoring}
          disabled={isProcessing}
          variant="outline"
        >
          {isProcessing ? (
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Shield className="w-4 h-4 mr-2" />
          )}
          Validate Safety
        </Button>

        <Button
          onClick={previewRefactoring}
          disabled={isProcessing}
          variant="outline"
        >
          {isProcessing ? (
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Eye className="w-4 h-4 mr-2" />
          )}
          Preview Changes
        </Button>

        <Button
          onClick={executeRefactoring}
          disabled={isProcessing || (validationData && validationData.riskLevel === 'high' && validationData.blockers.length > 0)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isProcessing ? (
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Play className="w-4 h-4 mr-2" />
          )}
          Execute Refactoring
        </Button>
      </div>

      {/* Validation Results */}
      {validationData && (
        <div className="space-y-4">
          <h4 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            Safety Validation
          </h4>

          <div className={`p-4 border rounded-lg ${getRiskLevelColor(validationData.riskLevel)}`}>
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-full bg-current bg-opacity-20">
                {validationData.riskLevel === 'high' ? <AlertTriangle className="w-5 h-5" /> :
                 validationData.riskLevel === 'medium' ? <Target className="w-5 h-5" /> :
                 <CheckCircle className="w-5 h-5" />}
              </div>
              <h5 className="font-medium">
                Risk Level: {validationData.riskLevel.toUpperCase()}
              </h5>
            </div>

            {validationData.blockers.length > 0 && (
              <div className="mb-4">
                <h6 className="font-medium mb-2 text-red-800">Blockers:</h6>
                <ul className="space-y-1">
                  {validationData.blockers.map((blocker, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <XCircle className="w-4 h-4 text-red-600 mt-0.5" />
                      <span>{blocker}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {validationData.warnings.length > 0 && (
              <div className="mb-4">
                <h6 className="font-medium mb-2">Warnings:</h6>
                <ul className="space-y-1">
                  {validationData.warnings.map((warning, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
                      <span>{warning}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {validationData.recommendations.length > 0 && (
              <div>
                <h6 className="font-medium mb-2">Recommendations:</h6>
                <ul className="space-y-1">
                  {validationData.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Lightbulb className="w-4 h-4 text-blue-600 mt-0.5" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Preview Results */}
      {previewData && (
        <div className="space-y-4">
          <h4 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
            <Eye className="w-5 h-5 text-blue-600" />
            Refactoring Preview
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900 dark:text-blue-300">Affected Files</span>
              </div>
              <div className="text-2xl font-bold text-blue-900 dark:text-blue-300">
                {previewData.affectedFiles?.length || 0}
              </div>
            </div>

            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-900 dark:text-green-300">Changes</span>
              </div>
              <div className="text-2xl font-bold text-green-900 dark:text-green-300">
                {previewData.changes?.length || 0}
              </div>
            </div>

            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-medium text-purple-900 dark:text-purple-300">Conflicts</span>
              </div>
              <div className="text-2xl font-bold text-purple-900 dark:text-purple-300">
                {previewData.conflicts?.length || 0}
              </div>
            </div>
          </div>

          {/* Affected Files */}
          {previewData.affectedFiles && previewData.affectedFiles.length > 0 && (
            <div>
              <h5 className="font-medium text-gray-900 dark:text-white mb-3">Affected Files:</h5>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {previewData.affectedFiles.map((file, index) => (
                  <div key={index} className="p-2 bg-gray-50 dark:bg-gray-700 rounded border">
                    <FileText className="w-4 h-4 text-gray-600 inline mr-2" />
                    <span className="text-gray-900 dark:text-white">{file}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Preview Changes */}
          {previewData.changes && previewData.changes.length > 0 && (
            <div>
              <h5 className="font-medium text-gray-900 dark:text-white mb-3">Changes Preview:</h5>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {previewData.changes.slice(0, 5).map((change, index) => (
                  <div key={index} className="p-3 border border-gray-200 dark:border-gray-600 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900 dark:text-white">{change.file}</span>
                      <Badge variant="outline">{change.type}</Badge>
                    </div>
                    {change.preview && change.preview.length > 0 && (
                      <div className="space-y-1">
                        {change.preview.map((diff, diffIndex) => (
                          <div key={diffIndex} className="text-xs">
                            <div className="text-red-600">- {diff.original}</div>
                            <div className="text-green-600">+ {diff.modified}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    {change.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">{change.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Refactoring Results */}
      {refactoringResult && (
        <div className="space-y-4">
          <h4 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Refactoring Complete
          </h4>

          <div className={`p-4 border rounded-lg ${
            refactoringResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-full bg-current bg-opacity-20">
                {refactoringResult.success ? 
                  <CheckCircle className="w-5 h-5 text-green-600" /> :
                  <XCircle className="w-5 h-5 text-red-600" />
                }
              </div>
              <h5 className={`font-medium ${
                refactoringResult.success ? 'text-green-800' : 'text-red-800'
              }`}>
                {refactoringResult.success ? 'Success!' : 'Failed'}
              </h5>
            </div>

            {/* Success details */}
            {refactoringResult.success && (
              <div className="space-y-2">
                {refactoringResult.filesModified && (
                  <p className="text-green-800">
                    Modified {refactoringResult.filesModified.length} files
                  </p>
                )}
                {refactoringResult.occurrencesRenamed && (
                  <p className="text-green-800">
                    Renamed {refactoringResult.occurrencesRenamed} occurrences
                  </p>
                )}
                {refactoringResult.targetFileCreated && (
                  <p className="text-green-800">
                    Created new file successfully
                  </p>
                )}
                {refactoringResult.backupCreated && (
                  <p className="text-green-800">
                    Backup created for rollback safety
                  </p>
                )}
              </div>
            )}

            {/* Conflicts */}
            {refactoringResult.conflicts && refactoringResult.conflicts.length > 0 && (
              <div className="mt-3">
                <h6 className="font-medium mb-2 text-red-800">Conflicts:</h6>
                <ul className="space-y-1">
                  {refactoringResult.conflicts.map((conflict, index) => (
                    <li key={index} className="text-red-800">
                      {conflict.file}: {conflict.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default CrossFileRefactoringPanel; 