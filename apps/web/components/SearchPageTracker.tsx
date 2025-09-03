'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { SearchTracker } from '@/components/SearchTracker';

interface SearchPageTrackerProps {
  resultsCount: number;
}

export function SearchPageTracker({ resultsCount }: SearchPageTrackerProps) {
  const searchParams = useSearchParams();
  
  useEffect(() => {
    const query = searchParams.get('q');
    const category = searchParams.get('category');
    const type = searchParams.get('type');
    
    if (query && query.trim()) {
      // Track the search with results count and filters
      SearchTracker.trackSearch(query, resultsCount, {
        category: category || undefined,
        type: type || undefined,
      });
    }
  }, [searchParams, resultsCount]);

  // This component renders nothing visible
  return null;
}
