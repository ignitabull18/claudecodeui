import React, { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { 
  Search, 
  Globe, 
  BookOpen, 
  ExternalLink, 
  X, 
  Loader2, 
  History, 
  Bookmark, 
  Filter,
  FileText,
  Code,
  Terminal,
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
  Star,
  ChevronRight,
  RefreshCw,
  Link,
  Copy,
  Download
} from 'lucide-react';

const SEARCH_TYPES = {
  WEB: { id: 'web', label: 'Web Search', icon: Globe, description: 'Search the entire web' },
  DOCS: { id: 'docs', label: 'Documentation', icon: BookOpen, description: 'Search technical documentation' },
  CODE: { id: 'code', label: 'Code Examples', icon: Code, description: 'Find code snippets and examples' },
  TUTORIALS: { id: 'tutorials', label: 'Tutorials', icon: FileText, description: 'Find guides and tutorials' }
};

const DOCUMENTATION_SOURCES = {
  mdn: { name: 'MDN Web Docs', url: 'developer.mozilla.org', icon: Globe },
  react: { name: 'React Documentation', url: 'react.dev', icon: Code },
  nodejs: { name: 'Node.js Documentation', url: 'nodejs.org/docs', icon: Terminal },
  python: { name: 'Python Documentation', url: 'docs.python.org', icon: Code },
  typescript: { name: 'TypeScript Handbook', url: 'typescriptlang.org/docs', icon: Code }
};

function WebSearchBrowser({ isOpen, onClose, selectedProject, initialQuery = '' }) {
  // State management
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [searchType, setSearchType] = useState('web');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchHistory, setSearchHistory] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [selectedResult, setSelectedResult] = useState(null);
  const [filters, setFilters] = useState({
    timeRange: 'anytime', // anytime, hour, day, week, month, year
    language: 'en',
    safeSearch: true,
    includeImages: false
  });
  const [activeTab, setActiveTab] = useState('search'); // search, history, bookmarks
  const [error, setError] = useState(null);
  const [claudeEnabled, setClaudeEnabled] = useState(true);
  
  const searchInputRef = useRef(null);

  // Load history and bookmarks on mount
  useEffect(() => {
    if (isOpen) {
      loadSearchHistory();
      loadBookmarks();
      checkClaudeAvailability();
      searchInputRef.current?.focus();
    }
  }, [isOpen]);

  // Check if Claude is available for web search
  const checkClaudeAvailability = async () => {
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/api/web-search/check', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setClaudeEnabled(data.available);
    } catch (error) {
      console.error('Error checking Claude availability:', error);
      setClaudeEnabled(false);
    }
  };

  // Load search history
  const loadSearchHistory = async () => {
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/api/web-search/history', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setSearchHistory(data.history || []);
      }
    } catch (error) {
      console.error('Error loading search history:', error);
    }
  };

  // Load bookmarks
  const loadBookmarks = async () => {
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/api/web-search/bookmarks', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setBookmarks(data.bookmarks || []);
      }
    } catch (error) {
      console.error('Error loading bookmarks:', error);
    }
  };

  // Perform web search using Claude
  const performSearch = async () => {
    if (!searchQuery.trim() || !claudeEnabled) return;

    setIsSearching(true);
    setError(null);
    setSearchResults([]);

    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/api/web-search/search', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: searchQuery,
          type: searchType,
          filters,
          projectContext: selectedProject ? {
            name: selectedProject.name,
            path: selectedProject.path
          } : null
        })
      });

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.results || []);
        
        // Add to history
        addToHistory({
          query: searchQuery,
          type: searchType,
          timestamp: new Date().toISOString(),
          resultCount: data.results.length
        });
      } else {
        const error = await response.json();
        setError(error.error || 'Search failed');
      }
    } catch (error) {
      console.error('Error performing search:', error);
      setError('Failed to perform search. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  // Add search to history
  const addToHistory = async (searchData) => {
    try {
      const token = localStorage.getItem('auth-token');
      await fetch('/api/web-search/history', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(searchData)
      });
      loadSearchHistory();
    } catch (error) {
      console.error('Error adding to history:', error);
    }
  };

  // Toggle bookmark
  const toggleBookmark = async (result) => {
    try {
      const token = localStorage.getItem('auth-token');
      const isBookmarked = bookmarks.some(b => b.url === result.url);
      
      if (isBookmarked) {
        await fetch(`/api/web-search/bookmarks/${encodeURIComponent(result.url)}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } else {
        await fetch('/api/web-search/bookmarks', {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            title: result.title,
            url: result.url,
            snippet: result.snippet,
            type: searchType
          })
        });
      }
      
      loadBookmarks();
    } catch (error) {
      console.error('Error toggling bookmark:', error);
    }
  };

  // Copy URL to clipboard
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  // Open URL in new tab
  const openInNewTab = (url) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Clear search history
  const clearHistory = async () => {
    if (!confirm('Are you sure you want to clear your search history?')) return;
    
    try {
      const token = localStorage.getItem('auth-token');
      await fetch('/api/web-search/history', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setSearchHistory([]);
    } catch (error) {
      console.error('Error clearing history:', error);
    }
  };

  // Render search result
  const renderSearchResult = (result, index) => {
    const isBookmarked = bookmarks.some(b => b.url === result.url);
    
    return (
      <div
        key={index}
        className={`p-4 border rounded-lg hover:border-blue-500 transition-colors cursor-pointer ${
          selectedResult?.url === result.url ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700'
        }`}
        onClick={() => setSelectedResult(result)}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h3 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
              {result.title}
              {result.source && (
                <Badge variant="outline" className="text-xs">
                  {result.source}
                </Badge>
              )}
            </h3>
            <a
              href={result.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              {result.url}
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleBookmark(result);
              }}
              className={`p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 ${
                isBookmarked ? 'text-yellow-500' : 'text-gray-400'
              }`}
            >
              <Star className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                copyToClipboard(result.url);
              }}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
          {result.snippet}
        </p>
        
        {result.metadata && (
          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-500">
            {result.metadata.date && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(result.metadata.date).toLocaleDateString()}
              </span>
            )}
            {result.metadata.readTime && (
              <span>{result.metadata.readTime} read</span>
            )}
            {result.metadata.language && (
              <Badge variant="outline" className="text-xs">
                {result.metadata.language}
              </Badge>
            )}
          </div>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-6xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Globe className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Web Search & Documentation Browser
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Powered by Claude's web browsing capabilities
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

        {/* Claude Status */}
        {!claudeEnabled && (
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800">
            <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
              <AlertCircle className="w-5 h-5" />
              <span>Claude web search is not available. Please check your Claude configuration.</span>
            </div>
          </div>
        )}

        {/* Search Type Tabs */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            {Object.values(SEARCH_TYPES).map((type) => (
              <button
                key={type.id}
                onClick={() => setSearchType(type.id)}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                  searchType === type.id
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
                }`}
              >
                <type.icon className="w-4 h-4" />
                <span className="text-sm font-medium">{type.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <form onSubmit={(e) => { e.preventDefault(); performSearch(); }} className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search ${SEARCH_TYPES[searchType].label.toLowerCase()}...`}
                className="pl-10 pr-4 py-2 w-full"
                disabled={!claudeEnabled || isSearching}
              />
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('filters')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <Filter className="w-5 h-5" />
            </button>
            <Button
              type="submit"
              disabled={!claudeEnabled || isSearching || !searchQuery.trim()}
              className="flex items-center gap-2"
            >
              {isSearching ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  Search
                </>
              )}
            </Button>
          </form>
        </div>

        {/* Navigation Tabs */}
        <div className="px-4 pt-4 flex items-center gap-4 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('search')}
            className={`px-4 py-2 border-b-2 transition-colors ${
              activeTab === 'search'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Search Results
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'history'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <History className="w-4 h-4" />
            History
          </button>
          <button
            onClick={() => setActiveTab('bookmarks')}
            className={`px-4 py-2 border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'bookmarks'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Bookmark className="w-4 h-4" />
            Bookmarks
          </button>
        </div>

        {/* Content Area */}
        <ScrollArea className="flex-1 p-4">
          {/* Search Results */}
          {activeTab === 'search' && (
            <div className="space-y-4">
              {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <p className="text-red-800 dark:text-red-200">{error}</p>
                </div>
              )}
              
              {searchResults.length > 0 ? (
                searchResults.map((result, index) => renderSearchResult(result, index))
              ) : (
                !isSearching && (
                  <div className="text-center py-12">
                    <Globe className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">
                      {searchQuery ? 'No results found' : 'Enter a search query to get started'}
                    </p>
                  </div>
                )
              )}
            </div>
          )}

          {/* History */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-gray-900 dark:text-white">Recent Searches</h3>
                {searchHistory.length > 0 && (
                  <button
                    onClick={clearHistory}
                    className="text-sm text-red-600 hover:text-red-700 dark:text-red-400"
                  >
                    Clear History
                  </button>
                )}
              </div>
              
              {searchHistory.length > 0 ? (
                searchHistory.map((item, index) => (
                  <div
                    key={index}
                    className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 cursor-pointer"
                    onClick={() => {
                      setSearchQuery(item.query);
                      setSearchType(item.type);
                      setActiveTab('search');
                      performSearch();
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Search className="w-4 h-4 text-gray-400" />
                        <span className="font-medium">{item.query}</span>
                        <Badge variant="outline" className="text-xs">
                          {SEARCH_TYPES[item.type]?.label}
                        </Badge>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(item.timestamp).toLocaleString()}
                      </span>
                    </div>
                    {item.resultCount !== undefined && (
                      <p className="text-sm text-gray-500 mt-1">
                        {item.resultCount} results
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <History className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">No search history</p>
                </div>
              )}
            </div>
          )}

          {/* Bookmarks */}
          {activeTab === 'bookmarks' && (
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900 dark:text-white mb-4">Saved Bookmarks</h3>
              
              {bookmarks.length > 0 ? (
                bookmarks.map((bookmark, index) => (
                  <div
                    key={index}
                    className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                          {bookmark.title}
                        </h4>
                        <a
                          href={bookmark.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                        >
                          {bookmark.url}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                        {bookmark.snippet && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                            {bookmark.snippet}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => toggleBookmark(bookmark)}
                        className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-yellow-500"
                      >
                        <Star className="w-4 h-4 fill-current" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <Bookmark className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">No bookmarks saved</p>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Documentation Sources (Bottom Bar) */}
        {searchType === 'docs' && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500 dark:text-gray-400">Quick Access:</span>
              {Object.entries(DOCUMENTATION_SOURCES).map(([key, source]) => (
                <button
                  key={key}
                  onClick={() => openInNewTab(`https://${source.url}`)}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                >
                  <source.icon className="w-3 h-3" />
                  {source.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default WebSearchBrowser; 