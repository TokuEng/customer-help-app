'use client';

import { useState, useEffect } from 'react';
import { 
  BarChart3, Users, Search, 
  Eye, MessageSquare
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getAuthToken } from '@/lib/auth-token';

interface AnalyticsData {
  searchQueries: number;
  articleViews: number;
  chatInteractions: number;
  pageVisits: number;
  topSearches: Array<{ query: string; count: number }>;
  topArticles: Array<{ title: string; views: number; category: string }>;
  dailyStats: Array<{ date: string; searches: number; views: number }>;
  categoryEngagement: Record<string, number>;
}

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState('30d');
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    searchQueries: 0,
    articleViews: 0,
    chatInteractions: 0,
    pageVisits: 0,
    topSearches: [],
    topArticles: [],
    dailyStats: [],
    categoryEngagement: {}
  });
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';
      const token = getAuthToken();
      
      const response = await fetch(`${backendUrl}/admin/analytics?range=${timeRange}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange]);

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <BarChart3 className="h-12 w-12 text-gray-400 animate-pulse mx-auto mb-4" />
          <p className="text-gray-500">Loading analytics...</p>
        </div>
      </div>
    );
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getChangeIndicator = (current: number, previous: number) => {
    const change = ((current - previous) / previous) * 100;
    const isPositive = change >= 0;
    return (
      <span className={`text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {isPositive ? '↑' : '↓'} {Math.abs(change).toFixed(1)}%
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-8">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
            <p className="text-gray-500 mt-2">Track usage patterns and content performance</p>
          </div>
          
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-500 flex items-center">
                <Search className="h-4 w-4 mr-2" />
                Search Queries
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(analytics.searchQueries)}</div>
              <p className="text-xs text-gray-500 mt-1">
                {getChangeIndicator(analytics.searchQueries, analytics.searchQueries * 0.9)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-500 flex items-center">
                <Eye className="h-4 w-4 mr-2" />
                Article Views
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(analytics.articleViews)}</div>
              <p className="text-xs text-gray-500 mt-1">
                {getChangeIndicator(analytics.articleViews, analytics.articleViews * 0.85)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-500 flex items-center">
                <MessageSquare className="h-4 w-4 mr-2" />
                Chat Sessions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(analytics.chatInteractions)}</div>
              <p className="text-xs text-gray-500 mt-1">
                {getChangeIndicator(analytics.chatInteractions, analytics.chatInteractions * 0.8)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-500 flex items-center">
                <Users className="h-4 w-4 mr-2" />
                Page Visits
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(analytics.pageVisits)}</div>
              <p className="text-xs text-gray-500 mt-1">
                {getChangeIndicator(analytics.pageVisits, analytics.pageVisits * 0.95)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Analytics Tabs */}
        <Tabs defaultValue="search" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="search">Search Analytics</TabsTrigger>
            <TabsTrigger value="content">Content Performance</TabsTrigger>
            <TabsTrigger value="engagement">User Engagement</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Top Search Queries</CardTitle>
                  <CardDescription>Most frequently searched terms</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analytics.topSearches.length === 0 ? (
                      <p className="text-gray-500 text-center py-4">No search data available</p>
                    ) : (
                      analytics.topSearches.slice(0, 10).map((search, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-gray-400 w-6">
                              {index + 1}.
                            </span>
                            <span className="text-sm">{search.query}</span>
                          </div>
                          <Badge variant="secondary">{search.count}</Badge>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Search Insights</CardTitle>
                  <CardDescription>Search behavior patterns</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Avg. searches per user</span>
                      <span className="font-medium">3.2</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Search success rate</span>
                      <span className="font-medium">78%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Searches with no results</span>
                      <span className="font-medium">12%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Avg. time to result click</span>
                      <span className="font-medium">8.3s</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="content" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Most Viewed Articles</CardTitle>
                  <CardDescription>Top performing content</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analytics.topArticles.length === 0 ? (
                      <p className="text-gray-500 text-center py-4">No article data available</p>
                    ) : (
                      analytics.topArticles.slice(0, 10).map((article, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-medium truncate">{article.title}</p>
                            <p className="text-xs text-gray-500">{article.category}</p>
                          </div>
                          <Badge>{article.views} views</Badge>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Category Performance</CardTitle>
                  <CardDescription>Views by category</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(analytics.categoryEngagement).map(([category, views]) => (
                      <div key={category}>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm">{category}</span>
                          <span className="text-sm text-gray-500">{views} views</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full" 
                            style={{ 
                              width: `${(views / Math.max(...Object.values(analytics.categoryEngagement))) * 100}%` 
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="engagement" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>User Behavior</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm">Avg. session duration</span>
                      <span className="font-medium">4m 32s</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Pages per session</span>
                      <span className="font-medium">2.8</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Bounce rate</span>
                      <span className="font-medium">32%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Chat Engagement</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm">Avg. messages per chat</span>
                      <span className="font-medium">4.2</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Chat resolution rate</span>
                      <span className="font-medium">68%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Avg. response time</span>
                      <span className="font-medium">1.8s</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Content Feedback</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm">Helpful ratings</span>
                      <span className="font-medium">234</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Not helpful ratings</span>
                      <span className="font-medium">45</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Satisfaction rate</span>
                      <span className="font-medium">84%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="trends" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Usage Trends</CardTitle>
                <CardDescription>Activity patterns over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center py-8 text-gray-500">
                    <BarChart3 className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>Interactive charts coming soon</p>
                    <p className="text-sm mt-2">View detailed trends and patterns</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}