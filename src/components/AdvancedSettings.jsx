import React, { useState, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { 
  X,
  Settings,
  Search,
  ChevronRight,
  ChevronDown,
  Moon,
  Sun,
  Keyboard,
  Palette,
  User,
  Globe,
  Bell,
  Shield,
  Database,
  Code,
  Terminal,
  File,
  Monitor,
  Smartphone,
  Volume2,
  Eye,
  Zap,
  RefreshCw,
  Download,
  Upload,
  Trash2,
  Save,
  RotateCcw,
  Plus,
  Minus,
  Edit3,
  Check,
  AlertTriangle,
  Info,
  HelpCircle,
  ExternalLink,
  Copy,
  Key,
  Lock,
  Unlock,
  Cloud,
  CloudOff,
  RefreshCw as Sync,
  RefreshCw as SyncOff,
  Sliders,
  ToggleLeft,
  ToggleRight,
  Type,
  MousePointer,
  Move,
  Layout,
  Grid,
  List,
  Maximize,
  Minimize,
  PaintBucket,
  Brush,
  Droplet,
  Heart,
  Star,
  Target,
  Layers,
  Box,
  Brain,
  Users,
  Wrench,
  Hash,
  Network,
  Server
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import SlashCommandsManager from './SlashCommandsManager';
import HooksManager from './HooksManager';
import SubagentOrchestrator from './SubagentOrchestrator';
import MCPManager from './MCPManager';

// Setting categories
const SETTING_CATEGORIES = {
  APPEARANCE: 'appearance',
  KEYBOARD: 'keyboard', 
  EDITOR: 'editor',
  INTERFACE: 'interface',
  MODELS: 'models',
  TOOLS: 'tools',
  SLASH_COMMANDS: 'slash_commands',
  HOOKS: 'hooks',
  SUBAGENTS: 'subagents',
  MCP: 'mcp',
  COLLABORATION: 'collaboration',
  PRIVACY: 'privacy',
  ADVANCED: 'advanced',
  SYNC: 'sync'
};

// Default keyboard shortcuts
const DEFAULT_SHORTCUTS = {
  'send_message': { key: 'Enter', modifiers: ['ctrl'], description: 'Send message', category: 'Chat' },
  'new_line': { key: 'Enter', modifiers: ['shift'], description: 'New line in message', category: 'Chat' },
  'focus_input': { key: '/', modifiers: [], description: 'Focus message input', category: 'Chat' },
  'toggle_sidebar': { key: 'b', modifiers: ['ctrl'], description: 'Toggle sidebar', category: 'Interface' },
  'switch_project': { key: 'p', modifiers: ['ctrl'], description: 'Switch project', category: 'Navigation' },
  'open_settings': { key: ',', modifiers: ['ctrl'], description: 'Open settings', category: 'Interface' },
  'toggle_theme': { key: 'd', modifiers: ['ctrl'], description: 'Toggle dark mode', category: 'Appearance' },
  'save_file': { key: 's', modifiers: ['ctrl'], description: 'Save current file', category: 'Editor' },
  'close_modal': { key: 'Escape', modifiers: [], description: 'Close modal/dialog', category: 'Interface' },
  'open_command_palette': { key: 'k', modifiers: ['ctrl'], description: 'Open command palette', category: 'Navigation' },
  'zoom_in': { key: '=', modifiers: ['ctrl'], description: 'Zoom in', category: 'Interface' },
  'zoom_out': { key: '-', modifiers: ['ctrl'], description: 'Zoom out', category: 'Interface' },
  'reset_zoom': { key: '0', modifiers: ['ctrl'], description: 'Reset zoom', category: 'Interface' },
  'toggle_fullscreen': { key: 'F11', modifiers: [], description: 'Toggle fullscreen', category: 'Interface' },
  'copy_session_link': { key: 'c', modifiers: ['ctrl', 'shift'], description: 'Copy session link', category: 'Collaboration' },
  'export_session': { key: 'e', modifiers: ['ctrl', 'shift'], description: 'Export session', category: 'Collaboration' }
};

// Default theme customization options
const DEFAULT_THEME_SETTINGS = {
  mode: 'system', // 'light', 'dark', 'system'
  accentColor: 'blue',
  fontSize: 'medium',
  fontFamily: 'system',
  borderRadius: 'medium',
  density: 'comfortable',
  animations: true,
  reducedMotion: false,
  highContrast: false,
  colorBlindFriendly: false,
  customColors: {
    primary: '#3b82f6',
    secondary: '#64748b',
    accent: '#f59e0b',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6'
  },
  layout: {
    sidebarWidth: 280,
    headerHeight: 60,
    contentPadding: 16,
    borderWidth: 1
  }
};

function AdvancedSettings({ isOpen, onClose }) {
  const { isDarkMode, toggleDarkMode } = useTheme();
  const [activeCategory, setActiveCategory] = useState(SETTING_CATEGORIES.APPEARANCE);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSections, setExpandedSections] = useState(new Set(['general']));
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  
  // Settings state
  const [shortcuts, setShortcuts] = useState(DEFAULT_SHORTCUTS);
  const [themeSettings, setThemeSettings] = useState(DEFAULT_THEME_SETTINGS);
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [editingShortcut, setEditingShortcut] = useState(null);
  const [shortcutRecording, setShortcutRecording] = useState(false);
  const [tempShortcut, setTempShortcut] = useState({ key: '', modifiers: [] });
  
  // Management component states
  const [showSlashCommands, setShowSlashCommands] = useState(false);
  const [showHooks, setShowHooks] = useState(false);
  const [showSubagents, setShowSubagents] = useState(false);
  const [showMcpManager, setShowMcpManager] = useState(false);
  
  // Interface preferences
  const [interfaceSettings, setInterfaceSettings] = useState({
    autoExpandTools: localStorage.getItem('autoExpandTools') === 'true',
    showRawParameters: localStorage.getItem('showRawParameters') === 'true',
    autoScrollToBottom: localStorage.getItem('autoScrollToBottom') !== 'false',
    sendByCtrlEnter: localStorage.getItem('sendByCtrlEnter') === 'true',
    enableSounds: localStorage.getItem('enableSounds') !== 'false',
    showLineNumbers: localStorage.getItem('showLineNumbers') !== 'false',
    wordWrap: localStorage.getItem('wordWrap') !== 'false',
    minimap: localStorage.getItem('minimap') === 'true',
    breadcrumbs: localStorage.getItem('breadcrumbs') !== 'false',
    compactMode: localStorage.getItem('compactMode') === 'true'
  });

  // Privacy settings
  const [privacySettings, setPrivacySettings] = useState({
    analyticsEnabled: localStorage.getItem('analyticsEnabled') !== 'false',
    crashReporting: localStorage.getItem('crashReporting') !== 'false',
    usageStatistics: localStorage.getItem('usageStatistics') !== 'false',
    personalizedContent: localStorage.getItem('personalizedContent') !== 'false',
    cookiesEnabled: localStorage.getItem('cookiesEnabled') !== 'false',
    thirdPartyIntegrations: localStorage.getItem('thirdPartyIntegrations') !== 'false'
  });

  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      // Load shortcuts from localStorage
      const savedShortcuts = localStorage.getItem('customShortcuts');
      if (savedShortcuts) {
        setShortcuts({ ...DEFAULT_SHORTCUTS, ...JSON.parse(savedShortcuts) });
      }

      // Load theme settings
      const savedTheme = localStorage.getItem('advancedThemeSettings');
      if (savedTheme) {
        setThemeSettings({ ...DEFAULT_THEME_SETTINGS, ...JSON.parse(savedTheme) });
      }

      // Check sync status
      const syncStatus = localStorage.getItem('settingsSyncEnabled');
      setSyncEnabled(syncStatus === 'true');
      
      const lastSync = localStorage.getItem('lastSettingsSync');
      if (lastSync) {
        setLastSyncTime(new Date(lastSync));
      }

      // Load from server if sync is enabled
      if (syncStatus === 'true') {
        await syncFromServer();
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setLoading(true);
    setSaveStatus(null);
    
    try {
      // Save shortcuts
      const customShortcuts = Object.fromEntries(
        Object.entries(shortcuts).filter(([key, value]) => 
          JSON.stringify(value) !== JSON.stringify(DEFAULT_SHORTCUTS[key])
        )
      );
      localStorage.setItem('customShortcuts', JSON.stringify(customShortcuts));

      // Save theme settings
      localStorage.setItem('advancedThemeSettings', JSON.stringify(themeSettings));

      // Save interface settings
      Object.entries(interfaceSettings).forEach(([key, value]) => {
        localStorage.setItem(key, value.toString());
      });

      // Save privacy settings
      Object.entries(privacySettings).forEach(([key, value]) => {
        localStorage.setItem(key, value.toString());
      });

      // Sync to server if enabled
      if (syncEnabled) {
        await syncToServer();
      }

      // Apply theme changes
      applyThemeSettings();

      setSaveStatus('success');
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const resetSettings = (category = null) => {
    if (category === SETTING_CATEGORIES.KEYBOARD) {
      setShortcuts(DEFAULT_SHORTCUTS);
    } else if (category === SETTING_CATEGORIES.APPEARANCE) {
      setThemeSettings(DEFAULT_THEME_SETTINGS);
    } else {
      // Reset all
      setShortcuts(DEFAULT_SHORTCUTS);
      setThemeSettings(DEFAULT_THEME_SETTINGS);
      setInterfaceSettings({
        autoExpandTools: false,
        showRawParameters: false,
        autoScrollToBottom: true,
        sendByCtrlEnter: false,
        enableSounds: true,
        showLineNumbers: true,
        wordWrap: true,
        minimap: false,
        breadcrumbs: true,
        compactMode: false
      });
      setPrivacySettings({
        analyticsEnabled: true,
        crashReporting: true,
        usageStatistics: true,
        personalizedContent: true,
        cookiesEnabled: true,
        thirdPartyIntegrations: true
      });
    }
  };

  const exportSettings = () => {
    const settings = {
      shortcuts,
      themeSettings,
      interfaceSettings,
      privacySettings,
      exportDate: new Date().toISOString(),
      version: '1.0'
    };
    
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `claude-code-settings-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const importSettings = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        
        if (imported.shortcuts) setShortcuts({ ...DEFAULT_SHORTCUTS, ...imported.shortcuts });
        if (imported.themeSettings) setThemeSettings({ ...DEFAULT_THEME_SETTINGS, ...imported.themeSettings });
        if (imported.interfaceSettings) setInterfaceSettings({ ...interfaceSettings, ...imported.interfaceSettings });
        if (imported.privacySettings) setPrivacySettings({ ...privacySettings, ...imported.privacySettings });
        
        setSaveStatus('imported');
        setTimeout(() => setSaveStatus(null), 3000);
      } catch (error) {
        console.error('Error importing settings:', error);
        setSaveStatus('import-error');
        setTimeout(() => setSaveStatus(null), 3000);
      }
    };
    reader.readAsText(file);
  };

  const syncToServer = async () => {
    try {
      const token = localStorage.getItem('auth-token');
      const settings = {
        shortcuts,
        themeSettings,
        interfaceSettings,
        privacySettings,
        lastUpdated: new Date().toISOString()
      };

      const response = await fetch('/api/user/settings/sync', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
      });

      if (response.ok) {
        localStorage.setItem('lastSettingsSync', new Date().toISOString());
        setLastSyncTime(new Date());
      }
    } catch (error) {
      console.error('Error syncing settings to server:', error);
    }
  };

  const syncFromServer = async () => {
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/api/user/settings/sync', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.settings) {
          if (data.settings.shortcuts) setShortcuts({ ...DEFAULT_SHORTCUTS, ...data.settings.shortcuts });
          if (data.settings.themeSettings) setThemeSettings({ ...DEFAULT_THEME_SETTINGS, ...data.settings.themeSettings });
          if (data.settings.interfaceSettings) setInterfaceSettings({ ...interfaceSettings, ...data.settings.interfaceSettings });
          if (data.settings.privacySettings) setPrivacySettings({ ...privacySettings, ...data.settings.privacySettings });
          
          localStorage.setItem('lastSettingsSync', new Date().toISOString());
          setLastSyncTime(new Date());
        }
      }
    } catch (error) {
      console.error('Error syncing settings from server:', error);
    }
  };

  const applyThemeSettings = () => {
    const root = document.documentElement;
    
    // Apply custom colors
    Object.entries(themeSettings.customColors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value);
    });

    // Apply font settings
    root.style.setProperty('--font-size-base', 
      themeSettings.fontSize === 'small' ? '14px' :
      themeSettings.fontSize === 'large' ? '18px' : '16px'
    );

    // Apply border radius
    root.style.setProperty('--border-radius', 
      themeSettings.borderRadius === 'none' ? '0px' :
      themeSettings.borderRadius === 'small' ? '4px' :
      themeSettings.borderRadius === 'large' ? '12px' : '8px'
    );

    // Apply layout settings
    Object.entries(themeSettings.layout).forEach(([key, value]) => {
      root.style.setProperty(`--layout-${key}`, `${value}px`);
    });

    // Handle animations
    if (!themeSettings.animations) {
      root.style.setProperty('--animation-duration', '0s');
    }
  };

  const startShortcutRecording = (shortcutId) => {
    setEditingShortcut(shortcutId);
    setShortcutRecording(true);
    setTempShortcut({ key: '', modifiers: [] });
  };

  const handleShortcutKeyDown = useCallback((e) => {
    if (!shortcutRecording) return;

    e.preventDefault();
    e.stopPropagation();

    const modifiers = [];
    if (e.ctrlKey) modifiers.push('ctrl');
    if (e.altKey) modifiers.push('alt');
    if (e.shiftKey) modifiers.push('shift');
    if (e.metaKey) modifiers.push('meta');

    const key = e.key;
    setTempShortcut({ key, modifiers });
  }, [shortcutRecording]);

  const saveShortcut = () => {
    if (editingShortcut && tempShortcut.key) {
      setShortcuts(prev => ({
        ...prev,
        [editingShortcut]: {
          ...prev[editingShortcut],
          key: tempShortcut.key,
          modifiers: tempShortcut.modifiers
        }
      }));
    }
    setEditingShortcut(null);
    setShortcutRecording(false);
    setTempShortcut({ key: '', modifiers: [] });
  };

  const cancelShortcutEdit = () => {
    setEditingShortcut(null);
    setShortcutRecording(false);
    setTempShortcut({ key: '', modifiers: [] });
  };

  useEffect(() => {
    if (shortcutRecording) {
      document.addEventListener('keydown', handleShortcutKeyDown);
      return () => document.removeEventListener('keydown', handleShortcutKeyDown);
    }
  }, [shortcutRecording, handleShortcutKeyDown]);

  const toggleSection = (sectionId) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  // Filter settings based on search query
  const filterSettings = (settings, query) => {
    if (!query) return settings;
    const lowerQuery = query.toLowerCase();
    return Object.entries(settings).filter(([key, value]) => 
      key.toLowerCase().includes(lowerQuery) ||
      (typeof value === 'object' && value.description && value.description.toLowerCase().includes(lowerQuery))
    );
  };

  const formatShortcut = (shortcut) => {
    const modifierLabels = {
      ctrl: '⌃',
      alt: '⌥',
      shift: '⇧',
      meta: '⌘'
    };
    
    const modifierStr = shortcut.modifiers.map(mod => modifierLabels[mod] || mod).join('');
    const keyStr = shortcut.key === ' ' ? 'Space' : shortcut.key;
    
    return `${modifierStr}${keyStr}`;
  };

  const categories = [
    { id: SETTING_CATEGORIES.APPEARANCE, label: 'Appearance', icon: Palette, description: 'Themes, colors, and visual customization' },
    { id: SETTING_CATEGORIES.KEYBOARD, label: 'Keyboard', icon: Keyboard, description: 'Shortcuts and key bindings' },
    { id: SETTING_CATEGORIES.EDITOR, label: 'Editor', icon: Code, description: 'Code editor preferences' },
    { id: SETTING_CATEGORIES.INTERFACE, label: 'Interface', icon: Layout, description: 'UI behavior and layout' },
    { id: SETTING_CATEGORIES.MODELS, label: 'Models', icon: Brain, description: 'AI model configuration' },
    { id: SETTING_CATEGORIES.TOOLS, label: 'Tools', icon: Wrench, description: 'Tool permissions and MCP servers' },
    { id: SETTING_CATEGORIES.SLASH_COMMANDS, label: 'Slash Commands', icon: Hash, description: 'Custom slash command management' },
    { id: SETTING_CATEGORIES.HOOKS, label: 'Hooks', icon: Zap, description: 'Automation and workflow hooks' },
    { id: SETTING_CATEGORIES.SUBAGENTS, label: 'Subagents', icon: Network, description: 'AI subagent orchestration' },
    { id: SETTING_CATEGORIES.MCP, label: 'MCP Servers', icon: Server, description: 'Model Context Protocol servers' },
    { id: SETTING_CATEGORIES.COLLABORATION, label: 'Collaboration', icon: Users, description: 'Sharing and teamwork settings' },
    { id: SETTING_CATEGORIES.PRIVACY, label: 'Privacy', icon: Shield, description: 'Data collection and privacy controls' },
    { id: SETTING_CATEGORIES.SYNC, label: 'Sync', icon: Cloud, description: 'Settings synchronization' },
    { id: SETTING_CATEGORIES.ADVANCED, label: 'Advanced', icon: Settings, description: 'Advanced configuration options' }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Settings className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Advanced Settings
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Customize your Claude Code experience
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Save Status */}
            {saveStatus && (
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                saveStatus === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                saveStatus === 'error' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                saveStatus === 'imported' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
              }`}>
                {saveStatus === 'success' && <Check className="w-4 h-4" />}
                {saveStatus === 'error' && <AlertTriangle className="w-4 h-4" />}
                {saveStatus === 'imported' && <Download className="w-4 h-4" />}
                {saveStatus === 'import-error' && <AlertTriangle className="w-4 h-4" />}
                {saveStatus === 'success' ? 'Settings saved' :
                 saveStatus === 'error' ? 'Save failed' :
                 saveStatus === 'imported' ? 'Settings imported' :
                 'Import failed'}
              </div>
            )}
            
            {/* Action Buttons */}
            <Button
              variant="outline"
              size="sm"
              onClick={exportSettings}
              disabled={loading}
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => document.getElementById('import-settings').click()}
              disabled={loading}
            >
              <Upload className="w-4 h-4 mr-2" />
              Import
            </Button>
            <input
              id="import-settings"
              type="file"
              accept=".json"
              onChange={importSettings}
              className="hidden"
            />
            
            <Button
              onClick={saveSettings}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Settings
            </Button>
            
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-80 border-r border-gray-200 dark:border-gray-700 flex flex-col">
            {/* Search */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search settings..."
                  className="pl-10"
                />
              </div>
            </div>

            {/* Categories */}
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-2">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setActiveCategory(category.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                      activeCategory === category.id
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-300'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <category.icon className="w-5 h-5" />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {category.label}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {category.description}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col">
            <ScrollArea className="flex-1 p-6">
              {/* Appearance Settings */}
              {activeCategory === SETTING_CATEGORIES.APPEARANCE && (
                <div className="space-y-8">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                      Theme & Appearance
                    </h3>
                    
                    {/* Theme Mode */}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Theme Mode
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {['light', 'dark', 'system'].map((mode) => (
                            <button
                              key={mode}
                              onClick={() => setThemeSettings(prev => ({ ...prev, mode }))}
                              className={`p-3 rounded-lg border text-center transition-colors ${
                                themeSettings.mode === mode
                                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                                  : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                              }`}
                            >
                              {mode === 'light' && <Sun className="w-5 h-5 mx-auto mb-1" />}
                              {mode === 'dark' && <Moon className="w-5 h-5 mx-auto mb-1" />}
                              {mode === 'system' && <Monitor className="w-5 h-5 mx-auto mb-1" />}
                              <div className="text-sm font-medium capitalize">{mode}</div>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Accent Color */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Accent Color
                        </label>
                        <div className="grid grid-cols-8 gap-2">
                          {[
                            { name: 'blue', color: '#3b82f6' },
                            { name: 'green', color: '#10b981' },
                            { name: 'purple', color: '#8b5cf6' },
                            { name: 'pink', color: '#ec4899' },
                            { name: 'red', color: '#ef4444' },
                            { name: 'orange', color: '#f59e0b' },
                            { name: 'teal', color: '#14b8a6' },
                            { name: 'indigo', color: '#6366f1' }
                          ].map((colorOption) => (
                            <button
                              key={colorOption.name}
                              onClick={() => setThemeSettings(prev => ({ ...prev, accentColor: colorOption.name }))}
                              className={`w-8 h-8 rounded-full border-2 ${
                                themeSettings.accentColor === colorOption.name
                                  ? 'border-gray-900 dark:border-white'
                                  : 'border-transparent'
                              }`}
                              style={{ backgroundColor: colorOption.color }}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Font Settings */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Font Size
                          </label>
                          <select
                            value={themeSettings.fontSize}
                            onChange={(e) => setThemeSettings(prev => ({ ...prev, fontSize: e.target.value }))}
                            className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700"
                          >
                            <option value="small">Small</option>
                            <option value="medium">Medium</option>
                            <option value="large">Large</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Font Family
                          </label>
                          <select
                            value={themeSettings.fontFamily}
                            onChange={(e) => setThemeSettings(prev => ({ ...prev, fontFamily: e.target.value }))}
                            className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700"
                          >
                            <option value="system">System</option>
                            <option value="inter">Inter</option>
                            <option value="roboto">Roboto</option>
                            <option value="mono">Monospace</option>
                          </select>
                        </div>
                      </div>

                      {/* Advanced Options */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Animations
                          </label>
                          <button
                            onClick={() => setThemeSettings(prev => ({ ...prev, animations: !prev.animations }))}
                            className={`w-11 h-6 rounded-full transition-colors ${
                              themeSettings.animations ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                            }`}
                          >
                            <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                              themeSettings.animations ? 'translate-x-5' : 'translate-x-0'
                            }`} />
                          </button>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            High Contrast
                          </label>
                          <button
                            onClick={() => setThemeSettings(prev => ({ ...prev, highContrast: !prev.highContrast }))}
                            className={`w-11 h-6 rounded-full transition-colors ${
                              themeSettings.highContrast ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                            }`}
                          >
                            <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                              themeSettings.highContrast ? 'translate-x-5' : 'translate-x-0'
                            }`} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Keyboard Settings */}
              {activeCategory === SETTING_CATEGORIES.KEYBOARD && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                        Keyboard Shortcuts
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Customize keyboard shortcuts for faster navigation
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => resetSettings(SETTING_CATEGORIES.KEYBOARD)}
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Reset All
                    </Button>
                  </div>

                  {/* Shortcut Categories */}
                  {Object.entries(
                    Object.entries(shortcuts).reduce((acc, [key, shortcut]) => {
                      const category = shortcut.category || 'Other';
                      if (!acc[category]) acc[category] = [];
                      acc[category].push([key, shortcut]);
                      return acc;
                    }, {})
                  ).map(([category, categoryShortcuts]) => (
                    <div key={category} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                      <button
                        onClick={() => toggleSection(category)}
                        className="w-full flex items-center justify-between p-4 text-left"
                      >
                        <h4 className="font-medium text-gray-900 dark:text-white">{category}</h4>
                        {expandedSections.has(category) ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>
                      
                      {expandedSections.has(category) && (
                        <div className="px-4 pb-4 space-y-3">
                          {categoryShortcuts.map(([key, shortcut]) => (
                            <div key={key} className="flex items-center justify-between py-2">
                              <div className="flex-1">
                                <div className="font-medium text-gray-900 dark:text-white">
                                  {shortcut.description}
                                </div>
                                <div className="text-xs text-gray-600 dark:text-gray-400">
                                  {key}
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                {editingShortcut === key ? (
                                  <div className="flex items-center gap-2">
                                    <div className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-300 rounded text-sm font-mono">
                                      {shortcutRecording ? 'Press keys...' : formatShortcut(tempShortcut)}
                                    </div>
                                    <Button size="sm" onClick={saveShortcut} disabled={!tempShortcut.key}>
                                      <Check className="w-4 h-4" />
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={cancelShortcutEdit}>
                                      <X className="w-4 h-4" />
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <div className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded text-sm font-mono">
                                      {formatShortcut(shortcut)}
                                    </div>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => startShortcutRecording(key)}
                                    >
                                      <Edit3 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Interface Settings */}
              {activeCategory === SETTING_CATEGORIES.INTERFACE && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                      Interface Preferences
                    </h3>
                    
                    <div className="space-y-4">
                      {Object.entries({
                        autoExpandTools: { label: 'Auto-expand tool results', description: 'Automatically expand tool execution results' },
                        showRawParameters: { label: 'Show raw parameters', description: 'Display raw API parameters in responses' },
                        autoScrollToBottom: { label: 'Auto-scroll to bottom', description: 'Automatically scroll to newest messages' },
                        sendByCtrlEnter: { label: 'Send with Ctrl+Enter', description: 'Use Ctrl+Enter to send messages instead of Enter' },
                        enableSounds: { label: 'Enable sounds', description: 'Play notification sounds for events' },
                        showLineNumbers: { label: 'Show line numbers', description: 'Display line numbers in code blocks' },
                        wordWrap: { label: 'Word wrap', description: 'Wrap long lines in code blocks' },
                        minimap: { label: 'Show minimap', description: 'Display minimap in code editor' },
                        breadcrumbs: { label: 'Show breadcrumbs', description: 'Display file path breadcrumbs' },
                        compactMode: { label: 'Compact mode', description: 'Use compact UI with reduced spacing' }
                      }).map(([key, config]) => (
                        <div key={key} className="flex items-center justify-between py-2">
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">
                              {config.label}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              {config.description}
                            </div>
                          </div>
                          <button
                            onClick={() => setInterfaceSettings(prev => ({ ...prev, [key]: !prev[key] }))}
                            className={`w-11 h-6 rounded-full transition-colors ${
                              interfaceSettings[key] ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                            }`}
                          >
                            <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                              interfaceSettings[key] ? 'translate-x-5' : 'translate-x-0'
                            }`} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Privacy Settings */}
              {activeCategory === SETTING_CATEGORIES.PRIVACY && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      Privacy & Data Collection
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      Control what data is collected and how it's used to improve your experience.
                    </p>
                    
                    <div className="space-y-4">
                      {Object.entries({
                        analyticsEnabled: { 
                          label: 'Usage Analytics', 
                          description: 'Help improve Claude Code by sharing anonymous usage data',
                          level: 'recommended'
                        },
                        crashReporting: { 
                          label: 'Crash Reporting', 
                          description: 'Automatically send crash reports to help fix bugs',
                          level: 'recommended'
                        },
                        usageStatistics: { 
                          label: 'Usage Statistics', 
                          description: 'Collect statistics about feature usage and performance',
                          level: 'optional'
                        },
                        personalizedContent: { 
                          label: 'Personalized Content', 
                          description: 'Show personalized recommendations based on your usage',
                          level: 'optional'
                        },
                        cookiesEnabled: { 
                          label: 'Cookies', 
                          description: 'Allow cookies for enhanced functionality',
                          level: 'essential'
                        },
                        thirdPartyIntegrations: { 
                          label: 'Third-party Integrations', 
                          description: 'Enable integrations with external services',
                          level: 'optional'
                        }
                      }).map(([key, config]) => (
                        <div key={key} className="flex items-start justify-between py-3 border-b border-gray-200 dark:border-gray-700 last:border-0">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="font-medium text-gray-900 dark:text-white">
                                {config.label}
                              </div>
                              <Badge 
                                variant={config.level === 'essential' ? 'default' : config.level === 'recommended' ? 'secondary' : 'outline'}
                                className="text-xs"
                              >
                                {config.level}
                              </Badge>
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              {config.description}
                            </div>
                          </div>
                          <button
                            onClick={() => setPrivacySettings(prev => ({ ...prev, [key]: !prev[key] }))}
                            disabled={config.level === 'essential'}
                            className={`w-11 h-6 rounded-full transition-colors ${
                              privacySettings[key] ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                            } ${config.level === 'essential' ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                              privacySettings[key] ? 'translate-x-5' : 'translate-x-0'
                            }`} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Sync Settings */}
              {activeCategory === SETTING_CATEGORIES.SYNC && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      Settings Synchronization
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      Sync your settings across devices and sessions.
                    </p>
                    
                    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          {syncEnabled ? (
                            <Cloud className="w-5 h-5 text-blue-600" />
                          ) : (
                            <CloudOff className="w-5 h-5 text-gray-400" />
                          )}
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">
                              Cloud Sync
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              {syncEnabled ? 'Settings are synced to your account' : 'Settings are stored locally only'}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => setSyncEnabled(!syncEnabled)}
                          className={`w-11 h-6 rounded-full transition-colors ${
                            syncEnabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                          }`}
                        >
                          <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                            syncEnabled ? 'translate-x-5' : 'translate-x-0'
                          }`} />
                        </button>
                      </div>

                      {syncEnabled && (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">Last sync:</span>
                            <span className="text-gray-900 dark:text-white">
                              {lastSyncTime ? lastSyncTime.toLocaleString() : 'Never'}
                            </span>
                          </div>
                          
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={syncToServer}
                              disabled={loading}
                            >
                              <Sync className="w-4 h-4 mr-2" />
                              Sync Now
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={syncFromServer}
                              disabled={loading}
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Pull from Cloud
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Slash Commands Settings */}
              {activeCategory === SETTING_CATEGORIES.SLASH_COMMANDS && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      Slash Commands Manager
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      Create and manage custom slash commands for quick actions and workflows.
                    </p>
                  </div>
                  
                  <div className="text-center py-8">
                    <Hash className="w-12 h-12 text-blue-500 mx-auto mb-4" />
                    <Button
                      onClick={() => setShowSlashCommands(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Hash className="w-4 h-4 mr-2" />
                      Open Slash Commands Manager
                    </Button>
                  </div>
                </div>
              )}

              {/* Hooks Settings */}
              {activeCategory === SETTING_CATEGORIES.HOOKS && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      Hooks Manager
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      Set up automation triggers for file changes, git events, builds, and custom workflows.
                    </p>
                  </div>
                  
                  <div className="text-center py-8">
                    <Zap className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                    <Button
                      onClick={() => setShowHooks(true)}
                      className="bg-yellow-600 hover:bg-yellow-700 text-white"
                    >
                      <Zap className="w-4 h-4 mr-2" />
                      Open Hooks Manager
                    </Button>
                  </div>
                </div>
              )}

              {/* Subagents Settings */}
              {activeCategory === SETTING_CATEGORIES.SUBAGENTS && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      Subagent Orchestrator
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      Manage AI subagents, their roles, and orchestration for complex workflows.
                    </p>
                  </div>
                  
                  <div className="text-center py-8">
                    <Network className="w-12 h-12 text-purple-500 mx-auto mb-4" />
                    <Button
                      onClick={() => setShowSubagents(true)}
                      className="bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      <Network className="w-4 h-4 mr-2" />
                      Open Subagent Orchestrator
                    </Button>
                  </div>
                </div>
              )}

              {/* MCP Settings */}
              {activeCategory === SETTING_CATEGORIES.MCP && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      MCP Server Manager
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      Advanced MCP server configuration and management beyond basic tools settings.
                    </p>
                  </div>
                  
                  <div className="text-center py-8">
                    <Server className="w-12 h-12 text-green-500 mx-auto mb-4" />
                    <Button
                      onClick={() => setShowMcpManager(true)}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Server className="w-4 h-4 mr-2" />
                      Open MCP Manager
                    </Button>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
                      For basic MCP settings, use <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">Ctrl/Cmd + Shift + ,</kbd>
                    </p>
                  </div>
                </div>
              )}

              {/* Other categories placeholder */}
              {[SETTING_CATEGORIES.EDITOR, SETTING_CATEGORIES.MODELS, SETTING_CATEGORIES.TOOLS, 
                SETTING_CATEGORIES.COLLABORATION, SETTING_CATEGORIES.ADVANCED].includes(activeCategory) && (
                <div className="text-center py-12">
                  <Settings className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    {categories.find(c => c.id === activeCategory)?.label} Settings
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    These settings are managed through their respective dedicated interfaces.
                  </p>
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
            <span>
              {Object.keys(shortcuts).length} shortcuts configured
            </span>
            {syncEnabled && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Cloud className="w-4 h-4" />
                  Sync enabled
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => resetSettings()}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset All
            </Button>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={saveSettings}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Settings
            </Button>
          </div>
        </div>
      </div>
      
      {/* Management Component Modals */}
      {showSlashCommands && (
        <SlashCommandsManager
          isOpen={showSlashCommands}
          onClose={() => setShowSlashCommands(false)}
        />
      )}
      
      {showHooks && (
        <HooksManager
          isOpen={showHooks}
          onClose={() => setShowHooks(false)}
        />
      )}
      
      {showSubagents && (
        <SubagentOrchestrator
          isOpen={showSubagents}
          onClose={() => setShowSubagents(false)}
        />
      )}
      
      {showMcpManager && (
        <MCPManager
          isOpen={showMcpManager}
          onClose={() => setShowMcpManager(false)}
        />
      )}
    </div>
  );
}

export default AdvancedSettings; 