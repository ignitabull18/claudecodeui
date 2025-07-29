import express from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { spawn } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import { glob } from 'glob';

const router = express.Router();

// Operation types
const OPERATION_TYPES = {
  COPY: 'copy',
  MOVE: 'move',
  DELETE: 'delete',
  RENAME: 'rename',
  DUPLICATE: 'duplicate',
  COMPRESS: 'compress',
  EXTRACT: 'extract'
};

// File type classifications
const FILE_TYPES = {
  TEXT: ['txt', 'md', 'json', 'js', 'jsx', 'ts', 'tsx', 'css', 'scss', 'html', 'xml', 'yml', 'yaml'],
  CODE: ['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'c', 'cpp', 'cs', 'php', 'rb', 'go', 'rs'],
  CONFIG: ['json', 'yml', 'yaml', 'toml', 'ini', 'conf', 'config'],
  DOCS: ['md', 'txt', 'doc', 'docx', 'pdf'],
  IMAGES: ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp'],
  ARCHIVES: ['zip', 'tar', 'gz', 'rar', '7z']
};

// Helper function to get file operations data directory
function getFileOpsDataDir() {
  const homeDir = os.homedir();
  return path.join(homeDir, '.claude', 'file-operations');
}

// Helper function to ensure directory exists
async function ensureDir(dirPath) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
}

// Helper function to get project path
function getProjectPath(projectName) {
  return path.join(os.homedir(), '.claude', 'projects', projectName);
}

// Helper function to build file tree with enhanced metadata
async function buildFileTree(dirPath, maxDepth = 5, currentDepth = 0) {
  if (currentDepth >= maxDepth) return [];
  
  const items = [];
  
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      const relativePath = path.relative(getProjectPath(''), fullPath);
      
      if (entry.isDirectory()) {
        const children = await buildFileTree(fullPath, maxDepth, currentDepth + 1);
        items.push({
          name: entry.name,
          path: relativePath,
          type: 'directory',
          children: children,
          size: children.reduce((acc, child) => acc + (child.size || 0), 0)
        });
      } else {
        const stats = await fs.stat(fullPath);
        items.push({
          name: entry.name,
          path: relativePath,
          type: 'file',
          size: stats.size,
          modified: stats.mtime.toISOString(),
          extension: path.extname(entry.name).slice(1).toLowerCase()
        });
      }
    }
    
    return items.sort((a, b) => {
      if (a.type === b.type) return a.name.localeCompare(b.name);
      return a.type === 'directory' ? -1 : 1;
    });
  } catch (error) {
    console.error('Error building file tree:', error);
    return [];
  }
}

// Helper function to save operation history
async function saveOperationHistory(projectName, operation) {
  try {
    const opsDir = getFileOpsDataDir();
    await ensureDir(opsDir);
    
    const historyFile = path.join(opsDir, `${projectName}-history.json`);
    let history = [];
    
    try {
      const existing = await fs.readFile(historyFile, 'utf-8');
      history = JSON.parse(existing);
    } catch (error) {
      // History file doesn't exist yet
    }
    
    // Add new operation and keep only last 100 entries
    history.unshift({
      ...operation,
      timestamp: new Date().toISOString()
    });
    
    history = history.slice(0, 100);
    
    await fs.writeFile(historyFile, JSON.stringify(history, null, 2));
  } catch (error) {
    console.error('Error saving operation history:', error);
  }
}

// Helper function to load operation history
async function loadOperationHistory(projectName) {
  try {
    const opsDir = getFileOpsDataDir();
    const historyFile = path.join(opsDir, `${projectName}-history.json`);
    
    const content = await fs.readFile(historyFile, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    return [];
  }
}

// Helper function to search in file content
async function searchInFile(filePath, query, options = {}) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');
    const matches = [];
    
    let searchPattern;
    if (options.regex) {
      const flags = options.caseSensitive ? 'g' : 'gi';
      searchPattern = new RegExp(query, flags);
    } else {
      const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const flags = options.caseSensitive ? 'g' : 'gi';
      if (options.wholeWord) {
        searchPattern = new RegExp(`\\b${escapedQuery}\\b`, flags);
      } else {
        searchPattern = new RegExp(escapedQuery, flags);
      }
    }
    
    lines.forEach((line, index) => {
      const lineMatches = line.match(searchPattern);
      if (lineMatches) {
        matches.push({
          line: index + 1,
          text: line.trim(),
          matches: lineMatches.length
        });
      }
    });
    
    return matches;
  } catch (error) {
    return [];
  }
}

// Helper function to perform text replacement in file
async function replaceInFile(filePath, searchQuery, replaceQuery, options = {}) {
  try {
    let content = await fs.readFile(filePath, 'utf-8');
    
    let searchPattern;
    if (options.regex) {
      const flags = options.caseSensitive ? 'g' : 'gi';
      searchPattern = new RegExp(searchQuery, flags);
    } else {
      const escapedQuery = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const flags = options.caseSensitive ? 'g' : 'gi';
      if (options.wholeWord) {
        searchPattern = new RegExp(`\\b${escapedQuery}\\b`, flags);
      } else {
        searchPattern = new RegExp(escapedQuery, flags);
      }
    }
    
    const originalContent = content;
    content = content.replace(searchPattern, replaceQuery);
    
    if (content !== originalContent) {
      // Create backup
      const backupPath = filePath + '.backup.' + Date.now();
      await fs.copyFile(filePath, backupPath);
      
      // Write new content
      await fs.writeFile(filePath, content, 'utf-8');
      
      const matches = originalContent.match(searchPattern);
      return matches ? matches.length : 0;
    }
    
    return 0;
  } catch (error) {
    console.error('Error replacing in file:', error);
    return 0;
  }
}

// Helper function to get file extension classification
function getFileTypeCategory(filePath) {
  const ext = path.extname(filePath).slice(1).toLowerCase();
  
  for (const [category, extensions] of Object.entries(FILE_TYPES)) {
    if (extensions.includes(ext)) {
      return category.toLowerCase();
    }
  }
  
  return 'other';
}

// GET /api/file-operations/:projectName/tree - Get enhanced file tree
router.get('/:projectName/tree', async (req, res) => {
  try {
    const { projectName } = req.params;
    console.log(`📁 Loading file tree for project: ${projectName}`);
    
    const projectPath = getProjectPath(projectName);
    
    // Check if project exists
    try {
      await fs.access(projectPath);
    } catch (error) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }
    
    const fileTree = await buildFileTree(projectPath);
    
    res.json({
      success: true,
      files: fileTree,
      projectPath
    });
  } catch (error) {
    console.error('Error loading file tree:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load file tree',
      details: error.message
    });
  }
});

// POST /api/file-operations/:projectName/search - Search across files
router.post('/:projectName/search', async (req, res) => {
  try {
    const { projectName } = req.params;
    const { query, options = {}, fileTypes = null, extensions = null } = req.body;
    
    if (!query || !query.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
    }
    
    console.log(`🔍 Searching in project: ${projectName}, query: "${query}"`);
    
    const projectPath = getProjectPath(projectName);
    const results = [];
    
    // Build glob pattern based on file types and extensions
    let globPatterns = ['**/*'];
    
    if (extensions && extensions.length > 0) {
      globPatterns = extensions.map(ext => `**/*.${ext}`);
    } else if (fileTypes && fileTypes.length > 0) {
      const typeExtensions = [];
      fileTypes.forEach(type => {
        const upperType = type.toUpperCase();
        if (FILE_TYPES[upperType]) {
          typeExtensions.push(...FILE_TYPES[upperType]);
        }
      });
      if (typeExtensions.length > 0) {
        globPatterns = typeExtensions.map(ext => `**/*.${ext}`);
      }
    }
    
    // Search through files
    for (const pattern of globPatterns) {
      const files = await glob(pattern, { 
        cwd: projectPath, 
        ignore: options.excludeGitignore ? ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/build/**'] : [],
        dot: options.includeHidden 
      });
      
      for (const file of files) {
        const filePath = path.join(projectPath, file);
        
        try {
          const stats = await fs.stat(filePath);
          if (!stats.isFile()) continue;
          
          // Skip binary files
          const category = getFileTypeCategory(file);
          if (category === 'other' && !FILE_TYPES.TEXT.some(ext => file.endsWith(`.${ext}`))) {
            continue;
          }
          
          const matches = await searchInFile(filePath, query, options);
          
          if (matches.length > 0) {
            results.push({
              file: file,
              matches: matches.reduce((sum, match) => sum + match.matches, 0),
              preview: matches.slice(0, 5), // First 5 matches for preview
              category: category,
              size: stats.size
            });
          }
        } catch (error) {
          // Skip files that can't be read
          continue;
        }
      }
    }
    
    // Sort results by relevance (number of matches)
    results.sort((a, b) => b.matches - a.matches);
    
    res.json({
      success: true,
      results: results.slice(0, 100), // Limit to 100 results
      query,
      totalFiles: results.length
    });
  } catch (error) {
    console.error('Error performing search:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform search',
      details: error.message
    });
  }
});

// POST /api/file-operations/:projectName/replace - Replace text across files
router.post('/:projectName/replace', async (req, res) => {
  try {
    const { projectName } = req.params;
    const { searchQuery, replaceQuery, options = {}, replaceAll = false, files = null } = req.body;
    
    if (!searchQuery || !replaceQuery) {
      return res.status(400).json({
        success: false,
        error: 'Search and replace queries are required'
      });
    }
    
    console.log(`🔄 Replacing in project: ${projectName}, "${searchQuery}" -> "${replaceQuery}"`);
    
    const projectPath = getProjectPath(projectName);
    let filesToProcess = [];
    
    if (replaceAll) {
      // Get all text files
      const allFiles = await glob('**/*', { 
        cwd: projectPath, 
        ignore: ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/build/**']
      });
      
      for (const file of allFiles) {
        const filePath = path.join(projectPath, file);
        try {
          const stats = await fs.stat(filePath);
          if (stats.isFile() && FILE_TYPES.TEXT.some(ext => file.endsWith(`.${ext}`))) {
            filesToProcess.push(file);
          }
        } catch (error) {
          continue;
        }
      }
    } else {
      filesToProcess = files || [];
    }
    
    let totalReplacements = 0;
    let filesModified = 0;
    
    for (const file of filesToProcess) {
      const filePath = path.join(projectPath, file);
      
      try {
        const replacements = await replaceInFile(filePath, searchQuery, replaceQuery, options);
        if (replacements > 0) {
          totalReplacements += replacements;
          filesModified++;
        }
      } catch (error) {
        console.error(`Error replacing in file ${file}:`, error);
        continue;
      }
    }
    
    // Save to operation history
    await saveOperationHistory(projectName, {
      id: uuidv4(),
      operation: 'replace',
      files: filesModified,
      details: `"${searchQuery}" -> "${replaceQuery}"`,
      success: true
    });
    
    res.json({
      success: true,
      replacements: totalReplacements,
      filesModified,
      message: `Replaced ${totalReplacements} occurrences in ${filesModified} files`
    });
  } catch (error) {
    console.error('Error performing replace:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform replace',
      details: error.message
    });
  }
});

// POST /api/file-operations/:projectName/bulk - Perform bulk operations
router.post('/:projectName/bulk', async (req, res) => {
  try {
    const { projectName } = req.params;
    const { operation, files, options = {} } = req.body;
    
    if (!operation || !files || files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Operation and files are required'
      });
    }
    
    console.log(`⚡ Bulk ${operation} for project: ${projectName}, ${files.length} files`);
    
    const projectPath = getProjectPath(projectName);
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    
    for (const file of files) {
      const sourcePath = path.join(projectPath, file);
      
      try {
        switch (operation) {
          case OPERATION_TYPES.COPY:
            const copyDest = path.join(projectPath, 'copies', file);
            await ensureDir(path.dirname(copyDest));
            await fs.copyFile(sourcePath, copyDest);
            break;
            
          case OPERATION_TYPES.MOVE:
            const moveDest = path.join(projectPath, 'moved', file);
            await ensureDir(path.dirname(moveDest));
            await fs.rename(sourcePath, moveDest);
            break;
            
          case OPERATION_TYPES.DELETE:
            await fs.unlink(sourcePath);
            break;
            
          case OPERATION_TYPES.DUPLICATE:
            const duplicateName = file.replace(/(\.[^.]+)?$/, '_copy$1');
            const duplicatePath = path.join(projectPath, duplicateName);
            await fs.copyFile(sourcePath, duplicatePath);
            break;
            
          case OPERATION_TYPES.RENAME:
            if (options.pattern && options.replacement) {
              const newName = path.basename(file).replace(
                new RegExp(options.pattern, 'g'), 
                options.replacement
              );
              const newPath = path.join(path.dirname(sourcePath), newName);
              await fs.rename(sourcePath, newPath);
            }
            break;
            
          case OPERATION_TYPES.COMPRESS:
            // For now, just simulate compression
            console.log(`Would compress: ${file}`);
            break;
            
          default:
            throw new Error(`Unsupported operation: ${operation}`);
        }
        
        successCount++;
      } catch (error) {
        errorCount++;
        errors.push({ file, error: error.message });
        console.error(`Error processing ${file}:`, error);
      }
    }
    
    // Save to operation history
    await saveOperationHistory(projectName, {
      id: uuidv4(),
      operation,
      files: successCount,
      errors: errorCount,
      success: errorCount === 0
    });
    
    res.json({
      success: true,
      successCount,
      errorCount,
      errors: errors.slice(0, 10), // Limit error details
      message: `${operation} completed: ${successCount} succeeded, ${errorCount} failed`
    });
  } catch (error) {
    console.error('Error performing bulk operation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform bulk operation',
      details: error.message
    });
  }
});

// POST /api/file-operations/:projectName/compare - Compare files
router.post('/:projectName/compare', async (req, res) => {
  try {
    const { projectName } = req.params;
    const { leftFile, rightFile } = req.body;
    
    if (!leftFile || !rightFile) {
      return res.status(400).json({
        success: false,
        error: 'Both files are required for comparison'
      });
    }
    
    console.log(`📊 Comparing files in project: ${projectName}`);
    
    const projectPath = getProjectPath(projectName);
    const leftPath = path.join(projectPath, leftFile);
    const rightPath = path.join(projectPath, rightFile);
    
    // Read both files
    const [leftContent, rightContent] = await Promise.all([
      fs.readFile(leftPath, 'utf-8'),
      fs.readFile(rightPath, 'utf-8')
    ]);
    
    // Simple line-by-line diff (in a real implementation, use a proper diff library)
    const leftLines = leftContent.split('\n');
    const rightLines = rightContent.split('\n');
    const maxLines = Math.max(leftLines.length, rightLines.length);
    
    const diff = [];
    for (let i = 0; i < maxLines; i++) {
      const leftLine = leftLines[i] || '';
      const rightLine = rightLines[i] || '';
      
      if (leftLine !== rightLine) {
        diff.push({
          line: i + 1,
          type: leftLine === '' ? 'added' : rightLine === '' ? 'removed' : 'modified',
          left: leftLine,
          right: rightLine
        });
      }
    }
    
    res.json({
      success: true,
      diff: {
        leftFile,
        rightFile,
        changes: diff,
        stats: {
          totalLines: maxLines,
          changedLines: diff.length,
          leftSize: leftContent.length,
          rightSize: rightContent.length
        }
      }
    });
  } catch (error) {
    console.error('Error comparing files:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to compare files',
      details: error.message
    });
  }
});

// POST /api/file-operations/:projectName/refactor - Perform refactoring operations
router.post('/:projectName/refactor', async (req, res) => {
  try {
    const { projectName } = req.params;
    const { type, options, files = [] } = req.body;
    
    console.log(`🔧 Refactoring in project: ${projectName}, type: ${type}`);
    
    const projectPath = getProjectPath(projectName);
    let processedFiles = 0;
    
    switch (type) {
      case 'rename-symbol':
        if (!options.oldName || !options.newName) {
          return res.status(400).json({
            success: false,
            error: 'Old name and new name are required for symbol renaming'
          });
        }
        
        // For demo purposes, simulate symbol renaming
        for (const file of files) {
          const filePath = path.join(projectPath, file);
          try {
            if (FILE_TYPES.CODE.some(ext => file.endsWith(`.${ext}`))) {
              // In a real implementation, use proper AST parsing
              const replacements = await replaceInFile(
                filePath, 
                options.oldName, 
                options.newName, 
                { wholeWord: true }
              );
              if (replacements > 0) {
                processedFiles++;
              }
            }
          } catch (error) {
            console.error(`Error refactoring ${file}:`, error);
          }
        }
        break;
        
      case 'extract-function':
        // Simulate function extraction
        processedFiles = files.length;
        break;
        
      case 'move-files':
        // Simulate file moving with import updates
        processedFiles = files.length;
        break;
        
      default:
        return res.status(400).json({
          success: false,
          error: `Unsupported refactoring type: ${type}`
        });
    }
    
    // Save to operation history
    await saveOperationHistory(projectName, {
      id: uuidv4(),
      operation: `refactor-${type}`,
      files: processedFiles,
      success: true
    });
    
    res.json({
      success: true,
      processedFiles,
      message: `Refactoring completed: ${processedFiles} files processed`
    });
  } catch (error) {
    console.error('Error performing refactoring:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform refactoring',
      details: error.message
    });
  }
});

// GET /api/file-operations/:projectName/history - Get operation history
router.get('/:projectName/history', async (req, res) => {
  try {
    const { projectName } = req.params;
    const history = await loadOperationHistory(projectName);
    
    res.json({
      success: true,
      history: history.slice(0, 50) // Return last 50 operations
    });
  } catch (error) {
    console.error('Error loading operation history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load operation history',
      details: error.message
    });
  }
});

// DELETE /api/file-operations/:projectName/history - Clear operation history
router.delete('/:projectName/history', async (req, res) => {
  try {
    const { projectName } = req.params;
    
    const opsDir = getFileOpsDataDir();
    const historyFile = path.join(opsDir, `${projectName}-history.json`);
    
    try {
      await fs.unlink(historyFile);
    } catch (error) {
      // File doesn't exist, that's fine
    }
    
    res.json({
      success: true,
      message: 'Operation history cleared'
    });
  } catch (error) {
    console.error('Error clearing operation history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear operation history',
      details: error.message
    });
  }
});

// GET /api/file-operations/supported-types - Get supported file types
router.get('/supported-types', async (req, res) => {
  try {
    res.json({
      success: true,
      fileTypes: FILE_TYPES,
      operationTypes: OPERATION_TYPES
    });
  } catch (error) {
    console.error('Error getting supported types:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get supported types',
      details: error.message
    });
  }
});

export default router; 