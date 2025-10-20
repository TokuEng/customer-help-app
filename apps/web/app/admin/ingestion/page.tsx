'use client';

import { useState, useEffect } from 'react';
import { 
  RefreshCw, Play, CheckCircle, 
  FileText, Database, Search, HelpCircle, Plane, 
  Plus, Trash2, Upload
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
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
import { getAuthToken } from '@/lib/auth-token';

interface IndexedArticle {
  id: string;
  title: string;
  slug: string;
  chunks_count: number;
  created_at: string;
  updated_at: string;
  // Additional fields for visa articles
  country_code?: string;
  visa_type?: string;
  category?: string;
}

interface IngestionStats {
  total_articles: number;
  total_chunks: number;
  last_updated: string;
  categories?: Record<string, number>;
}

export default function IngestionManagement() {
  const [collectionType, setCollectionType] = useState<'general' | 'visa'>('general');
  const [isIngesting, setIsIngesting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  
  // Article states
  const [generalArticles, setGeneralArticles] = useState<IndexedArticle[]>([]);
  const [visaArticles, setVisaArticles] = useState<IndexedArticle[]>([]);
  const [generalStats, setGeneralStats] = useState<IngestionStats | null>(null);
  const [visaStats, setVisaStats] = useState<IngestionStats | null>(null);
  
  // Manual ingestion states
  const [showManualDialog, setShowManualDialog] = useState(false);
  const [manualTitle, setManualTitle] = useState('');
  const [manualContent, setManualContent] = useState('');
  const [manualCountry, setManualCountry] = useState('');
  const [manualVisaType, setManualVisaType] = useState('');
  const [manualCategory, setManualCategory] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [inputType, setInputType] = useState<'text' | 'file'>('text');
  
  const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

  useEffect(() => {
    fetchArticles();
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionType]);

  const fetchArticles = async () => {
    try {
      const token = getAuthToken();
      if (collectionType === 'visa') {
        const response = await fetch(`${backendUrl}/admin/visa/articles`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          setVisaArticles(data);
        }
      } else {
        // Fetch general articles from regular ingestion endpoint
        const response = await fetch(`${backendUrl}/admin/ingestion/articles`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          setGeneralArticles(data);
        }
      }
    } catch {
      // Failed to fetch articles
    }
  };

  const fetchStats = async () => {
    try {
      const token = getAuthToken();
      if (collectionType === 'visa') {
        const response = await fetch(`${backendUrl}/admin/visa/stats`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          setVisaStats(data);
        }
      } else {
        const response = await fetch(`${backendUrl}/admin/ingestion/stats`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          setGeneralStats(data);
        }
      }
    } catch {
      // Failed to fetch stats
    }
  };

  const startGeneralIngestion = async () => {
    setIsIngesting(true);
    setLogs(['Starting general help center ingestion from Notion...']);
    setProgress(0);
    
    try {
      const token = getAuthToken();
      const response = await fetch(`${backendUrl}/ingestion/trigger`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          force_full_sync: false,
          page_ids: []
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setLogs(prev => [...prev, `✅ Ingestion ${data.status}: ${data.message}`]);
        
        // Poll for status
        const checkStatus = setInterval(async () => {
          const statusResponse = await fetch(`${backendUrl}/ingestion/status`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (statusResponse.ok) {
            const statusData = await statusResponse.json();
            if (statusData.is_running) {
              setProgress(Math.round((statusData.pages_processed / Math.max(1, statusData.total_pages)) * 100));
            } else {
              clearInterval(checkStatus);
              setIsIngesting(false);
              setProgress(100);
              await fetchArticles();
              await fetchStats();
            }
          }
        }, 2000);
      } else {
        setLogs(prev => [...prev, '❌ Ingestion failed']);
      }
    } catch {
      setLogs(prev => [...prev, '❌ Error occurred during ingestion']);
      setIsIngesting(false);
    }
  };

  const handleManualVisaIngestion = async () => {
    setIsSubmitting(true);
    setUploadProgress('Uploading content...');
    
    try {
      const token = getAuthToken();
      let response;
      
      if (inputType === 'file' && selectedFile) {
        // Handle file upload
        const formData = new FormData();
        formData.append('file', selectedFile);
        if (manualTitle) formData.append('title', manualTitle);
        if (manualCountry) formData.append('country_code', manualCountry);
        if (manualVisaType) formData.append('visa_type', manualVisaType);
        if (manualCategory) formData.append('category', manualCategory);
        
        response = await fetch(`${backendUrl}/admin/visa/ingest-file`, {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });
      } else {
        // Handle text input
        response = await fetch(`${backendUrl}/admin/visa/ingest`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            title: manualTitle,
            content: manualContent,
            country_code: manualCountry || undefined,
            visa_type: manualVisaType || undefined,
            category: manualCategory || undefined
          })
        });
      }
      
      if (response.ok) {
        setUploadProgress('Content uploaded! Generating embeddings...');
        await response.json();
        
        setUploadProgress('Indexing complete! You can now test in the chatbot.');
        const displayTitle = inputType === 'file' && selectedFile && !manualTitle 
          ? selectedFile.name 
          : manualTitle;
        setLogs(prev => [...prev, `✅ Visa article ingested: ${displayTitle}`]);
        
        // Wait a moment to show success message
        setTimeout(async () => {
          await fetchArticles();
          await fetchStats();
          setShowManualDialog(false);
          setIsSubmitting(false);
          setUploadProgress('');
          // Reset form
          setManualTitle('');
          setManualContent('');
          setManualCountry('');
          setManualVisaType('');
          setManualCategory('');
          setSelectedFile(null);
        }, 2000);
      } else {
        const errorText = await response.text();
        let errorMessage = 'Failed to ingest';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.detail || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        setLogs(prev => [...prev, `❌ Failed to ingest: ${errorMessage}`]);
        alert(`Error: ${errorMessage}`);
        setIsSubmitting(false);
        setUploadProgress('');
      }
    } catch {
      const errorMessage = 'Unknown error occurred';
      setLogs(prev => [...prev, `❌ Error: ${errorMessage}`]);
      alert(`Error: ${errorMessage}`);
      setIsSubmitting(false);
      setUploadProgress('');
    }
  };

  const deleteArticle = async (articleId: string) => {
    if (!confirm('Are you sure you want to delete this article?')) return;
    
    try {
      const token = getAuthToken();
      const endpoint = collectionType === 'visa' 
        ? `${backendUrl}/admin/visa/articles/${articleId}`
        : `${backendUrl}/admin/ingestion/articles/${articleId}`;
        
      const response = await fetch(endpoint, { 
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        setLogs(prev => [...prev, `✅ Article deleted`]);
        await fetchArticles();
        await fetchStats();
      }
    } catch {
      setLogs(prev => [...prev, '❌ Failed to delete article']);
    }
  };

  const currentArticles = collectionType === 'visa' ? visaArticles : generalArticles;
  const currentStats = collectionType === 'visa' ? visaStats : generalStats;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Ingestion Management</h1>
          <p className="text-gray-500 mt-2">Manage content ingestion for help center and visa support</p>
        </div>

        {/* Collection Type Selector */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Select Collection Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Button
                variant={collectionType === 'general' ? 'default' : 'outline'}
                onClick={() => setCollectionType('general')}
                className="flex items-center gap-2"
              >
                <HelpCircle className="h-4 w-4" />
                General Help Center
              </Button>
              <Button
                variant={collectionType === 'visa' ? 'default' : 'outline'}
                onClick={() => setCollectionType('visa')}
                className="flex items-center gap-2"
              >
                <Plane className="h-4 w-4" />
                Visa Support
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Current Status Card */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center">
                {isIngesting ? (
                  <>
                    <RefreshCw className="h-5 w-5 animate-spin mr-2" />
                    <span className="text-blue-600">Ingesting...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                    <span className="text-green-600">Ready</span>
                  </>
                )}
              </span>
              <div className="flex gap-2">
                {collectionType === 'general' ? (
                  <Button 
                    onClick={startGeneralIngestion} 
                    disabled={isIngesting}
                    size="sm"
                  >
                    <Play className="mr-2 h-4 w-4" />
                    Start Notion Sync
                  </Button>
                ) : (
                  <Button 
                    onClick={() => setShowManualDialog(true)}
                    size="sm"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Visa Content
                  </Button>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isIngesting && (
              <div className="space-y-4">
                <Progress value={progress} className="h-3" />
                <p className="text-sm text-gray-600">Processing content...</p>
              </div>
            )}
            
            {currentStats && (
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Total Articles</p>
                  <p className="text-2xl font-bold">{currentStats.total_articles}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Chunks</p>
                  <p className="text-2xl font-bold">{currentStats.total_chunks}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Last Updated</p>
                  <p className="text-lg">{currentStats.last_updated ? new Date(currentStats.last_updated).toLocaleString() : 'Never'}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="articles" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="articles">Indexed Articles</TabsTrigger>
            <TabsTrigger value="logs">Live Logs</TabsTrigger>
            <TabsTrigger value="stats">Statistics</TabsTrigger>
          </TabsList>

          <TabsContent value="articles">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{collectionType === 'visa' ? 'Visa Articles' : 'Help Center Articles'}</span>
                  <Badge variant="secondary">{currentArticles.length} articles</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-2">
                    {currentArticles.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">No articles indexed yet</p>
                    ) : (
                      currentArticles.map((article) => (
                        <div key={article.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                          <div className="flex-1">
                            <p className="font-medium">{article.title}</p>
                            <div className="flex items-center gap-4 mt-1">
                              <span className="text-sm text-gray-500">
                                {article.chunks_count} chunks
                              </span>
                              {article.country_code && (
                                <Badge variant="outline" className="text-xs">
                                  {article.country_code}
                                </Badge>
                              )}
                              {article.visa_type && (
                                <Badge variant="secondary" className="text-xs">
                                  {article.visa_type}
                                </Badge>
                              )}
                              <span className="text-xs text-gray-400">
                                Updated: {new Date(article.updated_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteArticle(article.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logs">
            <Card>
              <CardHeader>
                <CardTitle>Activity Logs</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px] w-full rounded-md border p-4">
                  {logs.length === 0 ? (
                    <p className="text-gray-500 text-center">No activity yet</p>
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

          <TabsContent value="stats">
            <Card>
              <CardHeader>
                <CardTitle>Collection Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                {currentStats && currentStats.categories && (
                  <div>
                    <Label>Categories Distribution</Label>
                    <div className="mt-2 space-y-2">
                      {Object.entries(currentStats.categories).map(([category, count]) => (
                        <div key={category} className="flex items-center justify-between py-2">
                          <span className="text-sm">{category}</span>
                          <Badge variant="secondary">{count}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="mt-6 grid grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <Database className="h-8 w-8 text-gray-600 mb-2" />
                    <p className="font-medium">PostgreSQL with pgvector</p>
                    <p className="text-sm text-gray-500">Vector embeddings storage</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <Search className="h-8 w-8 text-gray-600 mb-2" />
                    <p className="font-medium">Hybrid Search</p>
                    <p className="text-sm text-gray-500">Vector + BM25 search</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Manual Visa Ingestion Dialog */}
        <Dialog open={showManualDialog} onOpenChange={(open) => {
          setShowManualDialog(open);
          if (!open) {
            // Reset form when closing
            setManualTitle('');
            setManualContent('');
            setManualCountry('');
            setManualVisaType('');
            setManualCategory('');
            setIsSubmitting(false);
            setUploadProgress('');
            setSelectedFile(null);
            setInputType('text');
          }
        }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Visa Content</DialogTitle>
              <DialogDescription>
                Manually add visa-related content to the knowledge base
              </DialogDescription>
            </DialogHeader>
            
            {/* Progress Indicator - Show at the top when active */}
            {uploadProgress && (
              <Alert className="my-4 bg-blue-50 border-blue-200">
                <AlertDescription className="flex items-center gap-3">
                  {uploadProgress.includes('complete') ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <RefreshCw className="h-5 w-5 animate-spin text-blue-600" />
                  )}
                  <span className="text-sm font-medium">{uploadProgress}</span>
                </AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-4 my-4">
              {/* Input Type Selector */}
              <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
                <Button
                  variant={inputType === 'text' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setInputType('text')}
                  className="flex-1"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Text Input
                </Button>
                <Button
                  variant={inputType === 'file' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setInputType('file')}
                  className="flex-1"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  File Upload
                </Button>
              </div>
              
              {inputType === 'text' ? (
                <>
                  <div>
                    <Label>Title * <span className="text-xs text-gray-500">(min 3 characters)</span></Label>
                    <Input
                      value={manualTitle}
                      onChange={(e) => setManualTitle(e.target.value)}
                      placeholder="e.g., H-1B Visa Requirements"
                      className={manualTitle && manualTitle.length < 3 ? 'border-red-500' : ''}
                    />
                    {manualTitle && manualTitle.length < 3 && (
                      <p className="text-xs text-red-500 mt-1">Title must be at least 3 characters</p>
                    )}
                  </div>
                  
                  <div>
                    <Label>Content (Markdown) * <span className="text-xs text-gray-500">(min 10 characters)</span></Label>
                    <Textarea
                      value={manualContent}
                      onChange={(e) => setManualContent(e.target.value)}
                      placeholder="Enter visa information in markdown format..."
                      className={`min-h-[200px] ${manualContent && manualContent.length < 10 ? 'border-red-500' : ''}`}
                    />
                    {manualContent && manualContent.length < 10 && (
                      <p className="text-xs text-red-500 mt-1">Content must be at least 10 characters</p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <Label>Upload File * <span className="text-xs text-gray-500">(PDF, DOCX, MD, TXT)</span></Label>
                    <div className="mt-2">
                      <input
                        type="file"
                        accept=".pdf,.docx,.md,.txt"
                        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                        className="block w-full text-sm text-gray-500
                          file:mr-4 file:py-2 file:px-4
                          file:rounded-md file:border-0
                          file:text-sm file:font-semibold
                          file:bg-blue-50 file:text-blue-700
                          hover:file:bg-blue-100"
                      />
                      {selectedFile && (
                        <p className="mt-2 text-sm text-gray-600">
                          Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <Label>Title <span className="text-xs text-gray-500">(optional, will use filename if empty)</span></Label>
                    <Input
                      value={manualTitle}
                      onChange={(e) => setManualTitle(e.target.value)}
                      placeholder="e.g., H-1B Visa Requirements"
                    />
                  </div>
                </>
              )}
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Country Code <span className="text-xs text-gray-500">(2 letters max)</span></Label>
                  <Input
                    value={manualCountry}
                    onChange={(e) => setManualCountry(e.target.value.toUpperCase().slice(0, 2))}
                    placeholder="e.g., US, UK, DE"
                    maxLength={2}
                    className={manualCountry && manualCountry.length > 2 ? 'border-red-500' : ''}
                  />
                </div>
                
                <div>
                  <Label>Visa Type</Label>
                  <Input
                    value={manualVisaType}
                    onChange={(e) => setManualVisaType(e.target.value)}
                    placeholder="e.g., H1B, Blue Card"
                  />
                </div>
                
                <div>
                  <Label>Category</Label>
                  <Select value={manualCategory} onValueChange={setManualCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="work">Work Visa</SelectItem>
                      <SelectItem value="residence">Residence Permit</SelectItem>
                      <SelectItem value="citizenship">Citizenship</SelectItem>
                      <SelectItem value="requirements">Requirements</SelectItem>
                      <SelectItem value="process">Process Guide</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowManualDialog(false);
                  setIsSubmitting(false);
                  setUploadProgress('');
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleManualVisaIngestion}
                disabled={
                  isSubmitting || 
                  (inputType === 'text' && (!manualTitle || !manualContent || manualTitle.length < 3 || manualContent.length < 10)) ||
                  (inputType === 'file' && !selectedFile)
                }
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Add Content'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}