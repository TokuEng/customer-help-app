'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface DashboardData {
  article_views: {
    total: number;
    unique_articles: number;
  };
  searches: {
    total: number;
    unique_queries: number;
  };
  chats: {
    total: number;
    unique_sessions: number;
  };
  page_visits: {
    total: number;
    unique_pages: number;
  };
  time_range: string;
}

interface SearchStats {
  total_searches: number;
  unique_queries: number;
  top_queries: Array<{
    query: string;
    count: number;
    avg_results: number;
  }>;
  avg_results_count: number;
}

interface ChatStats {
  total_chats: number;
  unique_sessions: number;
  avg_response_time_ms: number | null;
  top_questions: Array<{
    question: string;
    count: number;
  }>;
}

interface PageVisitStats {
  total_visits: number;
  unique_pages: number;
  top_pages: Array<{
    path: string;
    title: string | null;
    count: number;
  }>;
}

export default function AdminAnalyticsPage() {
  const [adminKey, setAdminKey] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [searchStats, setSearchStats] = useState<SearchStats | null>(null);
  const [chatStats, setChatStats] = useState<ChatStats | null>(null);
  const [pageVisitStats, setPageVisitStats] = useState<PageVisitStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);

  const loadAllData = useCallback(async () => {
    if (!authenticated || !adminKey) return;
    
    setLoading(true);
    try {
      const [dashboard, search, chat, pageVisit] = await Promise.all([
        api.getAnalyticsDashboard(days, adminKey),
        api.getSearchStats(days, adminKey),
        api.getChatStats(days, adminKey),
        api.getPageVisitStats(days, adminKey),
      ]);
      
      setDashboardData(dashboard as DashboardData);
      setSearchStats(search as SearchStats);
      setChatStats(chat as ChatStats);
      setPageVisitStats(pageVisit as PageVisitStats);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  }, [authenticated, adminKey, days]);

  const handleAuth = async () => {
    if (!adminKey.trim()) {
      setError('Please enter an admin key');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Test authentication by fetching dashboard data
      await api.getAnalyticsDashboard(days, adminKey);
      setAuthenticated(true);
      await loadAllData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid admin key');
      setAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authenticated) {
      loadAllData();
    }
  }, [days, authenticated, loadAllData]);

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Admin Analytics Access</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Admin Key</label>
              <Input
                type="password"
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                placeholder="Enter admin access key"
                onKeyPress={(e) => e.key === 'Enter' && handleAuth()}
              />
            </div>
            {error && (
              <div className="text-red-600 text-sm">{error}</div>
            )}
            <Button 
              onClick={handleAuth} 
              disabled={loading} 
              className="w-full"
            >
              {loading ? 'Authenticating...' : 'Access Dashboard'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
            <div className="flex items-center gap-4">
              <select
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="px-3 py-2 border rounded-md"
              >
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
              </select>
              <Button 
                onClick={loadAllData} 
                disabled={loading}
                variant="outline"
              >
                {loading ? 'Refreshing...' : 'Refresh'}
              </Button>
            </div>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          {/* Overview Cards */}
          {dashboardData && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Article Views</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{dashboardData.article_views.total.toLocaleString()}</div>
                  <p className="text-sm text-gray-600 mt-1">
                    {dashboardData.article_views.unique_articles} unique articles
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Searches</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{dashboardData.searches.total.toLocaleString()}</div>
                  <p className="text-sm text-gray-600 mt-1">
                    {dashboardData.searches.unique_queries} unique queries
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Chat Sessions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{dashboardData.chats.total.toLocaleString()}</div>
                  <p className="text-sm text-gray-600 mt-1">
                    {dashboardData.chats.unique_sessions} unique sessions
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Page Visits</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{dashboardData.page_visits.total.toLocaleString()}</div>
                  <p className="text-sm text-gray-600 mt-1">
                    {dashboardData.page_visits.unique_pages} unique pages
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Top Search Queries */}
            {searchStats && (
              <Card>
                <CardHeader>
                  <CardTitle>Top Search Queries</CardTitle>
                  <p className="text-sm text-gray-600">
                    Avg results: {searchStats.avg_results_count.toFixed(1)} per query
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {searchStats.top_queries.map((query, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex-1 mr-4">
                          <span className="font-medium">{query.query}</span>
                          <div className="text-sm text-gray-500">
                            Avg {query.avg_results.toFixed(1)} results
                          </div>
                        </div>
                        <Badge variant="secondary">{query.count}x</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Top Chat Questions */}
            {chatStats && (
              <Card>
                <CardHeader>
                  <CardTitle>Top Chat Questions</CardTitle>
                  {chatStats.avg_response_time_ms && (
                    <p className="text-sm text-gray-600">
                      Avg response: {(chatStats.avg_response_time_ms / 1000).toFixed(1)}s
                    </p>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {chatStats.top_questions.map((question, i) => (
                      <div key={i} className="flex items-start justify-between">
                        <div className="flex-1 mr-4">
                          <span className="font-medium text-sm">{question.question}</span>
                        </div>
                        <Badge variant="secondary">{question.count}x</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Top Pages */}
            {pageVisitStats && (
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Top Pages</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {pageVisitStats.top_pages.map((page, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex-1 mr-4">
                          <span className="font-medium">{page.path}</span>
                          {page.title && (
                            <div className="text-sm text-gray-500">{page.title}</div>
                          )}
                        </div>
                        <Badge variant="secondary">{page.count} visits</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
