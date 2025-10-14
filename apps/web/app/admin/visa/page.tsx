'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/Badge';
import { AlertCircle, CheckCircle2, Loader2, Plus, X } from 'lucide-react';
import Link from 'next/link';

interface VisaArticle {
  title: string;
  content_md: string;
  category: string;
  tags: string[];
  metadata: Record<string, any>;
}

export default function VisaManagementPage() {
  const [adminKey, setAdminKey] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  
  // Form state
  const [article, setArticle] = useState<VisaArticle>({
    title: '',
    content_md: '',
    category: 'General',
    tags: [],
    metadata: {}
  });
  const [newTag, setNewTag] = useState('');

  // Categories for visa articles
  const categories = [
    'General',
    'Work Visa',
    'Student Visa',
    'Tourist Visa',
    'Business Visa',
    'Immigration',
    'Documentation',
    'Requirements',
    'Process',
    'FAQ'
  ];

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminKey })
      });
      
      if (response.ok) {
        setIsAuthenticated(true);
        setStatusMessage('');
      } else {
        setStatusMessage('Invalid admin key');
      }
    } catch (error) {
      setStatusMessage('Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddTag = () => {
    if (newTag.trim() && !article.tags.includes(newTag.trim())) {
      setArticle({ ...article, tags: [...article.tags, newTag.trim()] });
      setNewTag('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setArticle({ ...article, tags: article.tags.filter(t => t !== tag) });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadStatus('loading');
    setStatusMessage('');

    try {
      const response = await fetch('/api/admin/visa/upload', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminKey}`
        },
        body: JSON.stringify(article)
      });

      const result = await response.json();

      if (response.ok) {
        setUploadStatus('success');
        setStatusMessage('Article uploaded successfully!');
        // Reset form
        setArticle({
          title: '',
          content_md: '',
          category: 'General',
          tags: [],
          metadata: {}
        });
      } else {
        setUploadStatus('error');
        setStatusMessage(result.detail || 'Upload failed');
      }
    } catch (error) {
      setUploadStatus('error');
      setStatusMessage('Network error. Please try again.');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>Admin Authentication</CardTitle>
            <CardDescription>Enter admin key to access visa management</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAuth} className="space-y-4">
              <div>
                <Label htmlFor="adminKey">Admin Key</Label>
                <Input
                  id="adminKey"
                  type="password"
                  value={adminKey}
                  onChange={(e) => setAdminKey(e.target.value)}
                  placeholder="Enter admin key"
                  required
                />
              </div>
              
              {statusMessage && (
                <div className="flex items-center gap-2 text-red-600">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">{statusMessage}</span>
                </div>
              )}
              
              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  'Login'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Visa Article Management</h1>
          <p className="text-gray-600">Upload and manage visa-related articles</p>
        </div>
        <Link href="/admin">
          <Button variant="outline">Back to Admin</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload New Visa Article</CardTitle>
          <CardDescription>
            Create a new article for the visa information collection
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="title">Article Title *</Label>
              <Input
                id="title"
                value={article.title}
                onChange={(e) => setArticle({ ...article, title: e.target.value })}
                placeholder="e.g., US Work Visa Requirements"
                required
              />
            </div>

            <div>
              <Label htmlFor="category">Category *</Label>
              <Select 
                value={article.category} 
                onValueChange={(value) => setArticle({ ...article, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="content">Content (Markdown) *</Label>
              <Textarea
                id="content"
                value={article.content_md}
                onChange={(e) => setArticle({ ...article, content_md: e.target.value })}
                placeholder="Write your article content in Markdown format..."
                className="min-h-[400px] font-mono text-sm"
                required
              />
              <p className="text-sm text-gray-500 mt-1">
                Supports full Markdown syntax including headers, lists, links, and more
              </p>
            </div>

            <div>
              <Label>Tags</Label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Add a tag"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                />
                <Button type="button" onClick={handleAddTag} size="icon" variant="outline">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {article.tags.map(tag => (
                  <Badge key={tag} className="px-2 py-1 bg-gray-100">
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-2 hover:text-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            {uploadStatus !== 'idle' && (
              <div className={cn(
                "flex items-center gap-2 p-3 rounded-lg",
                uploadStatus === 'loading' && "bg-blue-50 text-blue-700",
                uploadStatus === 'success' && "bg-green-50 text-green-700",
                uploadStatus === 'error' && "bg-red-50 text-red-700"
              )}>
                {uploadStatus === 'loading' && <Loader2 className="h-4 w-4 animate-spin" />}
                {uploadStatus === 'success' && <CheckCircle2 className="h-4 w-4" />}
                {uploadStatus === 'error' && <AlertCircle className="h-4 w-4" />}
                <span className="text-sm font-medium">{statusMessage}</span>
              </div>
            )}

            <Button 
              type="submit" 
              disabled={uploadStatus === 'loading'}
              className="w-full"
            >
              {uploadStatus === 'loading' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading Article...
                </>
              ) : (
                'Upload Article'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Markdown Preview</CardTitle>
          <CardDescription>Preview how your article will look</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm max-w-none">
            {article.content_md ? (
              <div dangerouslySetInnerHTML={{ 
                __html: article.content_md
                  .replace(/^# (.+)$/gm, '<h1>$1</h1>')
                  .replace(/^## (.+)$/gm, '<h2>$1</h2>')
                  .replace(/^### (.+)$/gm, '<h3>$1</h3>')
                  .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                  .replace(/\*(.+?)\*/g, '<em>$1</em>')
                  .replace(/\n/g, '<br />')
              }} />
            ) : (
              <p className="text-gray-500">Start writing to see preview...</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Helper function
function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ');
}
