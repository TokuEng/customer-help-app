'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { api, type Suggestion } from '@/lib/api';
import { cleanMarkdown } from '@/lib/text-utils';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Icon } from '@/components/ui/icon';

interface SearchBarProps {
  defaultValue?: string;
  placeholder?: string;
  autoFocus?: boolean;
  size?: 'default' | 'large';
}

export function SearchBar({ 
  defaultValue = '', 
  placeholder = 'Search help articles...', 
  autoFocus = false,
  size = 'default'
}: SearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState(defaultValue);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const isLarge = size === 'large';

  // Debounced suggestions fetch
  const fetchSuggestions = useCallback(async (searchQuery: string) => {
    if (searchQuery.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsLoading(true);
    try {
      const results = await api.getSuggestions({ q: searchQuery, limit: 5 });
      setSuggestions(results);
      setShowSuggestions(true);
      setSelectedIndex(-1);
    } catch (error) {
      // Failed to fetch suggestions
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounce effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (query !== defaultValue) { // Don't fetch on initial load
        fetchSuggestions(query);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, fetchSuggestions, defaultValue]);

  const handleSearch = (searchQuery?: string) => {
    const finalQuery = searchQuery || query;
    if (finalQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(finalQuery.trim())}`);
      setShowSuggestions(false);
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
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
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
          handleSearch(suggestions[selectedIndex].text);
        }
        break;
    }
  };

  const handleSuggestionClick = (suggestion: Suggestion) => {
    handleSearch(suggestion.text);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    if (!e.target.value.trim()) {
      setShowSuggestions(false);
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

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <form onSubmit={handleSubmit} className="w-full">
        <div className="relative">
          <Input
            ref={inputRef}
            type="search"
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            autoFocus={autoFocus}
            className={cn(
              "w-full pr-10",
              isLarge && "h-14 text-lg px-6 pr-14"
            )}
          />
          <Button
            type="submit"
            size="icon"
            className={cn(
              "absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8",
              isLarge && "right-3 h-10 w-10"
            )}
            variant="ghost"
          >
            <Icon name="search" className={`${isLarge ? "h-6 w-6" : "h-5 w-5"} text-gray-600 hover:text-primary transition-colors`} />
            <span className="sr-only">Search</span>
          </Button>
        </div>
      </form>

      {/* Autocomplete Dropdown */}
      {showSuggestions && (suggestions.length > 0 || isLoading) && (
        <div className="absolute top-full left-0 w-full z-50 bg-white border border-gray-200 rounded-lg shadow-xl mt-2 max-h-80 overflow-y-auto">
          {isLoading && (
            <div className="px-4 py-3 space-y-2">
              <div className="text-sm text-gray-500 text-center font-medium">Finding suggestions...</div>
              <Progress 
                value={66} 
                className="h-1.5 [&>div]:bg-gradient-to-r [&>div]:from-cyan-400 [&>div]:via-sky-500 [&>div]:to-indigo-500 [&>div]:rounded-l-full"
              />
            </div>
          )}
          
          {!isLoading && suggestions.map((suggestion, index) => {
            const isSelected = selectedIndex === index;
            const cleanText = cleanMarkdown(suggestion.text);
            
            return (
              <div
                key={`${suggestion.type}-${suggestion.text}`}
                className={cn(
                  "px-4 py-2 cursor-pointer transition-colors duration-150",
                  "border-b border-gray-50 last:border-b-0",
                  isSelected 
                    ? "bg-blue-50 text-blue-900" 
                    : "hover:bg-gray-50 text-gray-900"
                )}
                onClick={() => handleSuggestionClick(suggestion)}
              >
                <div className="text-sm font-semibold text-left">
                  {suggestion.highlight ? (
                    <span dangerouslySetInnerHTML={{
                      __html: cleanMarkdown(suggestion.highlight).replace(/<mark>/g, '<mark class="bg-blue-200 text-blue-900 px-1 rounded">')
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
    </div>
  );
}


