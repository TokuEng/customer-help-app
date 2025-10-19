'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Activity, Database, Search, RefreshCw, CheckCircle, AlertCircle, 
  XCircle, Clock, Server, Cloud, Users,
  ArrowRight, BarChart3, Zap
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface SystemStatus {
  database: 'healthy' | 'warning' | 'error';
  meilisearch: 'healthy' | 'warning' | 'error';
  spaces: 'healthy' | 'warning' | 'error';
  api: 'healthy' | 'warning' | 'error';
}

interface Stats {
  totalArticles: number;
  totalChunks: number;
  totalSearches: number;
  totalPageViews: number;
  categoryCounts: Record<string, number>;
  lastIngestion: string;
  ingestionStatus: 'idle' | 'running' | 'failed';
}

export default function AdminDashboard() {
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    database: 'healthy',
    meilisearch: 'healthy',
    spaces: 'healthy',
    api: 'healthy'
  });

  const [stats, setStats] = useState<Stats>({
    totalArticles: 0,
    totalChunks: 0,
    totalSearches: 0,
    totalPageViews: 0,
    categoryCounts: {},
    lastIngestion: '',
    ingestionStatus: 'idle'
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSystemStatus();
    fetchStats();
    // Poll for updates every 30 seconds
    const interval = setInterval(() => {
      fetchSystemStatus();
      fetchStats();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchSystemStatus = async () => {
    try {
      const response = await fetch('/api/admin/system-status');
      const data = await response.json();
      setSystemStatus(data);
    } catch (error) {
      console.error('Failed to fetch system status:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/stats');
      const data = await response.json();
      setStats(data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Activity className="h-12 w-12 text-gray-400 animate-pulse mx-auto mb-4" />
          <p className="text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-500 mt-2">Monitor system health, manage content, and track analytics</p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Link href="/admin/ingestion">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-primary">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center">
                  <RefreshCw className="mr-2 h-5 w-5 text-primary" />
                  Ingestion
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">Manage content sync</p>
                <ArrowRight className="h-4 w-4 mt-2 text-primary" />
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/analytics">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-primary">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center">
                  <BarChart3 className="mr-2 h-5 w-5 text-primary" />
                  Analytics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">View detailed metrics</p>
                <ArrowRight className="h-4 w-4 mt-2 text-primary" />
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/work-submissions">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-primary">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center">
                  <Users className="mr-2 h-5 w-5 text-primary" />
                  Work Submissions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">Manage user requests</p>
                <ArrowRight className="h-4 w-4 mt-2 text-primary" />
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* System Status */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="mr-2 h-5 w-5" />
              System Status
            </CardTitle>
            <CardDescription>Real-time health monitoring of all services</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                <div className="flex items-center">
                  <Database className="h-5 w-5 mr-2 text-gray-600" />
                  <span className="font-medium">Database</span>
                </div>
                {getStatusIcon(systemStatus.database)}
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                <div className="flex items-center">
                  <Search className="h-5 w-5 mr-2 text-gray-600" />
                  <span className="font-medium">Meilisearch</span>
                </div>
                {getStatusIcon(systemStatus.meilisearch)}
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                <div className="flex items-center">
                  <Cloud className="h-5 w-5 mr-2 text-gray-600" />
                  <span className="font-medium">Spaces</span>
                </div>
                {getStatusIcon(systemStatus.spaces)}
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                <div className="flex items-center">
                  <Server className="h-5 w-5 mr-2 text-gray-600" />
                  <span className="font-medium">API</span>
                </div>
                {getStatusIcon(systemStatus.api)}
              </div>
            </div>

            {/* Alert for any issues */}
            {(systemStatus.database === 'error' || systemStatus.meilisearch === 'error' || 
              systemStatus.spaces === 'error' || systemStatus.api === 'error') && (
              <Alert className="mt-4 border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Some services are experiencing issues. Check the system logs for details.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Statistics Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="usage">Usage</TabsTrigger>
            <TabsTrigger value="ingestion">Ingestion</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-500">
                    Total Articles
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalArticles}</div>
                  <p className="text-xs text-gray-500 mt-1">
                    Across all categories
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-500">
                    Search Queries
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalSearches}</div>
                  <p className="text-xs text-gray-500 mt-1">
                    Last 30 days
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-500">
                    Page Views
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalPageViews}</div>
                  <p className="text-xs text-gray-500 mt-1">
                    Last 30 days
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-500">
                    Chunks Indexed
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalChunks}</div>
                  <p className="text-xs text-gray-500 mt-1">
                    For semantic search
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="content" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Content Distribution</CardTitle>
                <CardDescription>Articles by category</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(stats.categoryCounts).map(([category, count]) => (
                    <div key={category}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">{category}</span>
                        <span className="text-sm text-gray-500">{count} articles</span>
                      </div>
                      <Progress 
                        value={(count / stats.totalArticles) * 100} 
                        className="h-2"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="usage" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Search Analytics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm">Total Searches</span>
                      <span className="font-medium">{stats.totalSearches}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Avg. Daily Searches</span>
                      <span className="font-medium">{Math.round(stats.totalSearches / 30)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Page Analytics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm">Total Views</span>
                      <span className="font-medium">{stats.totalPageViews}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Avg. Daily Views</span>
                      <span className="font-medium">{Math.round(stats.totalPageViews / 30)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="ingestion" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Ingestion Status</CardTitle>
                <CardDescription>Last sync information and status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Status</span>
                    {stats.ingestionStatus === 'running' ? (
                      <Badge className="bg-blue-100 text-blue-800">
                        <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
                        Running
                      </Badge>
                    ) : stats.ingestionStatus === 'failed' ? (
                      <Badge variant="destructive">Failed</Badge>
                    ) : (
                      <Badge variant="secondary">Idle</Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Last Ingestion</span>
                    <span className="text-sm text-gray-600">
                      {stats.lastIngestion || 'Never'}
                    </span>
                  </div>

                  <div className="pt-4 flex gap-2">
                    <Link href="/admin/ingestion" className="flex-1">
                      <Button size="sm" className="w-full">
                        <Zap className="mr-2 h-4 w-4" />
                        Manage Ingestion
                      </Button>
                    </Link>
                    <Link href="/admin/ingestion/logs" className="flex-1">
                      <Button size="sm" variant="outline" className="w-full">
                        View Logs
                      </Button>
                    </Link>
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
