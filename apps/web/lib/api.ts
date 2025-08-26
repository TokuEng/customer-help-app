const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

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

class APIClient {
  private async fetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
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
}

export const api = new APIClient();
