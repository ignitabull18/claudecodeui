import express from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { db } from '../database/db.js';

const router = express.Router();

// Helper function to get user settings data directory
function getUserSettingsDataDir() {
  const homeDir = os.homedir();
  return path.join(homeDir, '.claude', 'user-settings');
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

// Initialize user settings database tables
function initializeUserSettingsTables() {
  try {
    // User settings sync table
    db.exec(`
      CREATE TABLE IF NOT EXISTS user_settings_sync (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        settings_data TEXT NOT NULL,
        settings_hash TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        UNIQUE(user_id)
      )
    `);

    // User preferences table
    db.exec(`
      CREATE TABLE IF NOT EXISTS user_preferences (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        preference_key TEXT NOT NULL,
        preference_value TEXT NOT NULL,
        category TEXT DEFAULT 'general',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        UNIQUE(user_id, preference_key)
      )
    `);

    // User keyboard shortcuts table
    db.exec(`
      CREATE TABLE IF NOT EXISTS user_shortcuts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        shortcut_id TEXT NOT NULL,
        key_combination TEXT NOT NULL,
        description TEXT,
        category TEXT DEFAULT 'general',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        UNIQUE(user_id, shortcut_id)
      )
    `);

    // User theme settings table
    db.exec(`
      CREATE TABLE IF NOT EXISTS user_themes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        theme_name TEXT DEFAULT 'default',
        theme_data TEXT NOT NULL,
        is_active BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Indexes for performance
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_user_preferences_user ON user_preferences(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_preferences_key ON user_preferences(preference_key);
      CREATE INDEX IF NOT EXISTS idx_user_shortcuts_user ON user_shortcuts(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_shortcuts_category ON user_shortcuts(category);
      CREATE INDEX IF NOT EXISTS idx_user_themes_user ON user_themes(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_themes_active ON user_themes(is_active);
    `);

    console.log('✅ User settings database tables initialized');
  } catch (error) {
    console.error('❌ Error initializing user settings tables:', error);
  }
}

// Initialize user settings tables on startup
initializeUserSettingsTables();

// Helper function to generate settings hash
function generateSettingsHash(settings) {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(JSON.stringify(settings)).digest('hex');
}

// GET /api/user/settings/sync - Get user settings
router.get('/sync', async (req, res) => {
  try {
    const userId = req.user.id;

    console.log(`⚙️ Loading settings for user: ${userId}`);

    // Get settings from database
    const stmt = db.prepare(`
      SELECT settings_data, settings_hash, updated_at
      FROM user_settings_sync 
      WHERE user_id = ?
    `);
    
    const settingsRecord = stmt.get(userId);

    if (settingsRecord) {
      res.json({
        success: true,
        settings: JSON.parse(settingsRecord.settings_data),
        hash: settingsRecord.settings_hash,
        lastUpdated: settingsRecord.updated_at
      });
    } else {
      // No settings found, return default structure
      res.json({
        success: true,
        settings: null,
        hash: null,
        lastUpdated: null
      });
    }
  } catch (error) {
    console.error('Error loading user settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load user settings',
      details: error.message
    });
  }
});

// POST /api/user/settings/sync - Save user settings
router.post('/sync', async (req, res) => {
  try {
    const userId = req.user.id;
    const { shortcuts, themeSettings, interfaceSettings, privacySettings, lastUpdated } = req.body;

    console.log(`💾 Saving settings for user: ${userId}`);

    const settings = {
      shortcuts,
      themeSettings,
      interfaceSettings,
      privacySettings,
      lastUpdated: lastUpdated || new Date().toISOString()
    };

    const settingsData = JSON.stringify(settings);
    const settingsHash = generateSettingsHash(settings);

    // Save to database
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO user_settings_sync 
      (user_id, settings_data, settings_hash, updated_at)
      VALUES (?, ?, ?, datetime('now'))
    `);
    
    stmt.run(userId, settingsData, settingsHash);

    // Also save individual preferences for easier querying
    if (interfaceSettings) {
      const prefStmt = db.prepare(`
        INSERT OR REPLACE INTO user_preferences 
        (user_id, preference_key, preference_value, category, updated_at)
        VALUES (?, ?, ?, 'interface', datetime('now'))
      `);

      Object.entries(interfaceSettings).forEach(([key, value]) => {
        prefStmt.run(userId, key, JSON.stringify(value));
      });
    }

    // Save shortcuts
    if (shortcuts) {
      // Clear existing shortcuts
      const clearStmt = db.prepare('DELETE FROM user_shortcuts WHERE user_id = ?');
      clearStmt.run(userId);

      // Insert new shortcuts
      const shortcutStmt = db.prepare(`
        INSERT INTO user_shortcuts 
        (user_id, shortcut_id, key_combination, description, category)
        VALUES (?, ?, ?, ?, ?)
      `);

      Object.entries(shortcuts).forEach(([shortcutId, shortcut]) => {
        const keyCombination = JSON.stringify({
          key: shortcut.key,
          modifiers: shortcut.modifiers
        });
        shortcutStmt.run(userId, shortcutId, keyCombination, shortcut.description, shortcut.category || 'general');
      });
    }

    // Save theme settings
    if (themeSettings) {
      const themeStmt = db.prepare(`
        INSERT OR REPLACE INTO user_themes 
        (user_id, theme_name, theme_data, is_active, updated_at)
        VALUES (?, 'custom', ?, 1, datetime('now'))
      `);
      
      themeStmt.run(userId, JSON.stringify(themeSettings));
    }

    res.json({
      success: true,
      hash: settingsHash,
      message: 'Settings saved successfully',
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error saving user settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save user settings',
      details: error.message
    });
  }
});

// GET /api/user/preferences - Get user preferences by category
router.get('/preferences', async (req, res) => {
  try {
    const userId = req.user.id;
    const { category } = req.query;

    console.log(`🔧 Loading preferences for user: ${userId}, category: ${category || 'all'}`);

    let query = 'SELECT preference_key, preference_value, category FROM user_preferences WHERE user_id = ?';
    let params = [userId];

    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }

    query += ' ORDER BY category, preference_key';

    const stmt = db.prepare(query);
    const preferences = stmt.all(...params);

    // Group by category
    const groupedPreferences = preferences.reduce((acc, pref) => {
      if (!acc[pref.category]) {
        acc[pref.category] = {};
      }
      acc[pref.category][pref.preference_key] = JSON.parse(pref.preference_value);
      return acc;
    }, {});

    res.json({
      success: true,
      preferences: category ? groupedPreferences[category] || {} : groupedPreferences
    });
  } catch (error) {
    console.error('Error loading user preferences:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load user preferences',
      details: error.message
    });
  }
});

// POST /api/user/preferences - Save user preference
router.post('/preferences', async (req, res) => {
  try {
    const userId = req.user.id;
    const { key, value, category = 'general' } = req.body;

    if (!key || value === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Preference key and value are required'
      });
    }

    console.log(`💾 Saving preference for user: ${userId}, key: ${key}`);

    const stmt = db.prepare(`
      INSERT OR REPLACE INTO user_preferences 
      (user_id, preference_key, preference_value, category, updated_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `);
    
    stmt.run(userId, key, JSON.stringify(value), category);

    res.json({
      success: true,
      message: 'Preference saved successfully'
    });
  } catch (error) {
    console.error('Error saving user preference:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save user preference',
      details: error.message
    });
  }
});

// GET /api/user/shortcuts - Get user keyboard shortcuts
router.get('/shortcuts', async (req, res) => {
  try {
    const userId = req.user.id;
    const { category } = req.query;

    console.log(`⌨️ Loading shortcuts for user: ${userId}, category: ${category || 'all'}`);

    let query = 'SELECT shortcut_id, key_combination, description, category FROM user_shortcuts WHERE user_id = ?';
    let params = [userId];

    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }

    query += ' ORDER BY category, shortcut_id';

    const stmt = db.prepare(query);
    const shortcuts = stmt.all(...params);

    // Transform to expected format
    const formattedShortcuts = shortcuts.reduce((acc, shortcut) => {
      const keyCombo = JSON.parse(shortcut.key_combination);
      acc[shortcut.shortcut_id] = {
        key: keyCombo.key,
        modifiers: keyCombo.modifiers,
        description: shortcut.description,
        category: shortcut.category
      };
      return acc;
    }, {});

    res.json({
      success: true,
      shortcuts: formattedShortcuts
    });
  } catch (error) {
    console.error('Error loading user shortcuts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load user shortcuts',
      details: error.message
    });
  }
});

// POST /api/user/shortcuts - Save user keyboard shortcut
router.post('/shortcuts', async (req, res) => {
  try {
    const userId = req.user.id;
    const { shortcutId, key, modifiers, description, category = 'general' } = req.body;

    if (!shortcutId || !key) {
      return res.status(400).json({
        success: false,
        error: 'Shortcut ID and key are required'
      });
    }

    console.log(`⌨️ Saving shortcut for user: ${userId}, shortcut: ${shortcutId}`);

    const keyCombination = JSON.stringify({ key, modifiers: modifiers || [] });

    const stmt = db.prepare(`
      INSERT OR REPLACE INTO user_shortcuts 
      (user_id, shortcut_id, key_combination, description, category, updated_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `);
    
    stmt.run(userId, shortcutId, keyCombination, description, category);

    res.json({
      success: true,
      message: 'Shortcut saved successfully'
    });
  } catch (error) {
    console.error('Error saving user shortcut:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save user shortcut',
      details: error.message
    });
  }
});

// DELETE /api/user/shortcuts/:shortcutId - Delete user keyboard shortcut
router.delete('/shortcuts/:shortcutId', async (req, res) => {
  try {
    const userId = req.user.id;
    const { shortcutId } = req.params;

    console.log(`🗑️ Deleting shortcut for user: ${userId}, shortcut: ${shortcutId}`);

    const stmt = db.prepare('DELETE FROM user_shortcuts WHERE user_id = ? AND shortcut_id = ?');
    const result = stmt.run(userId, shortcutId);

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        error: 'Shortcut not found'
      });
    }

    res.json({
      success: true,
      message: 'Shortcut deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting user shortcut:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete user shortcut',
      details: error.message
    });
  }
});

// GET /api/user/themes - Get user themes
router.get('/themes', async (req, res) => {
  try {
    const userId = req.user.id;

    console.log(`🎨 Loading themes for user: ${userId}`);

    const stmt = db.prepare(`
      SELECT theme_name, theme_data, is_active, created_at, updated_at
      FROM user_themes 
      WHERE user_id = ?
      ORDER BY created_at DESC
    `);
    
    const themes = stmt.all(userId);

    const formattedThemes = themes.map(theme => ({
      name: theme.theme_name,
      data: JSON.parse(theme.theme_data),
      isActive: Boolean(theme.is_active),
      createdAt: theme.created_at,
      updatedAt: theme.updated_at
    }));

    res.json({
      success: true,
      themes: formattedThemes
    });
  } catch (error) {
    console.error('Error loading user themes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load user themes',
      details: error.message
    });
  }
});

// POST /api/user/themes - Save user theme
router.post('/themes', async (req, res) => {
  try {
    const userId = req.user.id;
    const { name = 'custom', themeData, setActive = false } = req.body;

    if (!themeData) {
      return res.status(400).json({
        success: false,
        error: 'Theme data is required'
      });
    }

    console.log(`🎨 Saving theme for user: ${userId}, theme: ${name}`);

    // If setting as active, deactivate other themes first
    if (setActive) {
      const deactivateStmt = db.prepare('UPDATE user_themes SET is_active = 0 WHERE user_id = ?');
      deactivateStmt.run(userId);
    }

    const stmt = db.prepare(`
      INSERT OR REPLACE INTO user_themes 
      (user_id, theme_name, theme_data, is_active, updated_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `);
    
    stmt.run(userId, name, JSON.stringify(themeData), setActive ? 1 : 0);

    res.json({
      success: true,
      message: 'Theme saved successfully'
    });
  } catch (error) {
    console.error('Error saving user theme:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save user theme',
      details: error.message
    });
  }
});

// DELETE /api/user/themes/:themeName - Delete user theme
router.delete('/themes/:themeName', async (req, res) => {
  try {
    const userId = req.user.id;
    const { themeName } = req.params;

    console.log(`🗑️ Deleting theme for user: ${userId}, theme: ${themeName}`);

    const stmt = db.prepare('DELETE FROM user_themes WHERE user_id = ? AND theme_name = ?');
    const result = stmt.run(userId, themeName);

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        error: 'Theme not found'
      });
    }

    res.json({
      success: true,
      message: 'Theme deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting user theme:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete user theme',
      details: error.message
    });
  }
});

// POST /api/user/settings/reset - Reset user settings
router.post('/reset', async (req, res) => {
  try {
    const userId = req.user.id;
    const { category } = req.body;

    console.log(`🔄 Resetting settings for user: ${userId}, category: ${category || 'all'}`);

    if (category) {
      // Reset specific category
      switch (category) {
        case 'shortcuts':
          db.prepare('DELETE FROM user_shortcuts WHERE user_id = ?').run(userId);
          break;
        case 'preferences':
          db.prepare('DELETE FROM user_preferences WHERE user_id = ?').run(userId);
          break;
        case 'themes':
          db.prepare('DELETE FROM user_themes WHERE user_id = ?').run(userId);
          break;
        case 'sync':
          db.prepare('DELETE FROM user_settings_sync WHERE user_id = ?').run(userId);
          break;
        default:
          return res.status(400).json({
            success: false,
            error: 'Invalid category'
          });
      }
    } else {
      // Reset all settings
      db.prepare('DELETE FROM user_settings_sync WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM user_preferences WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM user_shortcuts WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM user_themes WHERE user_id = ?').run(userId);
    }

    res.json({
      success: true,
      message: category ? `${category} settings reset successfully` : 'All settings reset successfully'
    });
  } catch (error) {
    console.error('Error resetting user settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset user settings',
      details: error.message
    });
  }
});

// GET /api/user/settings/export - Export user settings
router.get('/export', async (req, res) => {
  try {
    const userId = req.user.id;

    console.log(`📦 Exporting settings for user: ${userId}`);

    // Get all user settings
    const settingsStmt = db.prepare('SELECT settings_data FROM user_settings_sync WHERE user_id = ?');
    const settingsRecord = settingsStmt.get(userId);

    const preferencesStmt = db.prepare('SELECT preference_key, preference_value, category FROM user_preferences WHERE user_id = ?');
    const preferences = preferencesStmt.all(userId);

    const shortcutsStmt = db.prepare('SELECT shortcut_id, key_combination, description, category FROM user_shortcuts WHERE user_id = ?');
    const shortcuts = shortcutsStmt.all(userId);

    const themesStmt = db.prepare('SELECT theme_name, theme_data, is_active FROM user_themes WHERE user_id = ?');
    const themes = themesStmt.all(userId);

    const exportData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      userId: userId,
      settings: settingsRecord ? JSON.parse(settingsRecord.settings_data) : null,
      preferences: preferences.reduce((acc, pref) => {
        if (!acc[pref.category]) acc[pref.category] = {};
        acc[pref.category][pref.preference_key] = JSON.parse(pref.preference_value);
        return acc;
      }, {}),
      shortcuts: shortcuts.reduce((acc, shortcut) => {
        const keyCombo = JSON.parse(shortcut.key_combination);
        acc[shortcut.shortcut_id] = {
          key: keyCombo.key,
          modifiers: keyCombo.modifiers,
          description: shortcut.description,
          category: shortcut.category
        };
        return acc;
      }, {}),
      themes: themes.map(theme => ({
        name: theme.theme_name,
        data: JSON.parse(theme.theme_data),
        isActive: Boolean(theme.is_active)
      }))
    };

    res.json({
      success: true,
      data: exportData
    });
  } catch (error) {
    console.error('Error exporting user settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export user settings',
      details: error.message
    });
  }
});

// POST /api/user/settings/import - Import user settings
router.post('/import', async (req, res) => {
  try {
    const userId = req.user.id;
    const { data, overwrite = false } = req.body;

    if (!data || !data.version) {
      return res.status(400).json({
        success: false,
        error: 'Invalid import data'
      });
    }

    console.log(`📥 Importing settings for user: ${userId}, overwrite: ${overwrite}`);

    // Import settings sync data
    if (data.settings) {
      const settingsData = JSON.stringify(data.settings);
      const settingsHash = generateSettingsHash(data.settings);

      const stmt = db.prepare(`
        INSERT OR ${overwrite ? 'REPLACE' : 'IGNORE'} INTO user_settings_sync 
        (user_id, settings_data, settings_hash, updated_at)
        VALUES (?, ?, ?, datetime('now'))
      `);
      
      stmt.run(userId, settingsData, settingsHash);
    }

    // Import preferences
    if (data.preferences) {
      const prefStmt = db.prepare(`
        INSERT OR ${overwrite ? 'REPLACE' : 'IGNORE'} INTO user_preferences 
        (user_id, preference_key, preference_value, category, updated_at)
        VALUES (?, ?, ?, ?, datetime('now'))
      `);

      Object.entries(data.preferences).forEach(([category, prefs]) => {
        Object.entries(prefs).forEach(([key, value]) => {
          prefStmt.run(userId, key, JSON.stringify(value), category);
        });
      });
    }

    // Import shortcuts
    if (data.shortcuts) {
      if (overwrite) {
        db.prepare('DELETE FROM user_shortcuts WHERE user_id = ?').run(userId);
      }

      const shortcutStmt = db.prepare(`
        INSERT OR IGNORE INTO user_shortcuts 
        (user_id, shortcut_id, key_combination, description, category)
        VALUES (?, ?, ?, ?, ?)
      `);

      Object.entries(data.shortcuts).forEach(([shortcutId, shortcut]) => {
        const keyCombination = JSON.stringify({
          key: shortcut.key,
          modifiers: shortcut.modifiers
        });
        shortcutStmt.run(userId, shortcutId, keyCombination, shortcut.description, shortcut.category);
      });
    }

    // Import themes
    if (data.themes) {
      if (overwrite) {
        db.prepare('DELETE FROM user_themes WHERE user_id = ?').run(userId);
      }

      const themeStmt = db.prepare(`
        INSERT OR IGNORE INTO user_themes 
        (user_id, theme_name, theme_data, is_active, updated_at)
        VALUES (?, ?, ?, ?, datetime('now'))
      `);

      data.themes.forEach(theme => {
        themeStmt.run(userId, theme.name, JSON.stringify(theme.data), theme.isActive ? 1 : 0);
      });
    }

    res.json({
      success: true,
      message: 'Settings imported successfully'
    });
  } catch (error) {
    console.error('Error importing user settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to import user settings',
      details: error.message
    });
  }
});

export default router; 