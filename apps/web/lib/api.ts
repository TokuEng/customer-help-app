// Get the base URL for API calls
function getApiBaseUrl() {
  // Use environment variable if available (for local development)
  const envApiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (envApiUrl && envApiUrl !== '') {
    return envApiUrl;
  }
  
  // For server-side rendering, we need the full internal URL
  if (typeof window === 'undefined') {
    return 'http://api:8080/api';  // Internal service-to-service communication
  }
  
  // For client-side, use relative URL with double prefix (DigitalOcean routing)
  return '/api/api';  // Double prefix due to DigitalOcean routing + API prefix
}

export interface SearchResult {
  title: string;
  slug: string;
  summary: string | null;
  type: string;
  category: string;
  reading_time_min: number;
  updated_at: string;
  snippet: string;
}

export interface Article {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  content_html: string;
  reading_time_min: number;
  type: string;
  category: string;
  tags: string[];
  persona: string;
  updated_at: string;
  toc: Array<{
    id: string;
    text: string;
    level: number;
  }>;
}

export interface RelatedArticle {
  slug: string;
  title: string;
  summary: string | null;
  type: string;
  category: string;
  reading_time_min: number;
}

export interface SearchRequest {
  q: string;
  top_k?: number;
  filters?: {
    category?: string;
    type?: string;
  };
}

export interface Suggestion {
  text: string;
  type: 'title' | 'category' | 'tag' | 'phrase';
  highlight?: string;
}

export interface SuggestionRequest {
  q: string;
  limit?: number;
}

export interface PopularArticle {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  reading_time_min: number;
  view_count: number;
}

class APIClient {
  private async fetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${getApiBaseUrl()}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    return response.json();
  }

  async search(params: SearchRequest): Promise<SearchResult[]> {
    return this.fetch<SearchResult[]>('/search', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async getArticle(slug: string): Promise<Article> {
    return this.fetch<Article>(`/articles/${slug}`);
  }

  async getRelatedArticles(slug: string, k: number = 5): Promise<RelatedArticle[]> {
    return this.fetch<RelatedArticle[]>(`/related?slug=${slug}&k=${k}`);
  }

  async submitFeedback(articleId: string, helpful: boolean, notes?: string): Promise<{ success: boolean; message: string }> {
    return this.fetch('/feedback', {
      method: 'POST',
      body: JSON.stringify({
        article_id: articleId,
        helpful,
        notes,
      }),
    });
  }

  async getSuggestions(params: SuggestionRequest): Promise<Suggestion[]> {
    return this.fetch<Suggestion[]>('/suggestions', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async trackArticleView(articleId: string): Promise<{ success: boolean }> {
    return this.fetch<{ success: boolean }>('/track-view', {
      method: 'POST',
      body: JSON.stringify({ article_id: articleId }),
    });
  }

  async getPopularArticles(limit: number = 5): Promise<PopularArticle[]> {
    return this.fetch<PopularArticle[]>(`/popular-articles?limit=${limit}`);
  }
}

export const api = new APIClient();
