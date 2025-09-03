'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RefreshCw, Activity, CheckCircle, Clock, BarChart } from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getAuthToken } from '@/lib/auth-token'

interface IngestionLog {
  id: number
  started_at: string
  completed_at: string | null
  status: string
  trigger_type: string
  trigger_source: string | null
  pages_processed: number
  pages_skipped: number
  pages_updated: number
  pages_failed: number
  force_full_sync: boolean
  error_message: string | null
  duration_seconds: number | null
}

interface DashboardStats {
  total_articles: number
  last_sync_time: string | null
  ingestions_today: number
  ingestions_this_week: number
  success_rate_7d: number
  avg_duration_7d: number | null
  recent_logs: IngestionLog[]
}

export default function IngestionMonitor() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [logs, setLogs] = useState<IngestionLog[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedLog, setSelectedLog] = useState<IngestionLog | null>(null)
  const [triggeringSync, setTriggeringSync] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')

  const fetchDashboardStats = async () => {
    try {
      const token = getAuthToken()
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api'
      const response = await fetch(`${apiUrl}/admin/dashboard/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setStats(data)
        setLogs(data.recent_logs)
      }
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error)
    }
  }

  const fetchLogs = async (status?: string) => {
    try {
      const token = getAuthToken()
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api'
      const url = status 
        ? `${apiUrl}/admin/ingestion/logs?status=${status}`
        : `${apiUrl}/admin/ingestion/logs`
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setLogs(data)
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error)
    }
  }

  const triggerIngestion = async (forceFullSync = false) => {
    setTriggeringSync(true)
    try {
      const token = getAuthToken()
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api'
      const response = await fetch(`${apiUrl}/ingestion/trigger`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ force_full_sync: forceFullSync })
      })
      
      if (response.ok) {
        // Refresh stats after a short delay
        setTimeout(() => {
          fetchDashboardStats()
          fetchLogs()
        }, 2000)
      }
    } catch (error) {
      console.error('Failed to trigger ingestion:', error)
    } finally {
      setTriggeringSync(false)
    }
  }

  const refresh = async () => {
    setRefreshing(true)
    await fetchDashboardStats()
    await fetchLogs()
    setRefreshing(false)
  }

  useEffect(() => {
    setLoading(true)
    Promise.all([fetchDashboardStats(), fetchLogs()]).then(() => {
      setLoading(false)
    })
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchDashboardStats()
      fetchLogs()
    }, 30000)
    
    return () => clearInterval(interval)
  }, [])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500">Completed</Badge>
      case 'running':
        return <Badge className="bg-blue-500">Running</Badge>
      case 'failed':
        return <Badge className="bg-red-500">Failed</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const getTriggerBadge = (trigger: string) => {
    switch (trigger) {
      case 'scheduled':
        return <Badge variant="secondary">Scheduled</Badge>
      case 'manual':
        return <Badge variant="outline">Manual</Badge>
      case 'webhook':
        return <Badge variant="outline">Webhook</Badge>
      case 'api':
        return <Badge variant="outline">API</Badge>
      default:
        return <Badge variant="outline">{trigger}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Ingestion Monitor</h1>
          <p className="text-muted-foreground">Monitor and manage content synchronization</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={refresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={() => triggerIngestion(false)}
            disabled={triggeringSync}
          >
            <Activity className="h-4 w-4 mr-2" />
            Sync Now
          </Button>
          <Button
            variant="secondary"
            onClick={() => triggerIngestion(true)}
            disabled={triggeringSync}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Full Sync
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Articles</CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_articles || 0}</div>
            <p className="text-xs text-muted-foreground">
              Last sync: {stats?.last_sync_time ? formatDistanceToNow(new Date(stats.last_sync_time), { addSuffix: true }) : 'Never'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Syncs Today</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.ingestions_today || 0}</div>
            <p className="text-xs text-muted-foreground">
              This week: {stats?.ingestions_this_week || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate (7d)</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.success_rate_7d || 0}%</div>
            <Progress value={stats?.success_rate_7d || 0} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.avg_duration_7d ? `${Math.round(stats.avg_duration_7d)}s` : '-'}
            </div>
            <p className="text-xs text-muted-foreground">Last 7 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="all" onClick={() => fetchLogs()}>All Logs</TabsTrigger>
          <TabsTrigger value="running" onClick={() => fetchLogs('running')}>Running</TabsTrigger>
          <TabsTrigger value="failed" onClick={() => fetchLogs('failed')}>Failed</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Ingestion Logs</CardTitle>
              <CardDescription>
                Recent synchronization activities and their status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Started</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Trigger</TableHead>
                    <TableHead>Pages</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        {format(new Date(log.started_at), 'MMM dd, HH:mm')}
                      </TableCell>
                      <TableCell>{getStatusBadge(log.status)}</TableCell>
                      <TableCell>{getTriggerBadge(log.trigger_type)}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <span className="font-medium">{log.pages_updated}</span> updated
                          {log.pages_skipped > 0 && (
                            <span className="text-muted-foreground"> • {log.pages_skipped} skipped</span>
                          )}
                          {log.pages_failed > 0 && (
                            <span className="text-red-500"> • {log.pages_failed} failed</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {log.duration_seconds ? `${log.duration_seconds}s` : '-'}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedLog(log)}
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Details Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Ingestion Details</DialogTitle>
            <DialogDescription>
              Detailed information about this synchronization run
            </DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Started At</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(selectedLog.started_at), 'PPpp')}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Completed At</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedLog.completed_at 
                      ? format(new Date(selectedLog.completed_at), 'PPpp')
                      : 'In Progress'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Status</p>
                  <div className="mt-1">{getStatusBadge(selectedLog.status)}</div>
                </div>
                <div>
                  <p className="text-sm font-medium">Trigger</p>
                  <div className="mt-1">{getTriggerBadge(selectedLog.trigger_type)}</div>
                </div>
              </div>
              
              <div>
                <p className="text-sm font-medium mb-2">Statistics</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Pages Processed: {selectedLog.pages_processed}</div>
                  <div>Pages Updated: {selectedLog.pages_updated}</div>
                  <div>Pages Skipped: {selectedLog.pages_skipped}</div>
                  <div>Pages Failed: {selectedLog.pages_failed}</div>
                  <div>Duration: {selectedLog.duration_seconds ? `${selectedLog.duration_seconds}s` : '-'}</div>
                  <div>Full Sync: {selectedLog.force_full_sync ? 'Yes' : 'No'}</div>
                </div>
              </div>
              
              {selectedLog.error_message && (
                <div>
                  <p className="text-sm font-medium mb-2">Error Message</p>
                  <pre className="text-sm bg-red-50 p-3 rounded overflow-x-auto">
                    {selectedLog.error_message}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
