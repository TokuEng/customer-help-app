// Get the base URL for API calls
function getApiBaseUrl() {
  // For server-side rendering, check BACKEND_URL first
  if (typeof window === 'undefined') {
    const backendUrl = process.env.BACKEND_URL;
    if (backendUrl && backendUrl !== '') {
      return `${backendUrl}/api`;
    }
    // Fallback to internal service communication
    return 'http://api:8080/api';
  }
  
  // For client-side, use NEXT_PUBLIC_API_URL if available
  const envApiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (envApiUrl && envApiUrl !== '') {
    return envApiUrl;
  }
  
  // Fallback for client-side
  return '/backend/api';
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

export interface CategoryCount {
  category: string;
  count: number;
}

export interface WorkSubmissionRequest {
  request_type: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  submitter_name: string;
  submitter_email: string;
  submitter_role?: string;
  department?: string;
  tags?: string[];
  attachments?: Record<string, unknown>[];
}

export interface WorkSubmissionResponse {
  id: string;
  request_type: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  submitter_name: string;
  submitter_email: string;
  submitter_role?: string;
  department?: string;
  tags: string[];
  attachments?: Record<string, unknown>[];
  assigned_to?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

class APIClient {
  private async fetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const baseUrl = getApiBaseUrl();
    const fullUrl = `${baseUrl}${endpoint}`;
    
    const response = await fetch(fullUrl, {
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

  // New analytics tracking methods
  async trackSearch(query: string, filters?: Record<string, unknown>, resultsCount: number = 0): Promise<{ success: boolean }> {
    return this.fetch<{ success: boolean }>('/track-search', {
      method: 'POST',
      body: JSON.stringify({ 
        query, 
        filters, 
        results_count: resultsCount 
      }),
    });
  }

  async trackChat(
    sessionId: string | null, 
    userMessage: string, 
    assistantResponse?: string, 
    contextsUsed?: unknown[], 
    responseTimeMs?: number
  ): Promise<{ success: boolean }> {
    return this.fetch<{ success: boolean }>('/track-chat', {
      method: 'POST',
      body: JSON.stringify({ 
        session_id: sessionId,
        user_message: userMessage,
        assistant_response: assistantResponse,
        contexts_used: contextsUsed,
        response_time_ms: responseTimeMs
      }),
    });
  }

  async trackPageVisit(pagePath: string, pageTitle?: string, referrer?: string): Promise<{ success: boolean }> {
    return this.fetch<{ success: boolean }>('/track-page-visit', {
      method: 'POST',
      body: JSON.stringify({ 
        page_path: pagePath,
        page_title: pageTitle,
        referrer: referrer
      }),
    });
  }

  // Analytics dashboard methods (admin-only)
  async getSearchStats(days: number = 30, adminKey?: string): Promise<unknown> {
    return this.fetch<unknown>(`/search-stats?days=${days}`, {
      headers: adminKey ? { 'admin-key': adminKey } : {},
    });
  }

  async getChatStats(days: number = 30, adminKey?: string): Promise<unknown> {
    return this.fetch<unknown>(`/chat-stats?days=${days}`, {
      headers: adminKey ? { 'admin-key': adminKey } : {},
    });
  }

  async getPageVisitStats(days: number = 30, adminKey?: string): Promise<unknown> {
    return this.fetch<unknown>(`/page-visit-stats?days=${days}`, {
      headers: adminKey ? { 'admin-key': adminKey } : {},
    });
  }

  async getAnalyticsDashboard(days: number = 30, adminKey?: string): Promise<unknown> {
    return this.fetch<unknown>(`/dashboard?days=${days}`, {
      headers: adminKey ? { 'admin-key': adminKey } : {},
    });
  }

  async getCategoryCounts(): Promise<CategoryCount[]> {
    return this.fetch<CategoryCount[]>('/category-counts');
  }

  async submitWorkRequest(request: WorkSubmissionRequest): Promise<WorkSubmissionResponse> {
    return this.fetch<WorkSubmissionResponse>('/work-submissions', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getWorkSubmissions(params?: {
    status?: string;
    priority?: string;
    submitter_email?: string;
    limit?: number;
    offset?: number;
  }): Promise<WorkSubmissionResponse[]> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.priority) queryParams.append('priority', params.priority);
    if (params?.submitter_email) queryParams.append('submitter_email', params.submitter_email);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());
    
    const query = queryParams.toString();
    return this.fetch<WorkSubmissionResponse[]>(`/work-submissions${query ? `?${query}` : ''}`);
  }

  async getWorkSubmission(id: string): Promise<WorkSubmissionResponse> {
    return this.fetch<WorkSubmissionResponse>(`/work-submissions/${id}`);
  }

  async updateWorkSubmission(id: string, updates: {
    status?: string;
    priority?: string;
    assigned_to?: string;
    internal_notes?: string;
    resolution_notes?: string;
  }): Promise<WorkSubmissionResponse> {
    return this.fetch<WorkSubmissionResponse>(`/work-submissions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }
}

export const api = new APIClient();
