'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api, type Suggestion } from '@/lib/api';
import { cleanMarkdown } from '@/lib/text-utils';
import { cn } from '@/lib/utils';
import { Search, Clock, TrendingUp } from 'lucide-react';

interface EnhancedSearchBarProps {
  placeholder?: string;
  autoFocus?: boolean;
}

export function EnhancedSearchBar({ 
  placeholder = 'Search help articles...', 
  autoFocus = false
}: EnhancedSearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load recent searches
  useEffect(() => {
    const stored = localStorage.getItem('recentSearches');
    if (stored) {
      try {
        setRecentSearches(JSON.parse(stored).slice(0, 3));
      } catch (e) {
        console.error('Failed to parse recent searches', e);
      }
    }
  }, []);

  // Save search to recent
  const saveRecentSearch = (searchQuery: string) => {
    const updated = [searchQuery, ...recentSearches.filter(s => s !== searchQuery)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };

  // Debounced suggestions fetch
  const fetchSuggestions = useCallback(async (searchQuery: string) => {
    if (searchQuery.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    try {
      const results = await api.getSuggestions({ q: searchQuery, limit: 5 });
      setSuggestions(results);
      setSelectedIndex(-1);
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounce effect
  useEffect(() => {
    setShowSuggestions(true);
    const timeoutId = setTimeout(() => {
      if (query.trim()) {
        fetchSuggestions(query);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, fetchSuggestions]);

  const handleSearch = (searchQuery?: string) => {
    const finalQuery = searchQuery || query;
    if (finalQuery.trim()) {
      saveRecentSearch(finalQuery.trim());
      router.push(`/search?q=${encodeURIComponent(finalQuery.trim())}`);
      setShowSuggestions(false);
      setQuery('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIndex >= 0 && suggestions[selectedIndex]) {
      handleSearch(suggestions[selectedIndex].text);
    } else {
      handleSearch();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => {
          const maxIndex = suggestions.length + (recentSearches.length > 0 ? recentSearches.length : 0) - 1;
          return prev < maxIndex ? prev + 1 : prev;
        });
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
      case 'Enter':
        if (selectedIndex >= 0) {
          e.preventDefault();
          const recentCount = recentSearches.length;
          if (selectedIndex < recentCount) {
            handleSearch(recentSearches[selectedIndex]);
          } else {
            handleSearch(suggestions[selectedIndex - recentCount].text);
          }
        }
        break;
    }
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const showDropdown = showSuggestions && (
    query.trim() || recentSearches.length > 0 || suggestions.length > 0
  );

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <form onSubmit={handleSubmit} className="w-full">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            autoFocus={autoFocus}
            className="w-full h-14 pl-12 pr-4 text-lg rounded-2xl border bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-[#1c46ce] focus:border-transparent transition-all"
          />
          <kbd className="absolute right-4 top-1/2 -translate-y-1/2 hidden md:inline-block rounded-lg border px-1.5 py-0.5 text-xs text-gray-500">
            ⌘K
          </kbd>
        </div>
      </form>

      {/* Enhanced Autocomplete Dropdown */}
      {showDropdown && (
        <div className="absolute top-full left-0 w-full z-50 bg-white border border-gray-200 rounded-xl shadow-xl mt-2 overflow-hidden">
          {/* Recent searches */}
          {!query && recentSearches.length > 0 && (
            <div className="p-3 border-b">
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                <Clock className="h-3 w-3" />
                Recent searches
              </div>
              {recentSearches.map((search, index) => {
                const isSelected = selectedIndex === index;
                return (
                  <div
                    key={`recent-${index}`}
                    className={cn(
                      "px-3 py-2 cursor-pointer rounded-lg transition-colors text-sm",
                      isSelected ? "bg-blue-50 text-blue-900" : "hover:bg-gray-50"
                    )}
                    onClick={() => handleSearch(search)}
                  >
                    {search}
                  </div>
                );
              })}
            </div>
          )}

          {/* Loading state */}
          {isLoading && (
            <div className="px-4 py-8 text-center">
              <div className="inline-flex items-center gap-2 text-sm text-gray-500">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-[#1c46ce]" />
                Finding suggestions...
              </div>
            </div>
          )}

          {/* Suggestions */}
          {!isLoading && suggestions.length > 0 && (
            <div className="p-3">
              {query && (
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                  <TrendingUp className="h-3 w-3" />
                  Suggestions
                </div>
              )}
              {suggestions.map((suggestion, index) => {
                const actualIndex = recentSearches.length + index;
                const isSelected = selectedIndex === actualIndex;
                const cleanText = cleanMarkdown(suggestion.text);
                
                return (
                  <div
                    key={`suggestion-${index}`}
                    className={cn(
                      "px-3 py-2 cursor-pointer rounded-lg transition-colors",
                      isSelected ? "bg-blue-50 text-blue-900" : "hover:bg-gray-50"
                    )}
                    onClick={() => handleSearch(suggestion.text)}
                  >
                    <div className="text-sm font-medium">
                      {suggestion.highlight ? (
                        <span dangerouslySetInnerHTML={{
                          __html: cleanMarkdown(suggestion.highlight).replace(
                            /<mark>/g, 
                            '<mark class="bg-yellow-200 text-inherit px-0.5 rounded">'
                          )
                        }} />
                      ) : (
                        cleanText
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* No results */}
          {!isLoading && query && suggestions.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-gray-500">
              No suggestions found for &quot;{query}&quot;
            </div>
          )}
        </div>
      )}
    </div>
  );
}
