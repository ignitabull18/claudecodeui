import express from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { glob } from 'glob';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Helper function to get project context directory
const getProjectContextDir = (projectName) => {
  return path.join(os.homedir(), '.claude', 'projects', projectName, 'context');
};

// Helper function to get templates directory
const getTemplatesDir = () => {
  return path.join(os.homedir(), '.claude', 'templates');
};

// Helper function to ensure directory exists
const ensureDir = async (dirPath) => {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
};

// GET /api/projects/:projectName/context - Get project context settings
router.get('/:projectName/context', async (req, res) => {
  try {
    const { projectName } = req.params;
    const contextDir = getProjectContextDir(projectName);
    
    try {
      const settingsFile = path.join(contextDir, 'settings.json');
      const contextFile = path.join(contextDir, 'context.json');
      
      let settings = {};
      let contextFiles = { include: [], exclude: [], includePatterns: '', excludePatterns: '' };
      
      // Load settings
      try {
        const settingsData = await fs.readFile(settingsFile, 'utf8');
        settings = JSON.parse(settingsData);
      } catch (error) {
        // Settings file doesn't exist, use defaults
      }
      
      // Load context files
      try {
        const contextData = await fs.readFile(contextFile, 'utf8');
        contextFiles = JSON.parse(contextData);
      } catch (error) {
        // Context file doesn't exist, use defaults
      }
      
      res.json({
        settings,
        contextFiles
      });
    } catch (error) {
      // Project context doesn't exist, return defaults
      res.json({
        settings: {
          customInstructions: '',
          defaultModel: '',
          temperature: null,
          maxTokens: null,
          autoExpand: false,
          skipPermissions: false,
          description: '',
          tags: []
        },
        contextFiles: {
          include: [],
          exclude: [],
          includePatterns: '',
          excludePatterns: ''
        }
      });
    }
  } catch (error) {
    console.error('Error loading project context:', error);
    res.status(500).json({ error: 'Failed to load project context' });
  }
});

// POST /api/projects/:projectName/context - Save project context settings
router.post('/:projectName/context', async (req, res) => {
  try {
    const { projectName } = req.params;
    const { settings, contextFiles } = req.body;
    
    const contextDir = getProjectContextDir(projectName);
    await ensureDir(contextDir);
    
    // Save settings
    if (settings) {
      const settingsFile = path.join(contextDir, 'settings.json');
      await fs.writeFile(settingsFile, JSON.stringify({
        ...settings,
        lastUpdated: new Date().toISOString()
      }, null, 2));
    }
    
    // Save context files
    if (contextFiles) {
      const contextFile = path.join(contextDir, 'context.json');
      await fs.writeFile(contextFile, JSON.stringify({
        ...contextFiles,
        lastUpdated: new Date().toISOString()
      }, null, 2));
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving project context:', error);
    res.status(500).json({ error: 'Failed to save project context' });
  }
});

// POST /api/projects/:projectName/context-preview - Generate context preview
router.post('/:projectName/context-preview', async (req, res) => {
  try {
    const { projectName } = req.params;
    const { includePatterns, excludePatterns } = req.body;
    
    // Get the actual project directory
    const projectsDir = path.join(os.homedir(), '.claude', 'projects');
    const projectDir = path.join(projectsDir, projectName);
    
    // Find the actual project path (this is a simplified version)
    let actualProjectPath = projectName.replace(/-/g, '/');
    
    // Try to read the project metadata to get the real path
    try {
      const metadataFile = path.join(projectDir, 'metadata.json');
      const metadata = JSON.parse(await fs.readFile(metadataFile, 'utf8'));
      if (metadata.projectPath) {
        actualProjectPath = metadata.projectPath;
      }
    } catch (error) {
      // No metadata, use decoded path
    }
    
    if (!actualProjectPath || actualProjectPath.startsWith('/')) {
      // Invalid or absolute path, try to resolve it
      try {
        await fs.access(actualProjectPath);
      } catch (error) {
        return res.json({ included: [], excluded: [], error: 'Project path not found' });
      }
    }
    
    const included = [];
    const excluded = [];
    
    // Parse patterns
    const includePatternsList = includePatterns ? includePatterns.split('\n').filter(p => p.trim()) : ['**/*'];
    const excludePatternsList = excludePatterns ? excludePatterns.split('\n').filter(p => p.trim()) : [];
    
    try {
      // Use glob to find matching files
      const cwd = actualProjectPath;
      
      // Get all files matching include patterns
      for (const pattern of includePatternsList) {
        try {
          const matches = await glob(pattern.trim(), { 
            cwd, 
            dot: false,
            nodir: true,
            ignore: excludePatternsList.map(p => p.trim())
          });
          
          matches.forEach(file => {
            if (!included.includes(file)) {
              included.push(file);
            }
          });
        } catch (error) {
          console.warn(`Error processing include pattern ${pattern}:`, error.message);
        }
      }
      
      // Get files that would be excluded
      for (const pattern of excludePatternsList) {
        try {
          const matches = await glob(pattern.trim(), { 
            cwd, 
            dot: false,
            nodir: true
          });
          
          matches.forEach(file => {
            if (!excluded.includes(file)) {
              excluded.push(file);
            }
          });
        } catch (error) {
          console.warn(`Error processing exclude pattern ${pattern}:`, error.message);
        }
      }
      
      // Sort results
      included.sort();
      excluded.sort();
      
      res.json({
        included: included.slice(0, 1000), // Limit results
        excluded: excluded.slice(0, 1000)
      });
    } catch (error) {
      console.warn('Error generating context preview:', error);
      res.json({ 
        included: [], 
        excluded: [], 
        error: 'Unable to access project directory' 
      });
    }
  } catch (error) {
    console.error('Error generating context preview:', error);
    res.status(500).json({ error: 'Failed to generate context preview' });
  }
});

// GET /api/project-templates - Get available project templates
router.get('/templates', async (req, res) => {
  try {
    const templatesDir = getTemplatesDir();
    
    try {
      await fs.access(templatesDir);
    } catch (error) {
      // Templates directory doesn't exist, return empty array
      return res.json({ templates: [] });
    }
    
    const files = await fs.readdir(templatesDir);
    const templates = [];
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const templatePath = path.join(templatesDir, file);
          const templateData = await fs.readFile(templatePath, 'utf8');
          const template = JSON.parse(templateData);
          templates.push(template);
        } catch (error) {
          console.warn(`Error loading template ${file}:`, error.message);
        }
      }
    }
    
    res.json({ templates });
  } catch (error) {
    console.error('Error loading templates:', error);
    res.status(500).json({ error: 'Failed to load templates' });
  }
});

// POST /api/project-templates - Create new project template
router.post('/templates', async (req, res) => {
  try {
    const template = req.body;
    const templatesDir = getTemplatesDir();
    await ensureDir(templatesDir);
    
    // Generate filename from template name
    const filename = template.name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '.json';
    const templatePath = path.join(templatesDir, filename);
    
    // Add metadata
    const templateData = {
      ...template,
      id: filename.replace('.json', ''),
      created: new Date().toISOString(),
      updated: new Date().toISOString()
    };
    
    await fs.writeFile(templatePath, JSON.stringify(templateData, null, 2));
    
    res.json({ success: true, template: templateData });
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({ error: 'Failed to create template' });
  }
});

// DELETE /api/project-templates/:templateId - Delete project template
router.delete('/templates/:templateId', async (req, res) => {
  try {
    const { templateId } = req.params;
    const templatesDir = getTemplatesDir();
    const templatePath = path.join(templatesDir, templateId + '.json');
    
    await fs.unlink(templatePath);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

export default router; 