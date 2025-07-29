import React, { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { 
  X,
  Search,
  Replace,
  Files,
  Copy,
  Move,
  Trash2,
  Edit3,
  FolderOpen,
  FileText,
  Settings,
  MoreHorizontal,
  ChevronDown,
  ChevronRight,
  Download,
  Upload,
  Filter,
  RefreshCw,
  Play,
  Square,
  GitCompare,
  ArrowLeftRight,
  Regex,
  CaseSensitive,
  WholeWord,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  Clock,
  Target,
  Zap,
  Database,
  Code,
  Folder,
  File,
  Plus,
  Minus,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Save,
  Archive,
  Scissors,
  Clipboard,
  Hash,
  Globe,
  Package
} from 'lucide-react';

const OPERATION_TYPES = {
  COPY: 'copy',
  MOVE: 'move',
  DELETE: 'delete',
  RENAME: 'rename',
  DUPLICATE: 'duplicate',
  COMPRESS: 'compress',
  EXTRACT: 'extract'
};

const SEARCH_OPTIONS = {
  CASE_SENSITIVE: 'caseSensitive',
  WHOLE_WORD: 'wholeWord',
  REGEX: 'regex',
  INCLUDE_HIDDEN: 'includeHidden',
  EXCLUDE_GITIGNORE: 'excludeGitignore'
};

const FILE_TYPES = {
  TEXT: ['txt', 'md', 'json', 'js', 'jsx', 'ts', 'tsx', 'css', 'scss', 'html', 'xml', 'yml', 'yaml'],
  CODE: ['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'c', 'cpp', 'cs', 'php', 'rb', 'go', 'rs'],
  CONFIG: ['json', 'yml', 'yaml', 'toml', 'ini', 'conf', 'config'],
  DOCS: ['md', 'txt', 'doc', 'docx', 'pdf'],
  IMAGES: ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp'],
  ARCHIVES: ['zip', 'tar', 'gz', 'rar', '7z']
};

function AdvancedFileOperations({ isOpen, onClose, selectedProject, initialFiles = [] }) {
  const [activeTab, setActiveTab] = useState('bulk');
  const [selectedFiles, setSelectedFiles] = useState(new Set());
  const [fileTree, setFileTree] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [searchOptions, setSearchOptions] = useState({
    caseSensitive: false,
    wholeWord: false,
    regex: false,
    includeHidden: false,
    excludeGitignore: true
  });
  const [searchResults, setSearchResults] = useState([]);
  const [searchInProgress, setSearchInProgress] = useState(false);
  const [bulkOperation, setBulkOperation] = useState(null);
  const [operationProgress, setOperationProgress] = useState(0);
  const [comparisonFiles, setComparisonFiles] = useState({ left: null, right: null });
  const [diffResults, setDiffResults] = useState(null);
  const [refactorOptions, setRefactorOptions] = useState({
    renameSymbol: '',
    newSymbolName: '',
    updateReferences: true,
    includeComments: false
  });
  const [fileFilters, setFileFilters] = useState({
    type: 'all',
    size: 'all',
    modified: 'all',
    extension: ''
  });
  const [operationHistory, setOperationHistory] = useState([]);
  const [expandedDirs, setExpandedDirs] = useState(new Set());

  useEffect(() => {
    if (isOpen && selectedProject) {
      loadFileTree();
      loadOperationHistory();
    }
  }, [isOpen, selectedProject]);

  const loadFileTree = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`/api/file-operations/${selectedProject.name}/tree`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setFileTree(data.files || []);
      }
    } catch (error) {
      console.error('Error loading file tree:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadOperationHistory = async () => {
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`/api/file-operations/${selectedProject.name}/history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setOperationHistory(data.history || []);
      }
    } catch (error) {
      console.error('Error loading operation history:', error);
    }
  };

  const performSearch = async () => {
    if (!searchQuery.trim()) return;

    setSearchInProgress(true);
    setSearchResults([]);

    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`/api/file-operations/${selectedProject.name}/search`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: searchQuery,
          options: searchOptions,
          fileTypes: fileFilters.type !== 'all' ? [fileFilters.type] : null,
          extensions: fileFilters.extension ? [fileFilters.extension] : null
        })
      });

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.results || []);
      }
    } catch (error) {
      console.error('Error performing search:', error);
    } finally {
      setSearchInProgress(false);
    }
  };

  const performReplace = async (replaceAll = false) => {
    if (!searchQuery.trim() || !replaceQuery.trim()) return;

    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`/api/file-operations/${selectedProject.name}/replace`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          searchQuery,
          replaceQuery,
          options: searchOptions,
          replaceAll,
          files: replaceAll ? null : Array.from(selectedFiles)
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`Replaced ${data.replacements} occurrences in ${data.filesModified} files`);
        
        // Refresh search results
        await performSearch();
      }
    } catch (error) {
      console.error('Error performing replace:', error);
    }
  };

  const performBulkOperation = async (operation, options = {}) => {
    if (selectedFiles.size === 0) return;

    setBulkOperation(operation);
    setOperationProgress(0);

    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`/api/file-operations/${selectedProject.name}/bulk`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          operation,
          files: Array.from(selectedFiles),
          options
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`Bulk operation completed: ${data.message}`);
        
        // Refresh file tree
        await loadFileTree();
        
        // Clear selection
        setSelectedFiles(new Set());
        
        // Add to history
        setOperationHistory(prev => [{
          id: Date.now(),
          operation,
          files: selectedFiles.size,
          timestamp: new Date().toISOString(),
          success: true
        }, ...prev.slice(0, 49)]);
      }
    } catch (error) {
      console.error('Error performing bulk operation:', error);
    } finally {
      setBulkOperation(null);
      setOperationProgress(0);
    }
  };

  const compareFiles = async (leftFile, rightFile) => {
    setComparisonFiles({ left: leftFile, right: rightFile });

    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`/api/file-operations/${selectedProject.name}/compare`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          leftFile: leftFile.path,
          rightFile: rightFile.path
        })
      });

      if (response.ok) {
        const data = await response.json();
        setDiffResults(data.diff);
      }
    } catch (error) {
      console.error('Error comparing files:', error);
    }
  };

  const performRefactoring = async (type, options) => {
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`/api/file-operations/${selectedProject.name}/refactor`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type,
          options,
          files: Array.from(selectedFiles)
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`Refactoring completed: ${data.message}`);
        
        // Refresh file tree
        await loadFileTree();
      }
    } catch (error) {
      console.error('Error performing refactoring:', error);
    }
  };

  const toggleFileSelection = (filePath) => {
    const newSelection = new Set(selectedFiles);
    if (newSelection.has(filePath)) {
      newSelection.delete(filePath);
    } else {
      newSelection.add(filePath);
    }
    setSelectedFiles(newSelection);
  };

  const selectAllFiles = () => {
    const allFiles = getAllFilePaths(fileTree);
    setSelectedFiles(new Set(allFiles));
  };

  const clearSelection = () => {
    setSelectedFiles(new Set());
  };

  const getAllFilePaths = (tree) => {
    const paths = [];
    const traverse = (items) => {
      items.forEach(item => {
        if (item.type === 'file') {
          paths.push(item.path);
        }
        if (item.children) {
          traverse(item.children);
        }
      });
    };
    traverse(tree);
    return paths;
  };

  const toggleDirectory = (path) => {
    const newExpanded = new Set(expandedDirs);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedDirs(newExpanded);
  };

  const getFileIcon = (fileName) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (FILE_TYPES.IMAGES.includes(ext)) return <FileText className="w-4 h-4 text-purple-500" />;
    if (FILE_TYPES.CODE.includes(ext)) return <Code className="w-4 h-4 text-blue-500" />;
    if (FILE_TYPES.CONFIG.includes(ext)) return <Settings className="w-4 h-4 text-orange-500" />;
    if (FILE_TYPES.DOCS.includes(ext)) return <FileText className="w-4 h-4 text-green-500" />;
    if (FILE_TYPES.ARCHIVES.includes(ext)) return <Package className="w-4 h-4 text-red-500" />;
    return <File className="w-4 h-4 text-gray-500" />;
  };

  const renderFileTree = (items, level = 0) => {
    return items.map((item) => (
      <div key={item.path} className="select-none">
        <div
          className={`flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer ${
            selectedFiles.has(item.path) ? 'bg-blue-50 dark:bg-blue-900/20' : ''
          }`}
          style={{ paddingLeft: `${level * 16 + 12}px` }}
        >
          {item.type === 'file' && (
            <input
              type="checkbox"
              checked={selectedFiles.has(item.path)}
              onChange={() => toggleFileSelection(item.path)}
              className="mr-2"
            />
          )}
          
          <div
            className="flex items-center gap-2 flex-1"
            onClick={() => {
              if (item.type === 'directory') {
                toggleDirectory(item.path);
              }
            }}
          >
            {item.type === 'directory' ? (
              expandedDirs.has(item.path) ? (
                <FolderOpen className="w-4 h-4 text-blue-500" />
              ) : (
                <Folder className="w-4 h-4 text-gray-500" />
              )
            ) : (
              getFileIcon(item.name)
            )}
            <span className="text-sm text-gray-900 dark:text-white">
              {item.name}
            </span>
          </div>

          {item.type === 'file' && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <span>{item.size ? `${Math.round(item.size / 1024)}KB` : ''}</span>
            </div>
          )}
        </div>
        
        {item.type === 'directory' && 
         expandedDirs.has(item.path) && 
         item.children && 
         renderFileTree(item.children, level + 1)}
      </div>
    ));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-7xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Files className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Advanced File Operations
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {selectedProject?.displayName || selectedProject?.name} • {selectedFiles.size} files selected
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={loadFileTree}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
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
              { id: 'bulk', label: 'Bulk Operations', icon: Files },
              { id: 'search', label: 'Search & Replace', icon: Search },
              { id: 'compare', label: 'File Compare', icon: GitCompare },
              { id: 'refactor', label: 'Refactoring', icon: Edit3 }
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
        <div className="flex-1 overflow-hidden">
          {/* Bulk Operations Tab */}
          {activeTab === 'bulk' && (
            <div className="h-full flex">
              {/* File Tree */}
              <div className="w-1/2 border-r border-gray-200 dark:border-gray-700">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      File Selection
                    </h3>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={selectAllFiles}>
                        Select All
                      </Button>
                      <Button size="sm" variant="outline" onClick={clearSelection}>
                        Clear
                      </Button>
                    </div>
                  </div>
                  
                  {/* File Type Filter */}
                  <div className="flex items-center gap-2 mb-3">
                    <Filter className="w-4 h-4 text-gray-500" />
                    <select
                      value={fileFilters.type}
                      onChange={(e) => setFileFilters({...fileFilters, type: e.target.value})}
                      className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700"
                    >
                      <option value="all">All Files</option>
                      <option value="code">Code Files</option>
                      <option value="text">Text Files</option>
                      <option value="images">Images</option>
                      <option value="config">Config Files</option>
                      <option value="docs">Documents</option>
                    </select>
                  </div>
                </div>
                
                <ScrollArea className="h-[400px] p-4">
                  {loading ? (
                    <div className="text-center py-8">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-gray-400" />
                      <p className="text-sm text-gray-600 dark:text-gray-400">Loading files...</p>
                    </div>
                  ) : (
                    renderFileTree(fileTree)
                  )}
                </ScrollArea>
              </div>

              {/* Operations Panel */}
              <div className="w-1/2 p-6">
                <h3 className="font-medium text-gray-900 dark:text-white mb-4">
                  Bulk Operations
                </h3>
                
                {selectedFiles.size === 0 ? (
                  <div className="text-center py-12">
                    <Files className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">
                      Select files to perform bulk operations
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-300">
                        {selectedFiles.size} files selected
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        onClick={() => performBulkOperation(OPERATION_TYPES.COPY)}
                        disabled={!!bulkOperation}
                        className="flex items-center gap-2"
                      >
                        <Copy className="w-4 h-4" />
                        Copy
                      </Button>
                      <Button
                        onClick={() => performBulkOperation(OPERATION_TYPES.MOVE)}
                        disabled={!!bulkOperation}
                        className="flex items-center gap-2"
                      >
                        <Move className="w-4 h-4" />
                        Move
                      </Button>
                      <Button
                        onClick={() => performBulkOperation(OPERATION_TYPES.DELETE)}
                        disabled={!!bulkOperation}
                        variant="outline"
                        className="flex items-center gap-2 border-red-300 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </Button>
                      <Button
                        onClick={() => performBulkOperation(OPERATION_TYPES.DUPLICATE)}
                        disabled={!!bulkOperation}
                        variant="outline"
                        className="flex items-center gap-2"
                      >
                        <Files className="w-4 h-4" />
                        Duplicate
                      </Button>
                      <Button
                        onClick={() => performBulkOperation(OPERATION_TYPES.COMPRESS)}
                        disabled={!!bulkOperation}
                        variant="outline"
                        className="flex items-center gap-2"
                      >
                        <Archive className="w-4 h-4" />
                        Compress
                      </Button>
                      <Button
                        onClick={() => performBulkOperation(OPERATION_TYPES.RENAME)}
                        disabled={!!bulkOperation}
                        variant="outline"
                        className="flex items-center gap-2"
                      >
                        <Edit3 className="w-4 h-4" />
                        Rename
                      </Button>
                    </div>

                    {bulkOperation && (
                      <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <RefreshCw className="w-4 h-4 animate-spin text-yellow-600" />
                          <span className="text-sm font-medium text-yellow-900 dark:text-yellow-300">
                            Performing {bulkOperation}...
                          </span>
                        </div>
                        <div className="w-full bg-yellow-200 dark:bg-yellow-800 rounded-full h-2">
                          <div
                            className="bg-yellow-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${operationProgress}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Operation History */}
                <div className="mt-8">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                    Recent Operations
                  </h4>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {operationHistory.slice(0, 5).map((op) => (
                      <div key={op.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                        <div className="flex items-center gap-2">
                          {op.success ? (
                            <CheckCircle className="w-3 h-3 text-green-600" />
                          ) : (
                            <XCircle className="w-3 h-3 text-red-600" />
                          )}
                          <span className="text-xs font-medium text-gray-900 dark:text-white">
                            {op.operation}
                          </span>
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            {op.files} files
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(op.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Search & Replace Tab */}
          {activeTab === 'search' && (
            <div className="h-full flex flex-col p-6">
              {/* Search Controls */}
              <div className="mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Search for:
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Enter search term..."
                        className="pl-10"
                        onKeyPress={(e) => e.key === 'Enter' && performSearch()}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Replace with:
                    </label>
                    <div className="relative">
                      <Replace className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        value={replaceQuery}
                        onChange={(e) => setReplaceQuery(e.target.value)}
                        placeholder="Enter replacement text..."
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>

                {/* Search Options */}
                <div className="flex items-center gap-4 mb-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={searchOptions.caseSensitive}
                      onChange={(e) => setSearchOptions({...searchOptions, caseSensitive: e.target.checked})}
                    />
                    <CaseSensitive className="w-4 h-4" />
                    <span className="text-sm">Case sensitive</span>
                  </label>
                  
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={searchOptions.wholeWord}
                      onChange={(e) => setSearchOptions({...searchOptions, wholeWord: e.target.checked})}
                    />
                    <WholeWord className="w-4 h-4" />
                    <span className="text-sm">Whole word</span>
                  </label>
                  
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={searchOptions.regex}
                      onChange={(e) => setSearchOptions({...searchOptions, regex: e.target.checked})}
                    />
                    <Regex className="w-4 h-4" />
                    <span className="text-sm">Regular expression</span>
                  </label>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3">
                  <Button
                    onClick={performSearch}
                    disabled={!searchQuery.trim() || searchInProgress}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {searchInProgress ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4 mr-2" />
                    )}
                    Search
                  </Button>
                  
                  <Button
                    onClick={() => performReplace(false)}
                    disabled={!searchQuery.trim() || !replaceQuery.trim() || selectedFiles.size === 0}
                    variant="outline"
                  >
                    <Replace className="w-4 h-4 mr-2" />
                    Replace Selected
                  </Button>
                  
                  <Button
                    onClick={() => performReplace(true)}
                    disabled={!searchQuery.trim() || !replaceQuery.trim()}
                    variant="outline"
                    className="border-orange-300 text-orange-600 hover:bg-orange-50"
                  >
                    <Replace className="w-4 h-4 mr-2" />
                    Replace All
                  </Button>
                </div>
              </div>

              {/* Search Results */}
              <div className="flex-1">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    Search Results ({searchResults.length})
                  </h3>
                  {searchResults.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => {
                        const filePaths = searchResults.map(r => r.file);
                        setSelectedFiles(new Set(filePaths));
                      }}>
                        Select All Results
                      </Button>
                    </div>
                  )}
                </div>

                <ScrollArea className="h-[400px] border border-gray-200 dark:border-gray-600 rounded-lg">
                  {searchResults.length === 0 ? (
                    <div className="text-center py-12">
                      <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                        {searchQuery ? 'No results found' : 'Enter a search term'}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {searchQuery ? 'Try adjusting your search criteria' : 'Use the search box above to find files'}
                      </p>
                    </div>
                  ) : (
                    <div className="p-4 space-y-3">
                      {searchResults.map((result, index) => (
                        <div key={index} className="border border-gray-200 dark:border-gray-600 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={selectedFiles.has(result.file)}
                                onChange={() => toggleFileSelection(result.file)}
                              />
                              {getFileIcon(result.file)}
                              <span className="font-medium text-gray-900 dark:text-white">
                                {result.file}
                              </span>
                            </div>
                            <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                              {result.matches} matches
                            </Badge>
                          </div>
                          
                          {result.preview && (
                            <div className="space-y-1">
                              {result.preview.slice(0, 3).map((preview, idx) => (
                                <div key={idx} className="text-xs bg-gray-50 dark:bg-gray-700 p-2 rounded font-mono">
                                  <span className="text-gray-500 mr-2">Line {preview.line}:</span>
                                  <span dangerouslySetInnerHTML={{ 
                                    __html: preview.text.replace(
                                      new RegExp(searchQuery, searchOptions.caseSensitive ? 'g' : 'gi'),
                                      '<mark class="bg-yellow-200 dark:bg-yellow-800">$&</mark>'
                                    )
                                  }} />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </div>
          )}

          {/* File Compare Tab */}
          {activeTab === 'compare' && (
            <div className="h-full flex flex-col p-6">
              <div className="text-center py-12">
                <GitCompare className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  File Comparison Tool
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                  Compare two files side by side with detailed diff visualization.
                </p>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Select Files to Compare
                </Button>
              </div>
            </div>
          )}

          {/* Refactoring Tab */}
          {activeTab === 'refactor' && (
            <div className="h-full flex flex-col p-6">
              <div className="text-center py-12">
                <Edit3 className="w-16 h-16 text-green-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Workspace Refactoring
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                  Perform workspace-wide refactoring operations like symbol renaming and code restructuring.
                </p>
                <Button>
                  <Zap className="w-4 h-4 mr-2" />
                  Start Refactoring
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
            <span>{selectedFiles.size} files selected</span>
            {searchResults.length > 0 && (
              <>
                <span>•</span>
                <span>{searchResults.length} search results</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            {selectedFiles.size > 0 && (
              <Button onClick={clearSelection}>
                <X className="w-4 h-4 mr-2" />
                Clear Selection
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdvancedFileOperations; 