'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { api } from '@/lib/api';

interface PageVisitTrackerProps {
  pageTitle?: string;
}

export function PageVisitTracker({ pageTitle }: PageVisitTrackerProps) {
  const pathname = usePathname();

  useEffect(() => {
    const trackPageVisit = async () => {
      try {
        // Get referrer from document (previous page)
        const referrer = document.referrer || undefined;
        
        // Track the page visit
        await api.trackPageVisit(pathname, pageTitle, referrer);
      } catch {
        // Silently fail - don't disrupt user experience for analytics
      }
    };

    // Track after a short delay to ensure page has loaded
    const timeoutId = setTimeout(trackPageVisit, 500);
    
    return () => clearTimeout(timeoutId);
  }, [pathname, pageTitle]);

  // This component renders nothing visible
  return null;
}
