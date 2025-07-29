import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, User, Lock, ExternalLink } from 'lucide-react';

const LoginPage = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [authMode, setAuthMode] = useState('claude'); // 'claude' or 'local'

  const handleLocalLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await login(username, password);
    
    if (!result.success) {
      setError(result.error);
    }
    setLoading(false);
  };

  const handleClaudeAuth = async () => {
    setLoading(true);
    setError('');

    try {
      // Check if Claude is already authenticated
      const checkResponse = await fetch('/api/claude/auth/check');
      const checkData = await checkResponse.json();

      if (checkData.authenticated) {
        // Already authenticated, log them in
        const result = await login('claude', 'authenticated-via-claude');
        if (!result.success) {
          setError('Failed to authenticate with Claude credentials');
        }
      } else {
        // Need to authenticate with Claude
        const authResponse = await fetch('/api/claude/auth/setup', {
          method: 'POST'
        });
        const authData = await authResponse.json();

        if (authData.success) {
          // Show instructions or open auth URL
          if (authData.authUrl) {
            window.open(authData.authUrl, '_blank');
            setError('Please complete authentication in the new window and then click "Check Authentication Status"');
          } else {
            setError('Please run "claude setup-token" in your terminal to authenticate');
          }
        }
      }
    } catch (err) {
      setError('Failed to initiate Claude authentication');
    } finally {
      setLoading(false);
    }
  };

  const checkClaudeStatus = async () => {
    setLoading(true);
    setError('');

    try {
      const checkResponse = await fetch('/api/claude/auth/check');
      const checkData = await checkResponse.json();

      if (checkData.authenticated) {
        const result = await login('claude', 'authenticated-via-claude');
        if (!result.success) {
          setError('Failed to login with Claude credentials');
        }
      } else {
        setError('Claude authentication not complete. Please authenticate first.');
      }
    } catch (err) {
      setError('Failed to check authentication status');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Claude Code UI
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Sign in to continue
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          {/* Auth Mode Tabs */}
          <div className="flex mb-6 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              type="button"
              onClick={() => setAuthMode('claude')}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
                authMode === 'claude'
                  ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Claude Account
            </button>
            <button
              type="button"
              onClick={() => setAuthMode('local')}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
                authMode === 'local'
                  ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Local Account
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-md">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {authMode === 'claude' ? (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Sign in with your Claude/Anthropic account
                </p>
              </div>

              <button
                onClick={handleClaudeAuth}
                disabled={loading}
                className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-md transition-colors"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <ExternalLink className="w-5 h-5 mr-2" />
                    Sign in with Claude
                  </>
                )}
              </button>

              <button
                onClick={checkClaudeStatus}
                disabled={loading}
                className="w-full flex items-center justify-center px-4 py-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-medium rounded-md transition-colors"
              >
                Check Authentication Status
              </button>

              <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                <p>First time? This will open Claude authentication in a new window.</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleLocalLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Username
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter username"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter password"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-md transition-colors"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  'Sign In'
                )}
              </button>

              <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                <p>Default: admin / admin123</p>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage; 