// Analytics tracking service for the help center

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

export interface TrackingData {
  articleId?: string;
  query?: string;
  results_count?: number;
  page_path?: string;
  page_title?: string;
  referrer?: string;
}

class AnalyticsService {
  // Track article view
  async trackArticleView(articleId: string): Promise<void> {
    try {
      await fetch(`${API_URL}/analytics/track-view`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ article_id: articleId }),
      });
    } catch {
      // Failed to track article view
    }
  }

  // Track search query
  async trackSearch(query: string, resultsCount: number = 0): Promise<void> {
    try {
      await fetch(`${API_URL}/analytics/track-search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          query, 
          results_count: resultsCount 
        }),
      });
    } catch {
      // Failed to track search
    }
  }

  // Track page visit
  async trackPageVisit(pagePath: string, pageTitle?: string): Promise<void> {
    try {
      await fetch(`${API_URL}/analytics/track-page`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          page_path: pagePath,
          page_title: pageTitle || document.title,
          referrer: document.referrer,
        }),
      });
    } catch {
      // Failed to track page visit
    }
  }
}

// Export singleton instance
export const analytics = new AnalyticsService();
