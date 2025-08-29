'use client';

import { useEffect } from 'react';

interface RecentArticleTrackerProps {
  title: string;
  slug: string;
}

export function RecentArticleTracker({ title, slug }: RecentArticleTrackerProps) {
  useEffect(() => {
    const maxRecent = 10;
    const recentKey = 'recentArticles';
    
    try {
      const stored = localStorage.getItem(recentKey);
      let recent: Array<{ title: string; slug: string }> = [];
      
      if (stored) {
        recent = JSON.parse(stored);
      }
      
      // Remove if already exists
      recent = recent.filter(item => item.slug !== slug);
      
      // Add to beginning
      recent.unshift({ title, slug });
      
      // Limit to max
      recent = recent.slice(0, maxRecent);
      
      localStorage.setItem(recentKey, JSON.stringify(recent));
    } catch (e) {
      // Failed to save recent article to localStorage
    }
  }, [title, slug]);
  
  return null;
}
