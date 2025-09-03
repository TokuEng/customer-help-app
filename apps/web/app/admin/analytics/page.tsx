'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Search, MessageSquare, Eye, Users, RefreshCw } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { format } from 'date-fns'
import { getAuthToken } from '@/lib/auth-token'

interface AnalyticsOverview {
  period_days: number
  article_metrics: {
    total_views: number
    unique_articles_viewed: number
  }
  search_metrics: {
    total_searches: number
    unique_queries: number
  }
  chat_metrics: {
    total_chats: number
    unique_sessions: number
  }
  page_visits: number
  popular_articles: Array<{
    id: string
    slug: string
    title: string
    view_count: number
  }>
  top_search_queries: Array<{
    query: string
    count: number
    avg_results: number
  }>
}

interface TrendsData {
  views?: Array<{ date: string; count: number }>
  searches?: Array<{ date: string; count: number }>
  chats?: Array<{ date: string; count: number }>
}

export default function AnalyticsAdmin() {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null)
  const [trends, setTrends] = useState<TrendsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [periodDays, setPeriodDays] = useState('7')
  const [activeTab, setActiveTab] = useState('overview')

  const fetchAnalytics = useCallback(async () => {
    try {
      const token = getAuthToken()
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api'
      
      // Fetch overview
      const overviewRes = await fetch(`${apiUrl}/admin/analytics/overview?days=${periodDays}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (!overviewRes.ok) {
        console.error('Analytics overview response not ok:', overviewRes.status, overviewRes.statusText)
        const text = await overviewRes.text()
        console.error('Response body:', text)
        throw new Error(`Failed to fetch analytics overview: ${overviewRes.status}`)
      }
      
      const overviewData = await overviewRes.json()
      setOverview(overviewData)

      // Fetch trends
      const trendsRes = await fetch(`${apiUrl}/admin/analytics/trends?days=${periodDays}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (!trendsRes.ok) {
        console.error('Analytics trends response not ok:', trendsRes.status, trendsRes.statusText)
        const text = await trendsRes.text()
        console.error('Response body:', text)
        throw new Error(`Failed to fetch analytics trends: ${trendsRes.status}`)
      }
      
      const trendsData = await trendsRes.json()
      setTrends(trendsData)
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [periodDays])

  useEffect(() => {
    fetchAnalytics()
  }, [periodDays, fetchAnalytics])

  const refresh = () => {
    setRefreshing(true)
    fetchAnalytics()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  const chartData = trends?.views?.map((v, index) => ({
    date: format(new Date(v.date), 'MMM dd'),
    views: v.count,
    searches: trends.searches?.[index]?.count || 0,
    chats: trends.chats?.[index]?.count || 0,
  })) || []

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">Track usage and performance metrics</p>
        </div>
        <div className="flex gap-2">
          <Select value={periodDays} onValueChange={setPeriodDays}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Time period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="14">Last 14 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={refresh} disabled={refreshing} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview?.article_metrics.total_views || 0}</div>
            <p className="text-xs text-muted-foreground">
              {overview?.article_metrics.unique_articles_viewed || 0} unique articles
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Search Activity</CardTitle>
            <Search className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview?.search_metrics.total_searches || 0}</div>
            <p className="text-xs text-muted-foreground">
              {overview?.search_metrics.unique_queries || 0} unique queries
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Chat Sessions</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview?.chat_metrics.total_chats || 0}</div>
            <p className="text-xs text-muted-foreground">
              {overview?.chat_metrics.unique_sessions || 0} unique sessions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Page Visits</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview?.page_visits || 0}</div>
            <p className="text-xs text-muted-foreground">
              Last {periodDays} days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different views */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="content">Content Performance</TabsTrigger>
          <TabsTrigger value="search">Search Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Popular Articles */}
            <Card>
              <CardHeader>
                <CardTitle>Most Viewed Articles</CardTitle>
                <CardDescription>Top performing content</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {overview?.popular_articles.slice(0, 5).map((article) => (
                    <div key={article.id} className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{article.title}</p>
                        <p className="text-xs text-muted-foreground">{article.slug}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{article.view_count} views</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Top Search Queries */}
            <Card>
              <CardHeader>
                <CardTitle>Top Search Queries</CardTitle>
                <CardDescription>What users are searching for</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {overview?.top_search_queries.slice(0, 5).map((query, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{query.query}</p>
                        <p className="text-xs text-muted-foreground">
                          Avg {Math.round(query.avg_results)} results
                        </p>
                      </div>
                      <Badge variant="outline">{query.count} searches</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Activity Trends</CardTitle>
              <CardDescription>Usage patterns over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="views"
                      stroke="#8884d8"
                      name="Article Views"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="searches"
                      stroke="#82ca9d"
                      name="Searches"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="chats"
                      stroke="#ffc658"
                      name="Chat Sessions"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="content" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Content Performance</CardTitle>
              <CardDescription>Article engagement metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {overview?.popular_articles.map((article) => (
                  <div key={article.id} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h4 className="font-medium">{article.title}</h4>
                        <p className="text-sm text-muted-foreground mt-1">{article.slug}</p>
                      </div>
                      <Badge>{article.view_count} views</Badge>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full"
                        style={{
                          width: `${(article.view_count / (overview.popular_articles[0]?.view_count || 1)) * 100}%`
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="search" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Search Analytics</CardTitle>
              <CardDescription>Search behavior and effectiveness</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm font-medium mb-1">Search Success Rate</p>
                    <p className="text-2xl font-bold">
                      {overview?.top_search_queries.filter(q => q.avg_results > 0).length || 0} / {overview?.top_search_queries.length || 0}
                    </p>
                    <p className="text-xs text-muted-foreground">Queries with results</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm font-medium mb-1">Avg Results per Search</p>
                    <p className="text-2xl font-bold">
                      {Math.round(
                        (overview?.top_search_queries.reduce((sum, q) => sum + q.avg_results, 0) || 0) /
                        (overview?.top_search_queries.length || 1)
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">Results returned</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3">Search Query Details</h4>
                  <div className="space-y-2">
                    {overview?.top_search_queries.map((query, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium">{query.query}</p>
                          <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                            <span>{query.count} searches</span>
                            <span>•</span>
                            <span>{Math.round(query.avg_results)} avg results</span>
                          </div>
                        </div>
                        {query.avg_results === 0 && (
                          <Badge variant="destructive">No results</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}