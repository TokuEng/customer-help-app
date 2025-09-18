'use client';

import { useState, useEffect } from 'react';
import { 
  RefreshCw, Play, Pause, AlertCircle, CheckCircle, 
  Clock,   Download, Database, Search,
  FileText, Zap, Activity, Cloud
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface IngestionConfig {
  mode: 'normal' | 'force' | 'clean';
  parallelProcessing: boolean;
  batchSize: number;
  preserveAnalytics: boolean;
  syncImages: boolean;
}

interface IngestionStatus {
  state: 'idle' | 'running' | 'completed' | 'failed';
  progress: number;
  currentItem: string;
  totalItems: number;
  processedItems: number;
  startTime?: string;
  endTime?: string;
  errors: string[];
}

interface IngestionHistory {
  id: string;
  startTime: string;
  endTime: string;
  status: 'success' | 'failed' | 'partial';
  articlesProcessed: number;
  mode: string;
  errors: number;
}

export default function IngestionManagement() {
  const [config, setConfig] = useState<IngestionConfig>({
    mode: 'normal',
    parallelProcessing: true,
    batchSize: 10,
    preserveAnalytics: true,
    syncImages: true
  });

  const [status, setStatus] = useState<IngestionStatus>({
    state: 'idle',
    progress: 0,
    currentItem: '',
    totalItems: 0,
    processedItems: 0,
    errors: []
  });

  const [history, setHistory] = useState<IngestionHistory[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    fetchIngestionStatus();
    fetchIngestionHistory();
    connectToWebSocket();

    const interval = setInterval(() => {
      if (status.state === 'running') {
        fetchIngestionStatus();
      }
    }, 2000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status.state]);

  const fetchIngestionStatus = async () => {
    try {
      const response = await fetch('/api/admin/ingestion/status');
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      console.error('Failed to fetch ingestion status:', error);
    }
  };

  const fetchIngestionHistory = async () => {
    try {
      const response = await fetch('/api/admin/ingestion/history');
      const data = await response.json();
      setHistory(data);
    } catch (error) {
      console.error('Failed to fetch ingestion history:', error);
    }
  };

  const connectToWebSocket = () => {
    // Connect to WebSocket for real-time updates
    try {
      const ws = new WebSocket(`${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/api/admin/ingestion/ws`);
      
      ws.onopen = () => {
        setIsConnected(true);
      };
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'status') {
          setStatus(data.status);
        } else if (data.type === 'log') {
          setLogs(prev => [...prev, data.message]);
        }
      };
      
      ws.onclose = () => {
        setIsConnected(false);
        // Reconnect after 5 seconds
        setTimeout(connectToWebSocket, 5000);
      };
    } catch (error) {
      console.error('WebSocket connection failed:', error);
    }
  };

  const startIngestion = async () => {
    setShowConfirmDialog(false);
    
    try {
      const response = await fetch('/api/admin/ingestion/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      
      if (response.ok) {
        await response.json(); // Consume the response
        setStatus({ ...status, state: 'running' });
        setLogs([`Ingestion started with mode: ${config.mode}`]);
      } else {
        alert('Failed to start ingestion');
      }
    } catch (error) {
      console.error('Failed to start ingestion:', error);
      alert('Failed to start ingestion');
    }
  };

  const stopIngestion = async () => {
    try {
      const response = await fetch('/api/admin/ingestion/stop', {
        method: 'POST'
      });
      
      if (response.ok) {
        setStatus({ ...status, state: 'idle' });
        setLogs(prev => [...prev, 'Ingestion stopped by user']);
      }
    } catch (error) {
      console.error('Failed to stop ingestion:', error);
    }
  };

  const downloadLogs = () => {
    const blob = new Blob([logs.join('\n')], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ingestion-logs-${new Date().toISOString()}.txt`;
    a.click();
  };

  const getStatusColor = (state: string) => {
    switch (state) {
      case 'running': return 'text-blue-600';
      case 'completed': return 'text-green-600';
      case 'failed': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (state: string) => {
    switch (state) {
      case 'running': return <RefreshCw className="h-5 w-5 animate-spin" />;
      case 'completed': return <CheckCircle className="h-5 w-5" />;
      case 'failed': return <AlertCircle className="h-5 w-5" />;
      default: return <Clock className="h-5 w-5" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Ingestion Management</h1>
          <p className="text-gray-500 mt-2">Sync content from Notion, manage ingestion process</p>
        </div>

        {/* Connection Status */}
        <Alert className={`mb-6 ${isConnected ? 'border-green-200' : 'border-yellow-200'}`}>
          <Activity className="h-4 w-4" />
          <AlertTitle>Connection Status</AlertTitle>
          <AlertDescription>
            {isConnected ? 'Real-time updates active' : 'Reconnecting to real-time updates...'}
          </AlertDescription>
        </Alert>

        {/* Current Status Card */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center">
                {getStatusIcon(status.state)}
                <span className={`ml-2 ${getStatusColor(status.state)}`}>
                  {status.state === 'idle' ? 'Ready' : 
                   status.state === 'running' ? 'Processing' :
                   status.state === 'completed' ? 'Completed' : 'Failed'}
                </span>
              </span>
              <div className="flex gap-2">
                {status.state === 'running' ? (
                  <Button onClick={stopIngestion} variant="destructive" size="sm">
                    <Pause className="mr-2 h-4 w-4" />
                    Stop
                  </Button>
                ) : (
                  <Button 
                    onClick={() => setShowConfirmDialog(true)} 
                    disabled={false}
                    size="sm"
                  >
                    <Play className="mr-2 h-4 w-4" />
                    Start Ingestion
                  </Button>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {status.state === 'running' && (
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Progress</span>
                    <span>{status.processedItems} / {status.totalItems} articles</span>
                  </div>
                  <Progress value={status.progress} className="h-3" />
                </div>
                
                {status.currentItem && (
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Processing:</span> {status.currentItem}
                  </div>
                )}
                
                {status.startTime && (
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Started:</span> {new Date(status.startTime).toLocaleString()}
                  </div>
                )}
              </div>
            )}

            {status.state === 'completed' && (
              <div className="space-y-2">
                <p className="text-sm text-green-600">✅ Ingestion completed successfully</p>
                <p className="text-sm text-gray-600">
                  Processed {status.processedItems} articles in{' '}
                  {status.startTime && status.endTime 
                    ? Math.round((new Date(status.endTime).getTime() - new Date(status.startTime).getTime()) / 1000 / 60)
                    : 0} minutes
                </p>
              </div>
            )}

            {status.errors.length > 0 && (
              <Alert className="mt-4 border-red-200">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Errors Detected</AlertTitle>
                <AlertDescription>
                  {status.errors.length} error(s) occurred during ingestion. Check logs for details.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Configuration and Monitoring Tabs */}
        <Tabs defaultValue="config" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="config">Configuration</TabsTrigger>
            <TabsTrigger value="stats">Statistics</TabsTrigger>
            <TabsTrigger value="logs">Live Logs</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="services">Services</TabsTrigger>
          </TabsList>

          <TabsContent value="config">
            <Card>
              <CardHeader>
                <CardTitle>Ingestion Configuration</CardTitle>
                <CardDescription>Configure how content is synced from Notion</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  {/* Ingestion Mode */}
                  <div className="space-y-2">
                    <Label>Ingestion Mode</Label>
                    <Select
                      value={config.mode}
                      onValueChange={(value) => setConfig({ ...config, mode: value as 'normal' | 'force' | 'clean' })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">
                          <div className="flex flex-col">
                            <span>Normal</span>
                            <span className="text-xs text-gray-500">Only sync changed articles</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="force">
                          <div className="flex flex-col">
                            <span>Force Sync</span>
                            <span className="text-xs text-gray-500">Re-sync all articles</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="clean">
                          <div className="flex flex-col">
                            <span>Clean & Sync</span>
                            <span className="text-xs text-gray-500">Delete all content and re-sync</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Batch Size */}
                  <div className="space-y-2">
                    <Label>Batch Size</Label>
                    <Select
                      value={config.batchSize.toString()}
                      onValueChange={(value) => setConfig({ ...config, batchSize: parseInt(value) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5 articles</SelectItem>
                        <SelectItem value="10">10 articles</SelectItem>
                        <SelectItem value="20">20 articles</SelectItem>
                        <SelectItem value="50">50 articles</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Parallel Processing */}
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="parallel"
                      checked={config.parallelProcessing}
                      onCheckedChange={(checked) => setConfig({ ...config, parallelProcessing: checked })}
                    />
                    <Label htmlFor="parallel" className="cursor-pointer">
                      <span className="font-medium">Parallel Processing</span>
                      <span className="block text-xs text-gray-500">Process multiple articles simultaneously</span>
                    </Label>
                  </div>

                  {/* Preserve Analytics */}
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="analytics"
                      checked={config.preserveAnalytics}
                      onCheckedChange={(checked) => setConfig({ ...config, preserveAnalytics: checked })}
                    />
                    <Label htmlFor="analytics" className="cursor-pointer">
                      <span className="font-medium">Preserve Analytics</span>
                      <span className="block text-xs text-gray-500">Keep usage statistics when cleaning</span>
                    </Label>
                  </div>

                  {/* Sync Images */}
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="images"
                      checked={config.syncImages}
                      onCheckedChange={(checked) => setConfig({ ...config, syncImages: checked })}
                    />
                    <Label htmlFor="images" className="cursor-pointer">
                      <span className="font-medium">Sync Images</span>
                      <span className="block text-xs text-gray-500">Upload images to DigitalOcean Spaces</span>
                    </Label>
                  </div>
                </div>

                {/* Warning for Clean Mode */}
                {config.mode === 'clean' && (
                  <Alert className="border-yellow-200 bg-yellow-50">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    <AlertTitle>Clean Mode Warning</AlertTitle>
                    <AlertDescription>
                      This will delete all existing articles and re-import everything from Notion.
                      {config.preserveAnalytics ? ' Analytics data will be preserved.' : ' All data will be deleted.'}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stats">
            <Card>
              <CardHeader>
                <CardTitle>Ingestion Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label className="text-gray-500">Total Articles</Label>
                    <p className="text-2xl font-bold">100</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-500">Last Sync</Label>
                    <p className="text-lg">2 hours ago</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-500">Sync Frequency</Label>
                    <p className="text-lg">Every 6 hours</p>
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  <div>
                    <Label>Categories Distribution</Label>
                    <div className="mt-2 space-y-2">
                      {['Benefits', 'Library', 'Token Payroll', 'Policy'].map(category => (
                        <div key={category} className="flex items-center justify-between py-2">
                          <span className="text-sm">{category}</span>
                          <Badge variant="secondary">23</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logs">
            <Card>
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  Live Logs
                  <Button variant="outline" size="sm" onClick={downloadLogs}>
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px] w-full rounded-md border p-4">
                  {logs.length === 0 ? (
                    <p className="text-gray-500 text-center">No logs yet. Start an ingestion to see logs.</p>
                  ) : (
                    <div className="space-y-1">
                      {logs.map((log, index) => (
                        <div key={index} className="font-mono text-xs">
                          <span className="text-gray-500">{new Date().toLocaleTimeString()}</span>
                          <span className="ml-2">{log}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Ingestion History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {history.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No ingestion history available</p>
                  ) : (
                    history.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          {item.status === 'success' ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : item.status === 'failed' ? (
                            <AlertCircle className="h-5 w-5 text-red-500" />
                          ) : (
                            <AlertCircle className="h-5 w-5 text-yellow-500" />
                          )}
                          <div>
                            <p className="font-medium">{new Date(item.startTime).toLocaleString()}</p>
                            <p className="text-sm text-gray-500">
                              {item.articlesProcessed} articles • {item.mode} mode
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          {item.errors > 0 && (
                            <Badge variant="destructive" className="mb-1">
                              {item.errors} errors
                            </Badge>
                          )}
                          <p className="text-xs text-gray-500">
                            Duration: {Math.round((new Date(item.endTime).getTime() - new Date(item.startTime).getTime()) / 1000 / 60)} min
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="services">
            <Card>
              <CardHeader>
                <CardTitle>Service Status</CardTitle>
                <CardDescription>Monitor connected services and APIs</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Database Status */}
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Database className="h-6 w-6 text-gray-600" />
                      <div>
                        <p className="font-medium">PostgreSQL Database</p>
                        <p className="text-sm text-gray-500">DigitalOcean Managed Database</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span className="text-green-600 font-medium">Connected</span>
                    </div>
                  </div>

                  {/* Meilisearch Status */}
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Search className="h-6 w-6 text-gray-600" />
                      <div>
                        <p className="font-medium">Meilisearch</p>
                        <p className="text-sm text-gray-500">147.182.245.91:7700</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span className="text-green-600 font-medium">Healthy</span>
                    </div>
                  </div>

                  {/* Spaces Status */}
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Cloud className="h-6 w-6 text-gray-600" />
                      <div>
                        <p className="font-medium">DigitalOcean Spaces</p>
                        <p className="text-sm text-gray-500">customer-help-app-notion-images</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span className="text-green-600 font-medium">Active</span>
                    </div>
                  </div>

                  {/* Notion API Status */}
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="h-6 w-6 text-gray-600" />
                      <div>
                        <p className="font-medium">Notion API</p>
                        <p className="text-sm text-gray-500">Content source</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span className="text-green-600 font-medium">Available</span>
                    </div>
                  </div>

                  {/* OpenAI API Status */}
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Zap className="h-6 w-6 text-gray-600" />
                      <div>
                        <p className="font-medium">OpenAI API</p>
                        <p className="text-sm text-gray-500">Embeddings & AI features</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span className="text-green-600 font-medium">Ready</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Confirmation Dialog */}
        <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Start Ingestion</DialogTitle>
              <DialogDescription>
                Please confirm the ingestion settings before starting.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 my-4">
              <div className="flex justify-between">
                <span className="font-medium">Mode:</span>
                <Badge variant="outline">{config.mode}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Parallel Processing:</span>
                <span>{config.parallelProcessing ? 'Enabled' : 'Disabled'}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Batch Size:</span>
                <span>{config.batchSize} articles</span>
              </div>
              {config.mode === 'clean' && (
                <Alert className="border-yellow-200">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    This will delete all existing content before re-syncing.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
                Cancel
              </Button>
              <Button onClick={startIngestion}>
                <Play className="mr-2 h-4 w-4" />
                Start Ingestion
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}