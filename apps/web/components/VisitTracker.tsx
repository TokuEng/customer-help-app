'use client';

import { useEffect } from 'react';
import { api } from '@/lib/api';

interface VisitTrackerProps {
  articleId: string;
}

export function VisitTracker({ articleId }: VisitTrackerProps) {
  useEffect(() => {
    // Track the visit when the component mounts
    const trackVisit = async () => {
      try {
        await api.trackArticleView(articleId);
      } catch (error) {
        // Silently fail - don't disrupt user experience for analytics
        // Failed to track article view
      }
    };

    trackVisit();
  }, [articleId]);

  // This component renders nothing visible
  return null;
}
