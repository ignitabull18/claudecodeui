/*
 * MainContent.jsx - Main Content Area with Session Protection Props Passthrough
 * 
 * SESSION PROTECTION PASSTHROUGH:
 * ===============================
 * 
 * This component serves as a passthrough layer for Session Protection functions:
 * - Receives session management functions from App.jsx
 * - Passes them down to ChatInterface.jsx
 * 
 * No session protection logic is implemented here - it's purely a props bridge.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings } from 'lucide-react';
import ChatInterface from './ChatInterface';
import FileTree from './FileTree';
import CodeEditor from './CodeEditor';
import Shell from './Shell';
import GitPanel from './GitPanel';
import CodeAnalysisPanel from './CodeAnalysisPanel';
import TestingDebugPanel from './TestingDebugPanel';
import AnalyticsDashboard from './AnalyticsDashboard';
import CollaborationHub from './CollaborationHub';
import MCPManager from './MCPManager';
import SlashCommandsManager from './SlashCommandsManager';
import SubagentOrchestrator from './SubagentOrchestrator';
import HooksManager from './HooksManager';
import ThinkingFramework from './ThinkingFramework';
import ErrorBoundary from './ErrorBoundary';
import WebSearchBrowser from './WebSearchBrowser';

function MainContent({ 
  selectedProject, 
  selectedSession, 
  activeTab, 
  setActiveTab, 
  ws, 
  sendMessage, 
  messages,
  isMobile,
  onMenuClick,
  isLoading,
  onInputFocusChange,
  // Session Protection Props: Functions passed down from App.jsx to manage active session state
  // These functions control when project updates are paused during active conversations
  onSessionActive,        // Mark session as active when user sends message
  onSessionInactive,      // Mark session as inactive when conversation completes/aborts  
  onReplaceTemporarySession, // Replace temporary session ID with real session ID from WebSocket
  onNavigateToSession,    // Navigate to a specific session (for Claude CLI session duplication workaround)
  autoExpandTools,        // Auto-expand tool accordions
  showRawParameters,      // Show raw parameters in tool accordions
  autoScrollToBottom,     // Auto-scroll to bottom when new messages arrive
  sendByCtrlEnter         // Send by Ctrl+Enter mode for East Asian language input
}) {
  const navigate = useNavigate();
  const [editingFile, setEditingFile] = useState(null);
  const [showCodeAnalysis, setShowCodeAnalysis] = useState(false);
  const [showTestingDebug, setShowTestingDebug] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showWebSearch, setShowWebSearch] = useState(false);
  const [showCollaboration, setShowCollaboration] = useState(false);
  const [showMCPManager, setShowMCPManager] = useState(false);
  const [showSlashCommands, setShowSlashCommands] = useState(false);
  const [showSubagentOrchestrator, setShowSubagentOrchestrator] = useState(false);
  const [showHooksManager, setShowHooksManager] = useState(false);
  const [showThinkingFramework, setShowThinkingFramework] = useState(false);

  const handleFileOpen = (filePath, diffInfo = null) => {
    // Create a file object that CodeEditor expects
    const file = {
      name: filePath.split('/').pop(),
      path: filePath,
      projectName: selectedProject?.name,
      diffInfo: diffInfo // Pass along diff information if available
    };
    setEditingFile(file);
  };

  const handleCloseEditor = () => {
    setEditingFile(null);
  };
  if (isLoading) {
    return (
      <div className="h-full flex flex-col">
        {/* Header with menu button for mobile */}
        {isMobile && (
          <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-3 sm:p-4 flex-shrink-0">
            <button
              onClick={onMenuClick}
              className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        )}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-gray-500 dark:text-gray-400">
            <div className="w-12 h-12 mx-auto mb-4">
              <div 
                className="w-full h-full rounded-full border-4 border-gray-200 border-t-blue-500" 
                style={{ 
                  animation: 'spin 1s linear infinite',
                  WebkitAnimation: 'spin 1s linear infinite',
                  MozAnimation: 'spin 1s linear infinite'
                }} 
              />
            </div>
            <h2 className="text-xl font-semibold mb-2">Loading Claude Code UI</h2>
            <p>Setting up your workspace...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!selectedProject) {
    return (
      <div className="h-full flex flex-col">
        {/* Header with menu button for mobile */}
        {isMobile && (
          <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-3 sm:p-4 flex-shrink-0">
            <button
              onClick={onMenuClick}
              className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        )}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-gray-500 dark:text-gray-400 max-w-md mx-auto px-6">
            <div className="w-16 h-16 mx-auto mb-6 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold mb-3 text-gray-900 dark:text-white">Choose Your Project</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
              Select a project from the sidebar to start coding with Claude. Each project contains your chat sessions and file history.
            </p>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                💡 <strong>Tip:</strong> {isMobile ? 'Tap the menu button above to access projects' : 'Create a new project by clicking the folder icon in the sidebar'}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header with tabs */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-3 sm:p-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 sm:space-x-3">
            {isMobile && (
              <button
                onClick={onMenuClick}
                onTouchStart={(e) => {
                  e.preventDefault();
                  onMenuClick();
                }}
                className="p-2.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 touch-manipulation active:scale-95"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            )}
            <div className="min-w-0">
              {activeTab === 'chat' && selectedSession ? (
                <div>
                  <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white truncate">
                    {selectedSession.summary}
                  </h2>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {selectedProject.displayName} <span className="hidden sm:inline">• {selectedSession.id}</span>
                  </div>
                </div>
              ) : activeTab === 'chat' && !selectedSession ? (
                <div>
                  <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                    New Session
                  </h2>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {selectedProject.displayName}
                  </div>
                </div>
              ) : (
                <div>
                  <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                    {activeTab === 'files' ? 'Project Files' : activeTab === 'git' ? 'Source Control' : 'Project'}
                  </h2>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {selectedProject.displayName}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Settings Button */}
          <div className="flex-shrink-0 flex items-center gap-2">
            <button
              onClick={() => navigate('/settings')}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all duration-200 border border-transparent hover:border-blue-200 dark:hover:border-blue-700 touch-manipulation active:scale-95"
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>

          {/* Modern Tab Navigation - Right Side */}
          <div className="flex-shrink-0 hidden sm:block">
            <div className="relative flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => setActiveTab('chat')}
                className={`relative px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md ${
                  activeTab === 'chat'
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <span className="flex items-center gap-1 sm:gap-1.5">
                  <svg className="w-3 sm:w-3.5 h-3 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <span className="hidden sm:inline">Chat</span>
                </span>
              </button>
              <button
                onClick={() => setActiveTab('shell')}
                className={`relative px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all duration-200 ${
                  activeTab === 'shell'
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <span className="flex items-center gap-1 sm:gap-1.5">
                  <svg className="w-3 sm:w-3.5 h-3 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <span className="hidden sm:inline">Shell</span>
                </span>
              </button>
              <button
                onClick={() => setActiveTab('files')}
                className={`relative px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all duration-200 ${
                  activeTab === 'files'
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <span className="flex items-center gap-1 sm:gap-1.5">
                  <svg className="w-3 sm:w-3.5 h-3 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  <span className="hidden sm:inline">Files</span>
                </span>
              </button>
              <button
                onClick={() => setActiveTab('git')}
                className={`relative px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all duration-200 ${
                  activeTab === 'git'
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <span className="flex items-center gap-1 sm:gap-1.5">
                  <svg className="w-3 sm:w-3.5 h-3 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span className="hidden sm:inline">Source Control</span>
                </span>
              </button>
                      <button
          onClick={() => setActiveTab('analysis')}
          className={`relative px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all duration-200 ${
            activeTab === 'analysis'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          <span className="flex items-center gap-1 sm:gap-1.5">
            <svg className="w-3 sm:w-3.5 h-3 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3v5h4l-2-2 5 5 7-7-1.5-1.5L11 7l-3-3-1 1V3H3zm9 11h5v-2h-5v2zm0 2h5v-2h-5v2z" />
            </svg>
            <span className="hidden sm:inline">Analysis</span>
          </span>
        </button>
        <button
          onClick={() => setActiveTab('testing')}
          className={`relative px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all duration-200 ${
            activeTab === 'testing'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          <span className="flex items-center gap-1 sm:gap-1.5">
            <svg className="w-3 sm:w-3.5 h-3 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="hidden sm:inline">Testing</span>
          </span>
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`relative px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all duration-200 ${
            activeTab === 'analytics'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          <span className="flex items-center gap-1 sm:gap-1.5">
            <svg className="w-3 sm:w-3.5 h-3 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17h6l-3-9-3 9zm1-4h2" />
            </svg>
            <span className="hidden sm:inline">Analytics</span>
          </span>
        </button>
        <button
          onClick={() => setActiveTab('collaboration')}
          className={`relative px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all duration-200 ${
            activeTab === 'collaboration'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          <span className="flex items-center gap-1 sm:gap-1.5">
            <svg className="w-3 sm:w-3.5 h-3 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span className="hidden sm:inline">Share</span>
          </span>
        </button>
        <button
          onClick={() => setShowWebSearch(true)}
          className="relative px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all duration-200 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700"
        >
          <span className="flex items-center gap-1 sm:gap-1.5">
            <svg className="w-3 sm:w-3.5 h-3 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.6 9h16.8M3.6 15h16.8M12 3.6c1.8 0 3.3 2.5 4 5.4M12 3.6c-1.8 0-3.3 2.5-4 5.4M12 20.4c1.8 0 3.3-2.5 4-5.4M12 20.4c-1.8 0-3.3 2.5-4 5.4" />
            </svg>
            <span className="hidden sm:inline">Search</span>
          </span>
        </button>
        <button
          onClick={() => setShowMCPManager(true)}
          className="relative px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all duration-200 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700"
        >
          <span className="flex items-center gap-1 sm:gap-1.5">
            <svg className="w-3 sm:w-3.5 h-3 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12l-2 0m6-7l-2 0m6 0l-2 0m6 7l-2 0m-9 7h2m0-14h2" />
              <circle cx="12" cy="12" r="3" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 1v6m0 6v6m-3-9l3 3l3-3" />
            </svg>
            <span className="hidden sm:inline">MCP</span>
          </span>
        </button>
        <button
          onClick={() => setShowSlashCommands(true)}
          className="relative px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all duration-200 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700"
        >
          <span className="flex items-center gap-1 sm:gap-1.5">
            <svg className="w-3 sm:w-3.5 h-3 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="hidden sm:inline">Commands</span>
          </span>
        </button>
        <button
          onClick={() => setShowSubagentOrchestrator(true)}
          className="relative px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all duration-200 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700"
        >
          <span className="flex items-center gap-1 sm:gap-1.5">
            <svg className="w-3 sm:w-3.5 h-3 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span className="hidden sm:inline">Agents</span>
          </span>
        </button>
        <button
          onClick={() => setShowHooksManager(true)}
          className="relative px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all duration-200 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700"
        >
          <span className="flex items-center gap-1 sm:gap-1.5">
            <svg className="w-3 sm:w-3.5 h-3 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className="hidden sm:inline">Hooks</span>
          </span>
        </button>
        <button
          onClick={() => setShowThinkingFramework(true)}
          className="relative px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all duration-200 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700"
        >
          <span className="flex items-center gap-1 sm:gap-1.5">
            <svg className="w-3 sm:w-3.5 h-3 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              <circle cx="12" cy="8" r="3" />
            </svg>
            <span className="hidden sm:inline">Thinking</span>
          </span>
        </button>
               {/* <button
                onClick={() => setActiveTab('preview')}
                className={`relative px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all duration-200 ${
                  activeTab === 'preview'
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              > 
                <span className="flex items-center gap-1 sm:gap-1.5">
                  <svg className="w-3 sm:w-3.5 h-3 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                  <span className="hidden sm:inline">Preview</span>
                </span>
              </button> */}
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className={`h-full ${activeTab === 'chat' ? 'block' : 'hidden'}`}>
          <ErrorBoundary showDetails={true}>
            <ChatInterface
              selectedProject={selectedProject}
              selectedSession={selectedSession}
              ws={ws}
              sendMessage={sendMessage}
              messages={messages}
              onFileOpen={handleFileOpen}
              onInputFocusChange={onInputFocusChange}
              onSessionActive={onSessionActive}
              onSessionInactive={onSessionInactive}
              onReplaceTemporarySession={onReplaceTemporarySession}
              onNavigateToSession={onNavigateToSession}
              onShowSettings={() => navigate('/settings')}
              autoExpandTools={autoExpandTools}
              showRawParameters={showRawParameters}
              autoScrollToBottom={autoScrollToBottom}
              sendByCtrlEnter={sendByCtrlEnter}
            />
          </ErrorBoundary>
        </div>
        <div className={`h-full overflow-hidden ${activeTab === 'files' ? 'block' : 'hidden'}`}>
          <FileTree selectedProject={selectedProject} />
        </div>
        <div className={`h-full overflow-hidden ${activeTab === 'shell' ? 'block' : 'hidden'}`}>
          <Shell 
            selectedProject={selectedProject} 
            selectedSession={selectedSession}
            isActive={activeTab === 'shell'}
          />
        </div>
        <div className={`h-full overflow-hidden ${activeTab === 'git' ? 'block' : 'hidden'}`}>
          <GitPanel selectedProject={selectedProject} isMobile={isMobile} />
        </div>
        <div className={`h-full overflow-hidden ${activeTab === 'analysis' ? 'block' : 'hidden'}`}>
          <div className="h-full flex flex-col">
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3v5h4l-2-2 5 5 7-7-1.5-1.5L11 7l-3-3-1 1V3H3zm9 11h5v-2h-5v2zm0 2h5v-2h-5v2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Code Analysis & Refactoring
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 max-w-md">
                  Analyze your code quality, get refactoring suggestions, and track complexity metrics for better maintainability.
                </p>
                <button
                  onClick={() => setShowCodeAnalysis(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Start Analysis
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className={`h-full overflow-hidden ${activeTab === 'testing' ? 'block' : 'hidden'}`}>
          <div className="h-full flex flex-col">
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Testing & Debugging
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 max-w-md">
                  Run tests, manage debug sessions, view coverage reports, and set up automated testing workflows.
                </p>
                <button
                  onClick={() => setShowTestingDebug(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                                    Start Testing
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className={`h-full overflow-hidden ${activeTab === 'analytics' ? 'block' : 'hidden'}`}>
          <div className="h-full flex flex-col">
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17h6l-3-9-3 9zm1-4h2" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Analytics & Usage Insights
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 max-w-md">
                  Track token usage, analyze productivity metrics, monitor costs, and optimize your Claude usage patterns.
                </p>
                <button
                  onClick={() => setShowAnalytics(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17h6l-3-9-3 9zm1-4h2" />
                  </svg>
                  View Analytics
                                 </button>
               </div>
             </div>
           </div>
         </div>
         <div className={`h-full overflow-hidden ${activeTab === 'collaboration' ? 'block' : 'hidden'}`}>
           <div className="h-full flex flex-col">
             <div className="flex-1 flex items-center justify-center p-8">
               <div className="text-center">
                 <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mx-auto mb-4">
                   <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                   </svg>
                 </div>
                 <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                   Collaboration & Sharing
                 </h3>
                 <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 max-w-md">
                   Share sessions with your team, manage collaborative workspaces, and work together in real-time.
                 </p>
                 <button
                   onClick={() => setShowCollaboration(true)}
                   className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                 >
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                   </svg>
                   Share & Collaborate
                 </button>
               </div>
             </div>
           </div>
         </div>
          <div className={`h-full overflow-hidden ${activeTab === 'preview' ? 'block' : 'hidden'}`}>
          {/* <LivePreviewPanel
            selectedProject={selectedProject}
            serverStatus={serverStatus}
            serverUrl={serverUrl}
            availableScripts={availableScripts}
            onStartServer={(script) => {
              sendMessage({
                type: 'server:start',
                projectPath: selectedProject?.fullPath,
                script: script
              });
            }}
            onStopServer={() => {
              sendMessage({
                type: 'server:stop',
                projectPath: selectedProject?.fullPath
              });
            }}
            onScriptSelect={setCurrentScript}
            currentScript={currentScript}
            isMobile={isMobile}
            serverLogs={serverLogs}
            onClearLogs={() => setServerLogs([])}
          /> */}
        </div>
      </div>

      {/* Code Editor Modal */}
      {editingFile && (
        <CodeEditor
          file={editingFile}
          onClose={handleCloseEditor}
          projectPath={selectedProject?.path}
        />
      )}

          {/* Code Analysis Panel Modal */}
    {showCodeAnalysis && (
      <CodeAnalysisPanel
        isOpen={showCodeAnalysis}
        onClose={() => setShowCodeAnalysis(false)}
        selectedProject={selectedProject}
      />
    )}

    {/* Testing & Debug Panel Modal */}
    {showTestingDebug && (
      <TestingDebugPanel
        isOpen={showTestingDebug}
        onClose={() => setShowTestingDebug(false)}
        selectedProject={selectedProject}
      />
    )}

    {/* Analytics Dashboard Modal */}
    {showAnalytics && (
      <AnalyticsDashboard
        isOpen={showAnalytics}
        onClose={() => setShowAnalytics(false)}
        selectedProject={selectedProject}
      />
    )}

    {/* Collaboration Hub Modal */}
    {showCollaboration && (
      <CollaborationHub
        isOpen={showCollaboration}
        onClose={() => setShowCollaboration(false)}
        selectedProject={selectedProject}
        currentSession={null} // TODO: Pass current session if available
      />
    )}

    {/* MCP Manager Modal */}
    {showMCPManager && (
      <MCPManager
        isOpen={showMCPManager}
        onClose={() => setShowMCPManager(false)}
        selectedProject={selectedProject}
        currentSession={null} // TODO: Pass current session if available
      />
    )}

    {/* Slash Commands Manager Modal */}
    {showSlashCommands && (
      <SlashCommandsManager
        isOpen={showSlashCommands}
        onClose={() => setShowSlashCommands(false)}
        selectedProject={selectedProject}
        currentSession={null} // TODO: Pass current session if available
      />
    )}

    {/* Subagent Orchestrator Modal */}
    {showSubagentOrchestrator && (
      <SubagentOrchestrator
        isOpen={showSubagentOrchestrator}
        onClose={() => setShowSubagentOrchestrator(false)}
        selectedProject={selectedProject}
        currentSession={null} // TODO: Pass current session if available
      />
    )}

    {/* Hooks Manager Modal */}
    {showHooksManager && (
      <HooksManager
        isOpen={showHooksManager}
        onClose={() => setShowHooksManager(false)}
        selectedProject={selectedProject}
        currentSession={null} // TODO: Pass current session if available
      />
    )}

    {/* Thinking Framework Modal */}
    {showThinkingFramework && (
      <ThinkingFramework
        isOpen={showThinkingFramework}
        onClose={() => setShowThinkingFramework(false)}
        selectedProject={selectedProject}
        currentSession={null} // TODO: Pass current session if available
      />
    )}

    {/* Web Search Browser Modal */}
    {showWebSearch && (
      <WebSearchBrowser
        isOpen={showWebSearch}
        onClose={() => setShowWebSearch(false)}
        selectedProject={selectedProject}
      />
    )}
  </div>
  );
}

export default React.memo(MainContent);