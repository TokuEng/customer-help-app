'use client';

import { api } from '@/lib/api';

// This component provides utility functions rather than rendering

class SearchTracker {
  /**
   * Track a search query with results count and filters
   */
  static async trackSearch(
    query: string, 
    resultsCount: number = 0, 
    filters?: { category?: string; type?: string; [key: string]: unknown }
  ): Promise<void> {
    try {
      await api.trackSearch(query, filters, resultsCount);
    } catch {
      // Silently fail - don't disrupt user experience for analytics
    }
  }

  /**
   * Track a search suggestion click
   */
  static async trackSuggestionClick(
    originalQuery: string,
    selectedSuggestion: string
  ): Promise<void> {
    try {
      // Track as a special search with metadata
      await api.trackSearch(selectedSuggestion, { 
        source: 'suggestion', 
        original_query: originalQuery 
      }, 0);
    } catch {
      // Silently fail
    }
  }
}

export { SearchTracker };
