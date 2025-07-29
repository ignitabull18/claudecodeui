import React, { useState, useEffect } from 'react';
import { cn } from '../lib/utils';

function ClaudeStatus({ status, onAbort, isLoading }) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [animationPhase, setAnimationPhase] = useState(0);
  
  // Update elapsed time every second
  useEffect(() => {
    if (!isLoading) {
      setElapsedTime(0);
      return;
    }
    
    const startTime = Date.now();
    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setElapsedTime(elapsed);
    }, 1000);
    
    return () => clearInterval(timer);
  }, [isLoading]);
  
  // Animate the status indicator
  useEffect(() => {
    if (!isLoading) return;
    
    const timer = setInterval(() => {
      setAnimationPhase(prev => (prev + 1) % 4);
    }, 500);
    
    return () => clearInterval(timer);
  }, [isLoading]);
  
  if (!isLoading) return null;
  
  // Clever action words that cycle
  const actionWords = ['Thinking', 'Processing', 'Analyzing', 'Working', 'Computing', 'Reasoning'];
  const actionIndex = Math.floor(elapsedTime / 3) % actionWords.length;
  
  // Parse real status data from Claude CLI
  const statusText = status?.text || status?.stage || actionWords[actionIndex];
  const tokens = status?.tokens_used || status?.token_count || 0;
  const canInterrupt = status?.can_interrupt !== false;
  
  // Get real model information
  const model = status?.model || 'claude-3.5-sonnet';
  const sessionId = status?.session_id;
  
  // Animation characters
  const spinners = ['✻', '✹', '✸', '✶'];
  const currentSpinner = spinners[animationPhase];
  
  return (
    <div className="w-full mb-6 animate-in slide-in-from-bottom duration-300">
      <div className="flex items-center justify-between max-w-4xl mx-auto bg-gray-900 dark:bg-gray-950 text-white rounded-lg shadow-lg px-4 py-3">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            {/* Animated spinner */}
            <span className={cn(
              "text-blue-400 font-mono text-lg transition-transform duration-300",
              "animate-pulse"
            )}>
              {currentSpinner}
            </span>
            
            {/* Status text */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-white font-medium truncate">
                  {statusText}
                </span>
                {sessionId && (
                  <span className="text-xs text-gray-400 font-mono bg-gray-800 px-2 py-1 rounded">
                    {sessionId.slice(0, 8)}
                  </span>
                )}
              </div>
              
              {/* Model and metrics */}
              <div className="flex items-center gap-4 mt-1 text-sm text-gray-400">
                <span className="font-mono">{model}</span>
                <span>•</span>
                <span>{elapsedTime}s</span>
                {tokens > 0 && (
                  <>
                    <span>•</span>
                    <span className="font-mono">{tokens.toLocaleString()} tokens</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Abort button */}
        {canInterrupt && onAbort && (
          <button
            onClick={onAbort}
            className="ml-3 px-3 py-1.5 text-sm bg-red-600/20 hover:bg-red-600/30 text-red-400 hover:text-red-300 border border-red-600/30 rounded-md transition-all duration-200 flex items-center gap-1.5"
            title="Stop generation"
          >
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
            Stop
          </button>
        )}
      </div>
      
      {/* Progress indicator */}
      <div className="max-w-4xl mx-auto mt-2">
        <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-1000 ease-out"
            style={{
              width: `${Math.min((elapsedTime / 30) * 100, 100)}%`, // Progress based on typical response time
              animation: 'pulse 2s infinite'
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default ClaudeStatus;