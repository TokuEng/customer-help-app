'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Activity, FileText, Search, MessageSquare, BarChart } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { getAuthToken } from '@/lib/auth-token'

interface DashboardOverview {
  ingestion: {
    last_sync_time: string | null
    total_articles: number
    ingestions_today: number
    success_rate_7d: number
  }
  workSubmissions: {
    total: number
    pending: number
    in_progress: number
    completed_today: number
  }
  analytics: {
    total_views: number
    total_searches: number
    total_chats: number
    page_visits: number
  }
}

export default function AdminDashboard() {
  const [overview, setOverview] = useState<DashboardOverview | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const token = getAuthToken()
      
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api'
      
      // Fetch ingestion stats
      const ingestionRes = await fetch(`${apiUrl}/admin/dashboard/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (!ingestionRes.ok) {
        console.error('Failed to fetch ingestion stats:', ingestionRes.status)
        throw new Error('Failed to fetch ingestion stats')
      }
      
      const ingestionData = await ingestionRes.json()

      // Fetch work submissions summary
      const workRes = await fetch(`${apiUrl}/admin/work-submissions?limit=100`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (!workRes.ok) {
        console.error('Failed to fetch work submissions:', workRes.status)
        throw new Error('Failed to fetch work submissions')
      }
      
      const workData = await workRes.json()

      // Fetch analytics overview
      const analyticsRes = await fetch(`${apiUrl}/admin/analytics/overview?days=7`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (!analyticsRes.ok) {
        console.error('Failed to fetch analytics:', analyticsRes.status)
        throw new Error('Failed to fetch analytics')
      }
      
      const analyticsData = await analyticsRes.json()

      // Process work submissions data
      const today = new Date().toDateString()
      interface WorkItem {
        status: string;
        completed_at?: string;
      }
      
      const workStats = {
        total: workData.length,
        pending: workData.filter((w: WorkItem) => w.status === 'pending').length,
        in_progress: workData.filter((w: WorkItem) => w.status === 'in_progress').length,
        completed_today: workData.filter((w: WorkItem) => 
          w.status === 'completed' && 
          w.completed_at && new Date(w.completed_at).toDateString() === today
        ).length
      }

      setOverview({
        ingestion: {
          last_sync_time: ingestionData.last_sync_time,
          total_articles: ingestionData.total_articles,
          ingestions_today: ingestionData.ingestions_today,
          success_rate_7d: ingestionData.success_rate_7d
        },
        workSubmissions: workStats,
        analytics: {
          total_views: analyticsData.article_metrics.total_views,
          total_searches: analyticsData.search_metrics.total_searches,
          total_chats: analyticsData.chat_metrics.total_chats,
          page_visits: analyticsData.page_visits
        }
      })
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Dashboard Overview</h1>
        <p className="text-muted-foreground mt-2">
                        Welcome to your admin dashboard. Here&apos;s what&apos;s happening with your help center.
        </p>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        {/* Ingestion Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Content Sync</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview?.ingestion.total_articles || 0}</div>
            <p className="text-xs text-muted-foreground">
              {overview?.ingestion.last_sync_time 
                ? `Synced ${formatDistanceToNow(new Date(overview.ingestion.last_sync_time), { addSuffix: true })}`
                : 'Never synced'}
            </p>
            <div className="mt-2">
              <Link href="/admin/ingestion">
                <Button size="sm" variant="outline" className="w-full">
                  View Details
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Work Submissions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Work Requests</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview?.workSubmissions.pending || 0}</div>
            <p className="text-xs text-muted-foreground">
              Pending • {overview?.workSubmissions.in_progress || 0} in progress
            </p>
            <div className="mt-2">
              <Link href="/admin/work-submissions">
                <Button size="sm" variant="outline" className="w-full">
                  Manage Requests
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Page Views */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Article Views</CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview?.analytics.total_views || 0}</div>
            <p className="text-xs text-muted-foreground">
              Last 7 days
            </p>
            <div className="mt-2">
              <Link href="/admin/analytics">
                <Button size="sm" variant="outline" className="w-full">
                  View Analytics
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Search Activity */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Search Activity</CardTitle>
            <Search className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview?.analytics.total_searches || 0}</div>
            <p className="text-xs text-muted-foreground">
              Searches this week
            </p>
            <div className="mt-2">
              <Link href="/admin/analytics">
                <Button size="sm" variant="outline" className="w-full">
                  Search Insights
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Summary Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest updates across all systems</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Activity className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Content Sync</p>
                  <p className="text-xs text-muted-foreground">
                    {overview?.ingestion.ingestions_today || 0} syncs today • {overview?.ingestion.success_rate_7d || 0}% success rate
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="p-2 bg-green-100 rounded-lg">
                  <FileText className="h-4 w-4 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Work Submissions</p>
                  <p className="text-xs text-muted-foreground">
                    {overview?.workSubmissions.completed_today || 0} completed today
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <MessageSquare className="h-4 w-4 text-purple-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Chat Activity</p>
                  <p className="text-xs text-muted-foreground">
                    {overview?.analytics.total_chats || 0} chat sessions this week
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common administrative tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Link href="/admin/ingestion" className="block">
                <Button variant="outline" className="w-full justify-start">
                  <Activity className="h-4 w-4 mr-2" />
                  Trigger Content Sync
                </Button>
              </Link>
              
              <Link href="/admin/work-submissions" className="block">
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="h-4 w-4 mr-2" />
                  Review Work Submissions
                </Button>
              </Link>
              
              <Link href="/admin/analytics" className="block">
                <Button variant="outline" className="w-full justify-start">
                  <BarChart className="h-4 w-4 mr-2" />
                  View Analytics Report
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
