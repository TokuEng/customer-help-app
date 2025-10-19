'use client';

import { useState, FormEvent } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function VisaIngestionPage() {
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    country_code: '',
    visa_type: '',
    category: ''
  });
  
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'loading' | null; message: string }>({
    type: null,
    message: ''
  });
  
  const handleTextSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus({ type: 'loading', message: 'Processing document...' });
    
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
      const response = await fetch(`${backendUrl}/api/admin/visa/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) {
        throw new Error('Failed to ingest document');
      }
      
      const result = await response.json();
      
      setStatus({ 
        type: 'success', 
        message: `✅ Successfully indexed: ${formData.title} (ID: ${result.article_id})`
      });
      
      // Reset form
      setFormData({ title: '', content: '', country_code: '', visa_type: '', category: '' });
      
    } catch (error) {
      setStatus({ 
        type: 'error', 
        message: `❌ Error: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  };
  
  const handleFileSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      setStatus({ type: 'error', message: 'Please select a file' });
      return;
    }
    
    setStatus({ type: 'loading', message: 'Processing file...' });
    
    try {
      const fileFormData = new FormData();
      fileFormData.append('file', file);
      if (formData.title) fileFormData.append('title', formData.title);
      if (formData.country_code) fileFormData.append('country_code', formData.country_code);
      if (formData.visa_type) fileFormData.append('visa_type', formData.visa_type);
      if (formData.category) fileFormData.append('category', formData.category);
      
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
      const response = await fetch(`${backendUrl}/api/admin/visa/ingest-file`, {
        method: 'POST',
        body: fileFormData
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload file');
      }
      
      const result = await response.json();
      
      setStatus({ 
        type: 'success', 
        message: `✅ Successfully indexed from file: ${result.filename}`
      });
      
      setFile(null);
      setFormData({ title: '', content: '', country_code: '', visa_type: '', category: '' });
      
    } catch (error) {
      setStatus({ 
        type: 'error', 
        message: `❌ Error: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Visa Document Ingestion</h1>
            <p className="text-gray-600">
              Add visa articles to the knowledge base for AI chatbot training
            </p>
          </div>
          
          {/* Status Message */}
          {status.type && (
            <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
              status.type === 'success' ? 'bg-green-50 text-green-800' :
              status.type === 'error' ? 'bg-red-50 text-red-800' :
              'bg-blue-50 text-blue-800'
            }`}>
              {status.type === 'success' && <CheckCircle className="w-5 h-5" />}
              {status.type === 'error' && <AlertCircle className="w-5 h-5" />}
              <span>{status.message}</span>
            </div>
          )}
          
          {/* Metadata Section */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-4">Document Metadata</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="country_code">Country Code</Label>
                <Input
                  id="country_code"
                  type="text"
                  value={formData.country_code}
                  onChange={(e) => setFormData({...formData, country_code: e.target.value.toUpperCase()})}
                  placeholder="US, CA, UK, DE, SG, AE"
                  maxLength={2}
                />
              </div>
              
              <div>
                <Label htmlFor="visa_type">Visa Type</Label>
                <Input
                  id="visa_type"
                  type="text"
                  value={formData.visa_type}
                  onChange={(e) => setFormData({...formData, visa_type: e.target.value})}
                  placeholder="H1B, F1, O1, BlueCard, EP"
                />
              </div>
              
              <div className="col-span-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({...formData, category: value})}
                >
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select category..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="eligibility">Eligibility Requirements</SelectItem>
                    <SelectItem value="timeline">Processing Timeline</SelectItem>
                    <SelectItem value="fees">Costs & Fees</SelectItem>
                    <SelectItem value="process">Application Process</SelectItem>
                    <SelectItem value="requirements">Document Requirements</SelectItem>
                    <SelectItem value="overview">General Overview</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          {/* Tab Selection */}
          <div className="border-b border-gray-200 mb-6">
            <div className="flex gap-4">
              <button
                type="button"
                className="px-4 py-2 border-b-2 border-blue-500 text-blue-600 font-medium"
              >
                <FileText className="w-4 h-4 inline mr-2" />
                Text Input
              </button>
              <button
                type="button"
                className="px-4 py-2 text-gray-600 hover:text-gray-900"
              >
                <Upload className="w-4 h-4 inline mr-2" />
                File Upload
              </button>
            </div>
          </div>
          
          {/* Text Input Form */}
          <form onSubmit={handleTextSubmit} className="space-y-6">
            <div>
              <Label htmlFor="title">Document Title *</Label>
              <Input
                id="title"
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                placeholder="E.g., H-1B Visa Requirements for 2025"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="content">Content (Markdown) *</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData({...formData, content: e.target.value})}
                rows={20}
                required
                placeholder="# Document Title&#10;&#10;## Section 1&#10;&#10;Your content here..."
                className="font-mono text-sm"
              />
              <p className="text-xs text-gray-500 mt-2">
                Supports Markdown formatting. Use headers (# ## ###) to structure content.
              </p>
            </div>
            
            <Button
              type="submit"
              disabled={status.type === 'loading'}
              className="w-full"
            >
              {status.type === 'loading' ? 'Processing...' : 'Index Document'}
            </Button>
          </form>
          
          {/* File Upload Section (Alternative) */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <h3 className="text-lg font-semibold mb-4">Or Upload a File</h3>
            <form onSubmit={handleFileSubmit} className="space-y-4">
              <div>
                <Label htmlFor="file">Choose File (PDF, DOCX, MD, TXT)</Label>
                <Input
                  id="file"
                  type="file"
                  accept=".pdf,.docx,.md,.txt"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
                {file && (
                  <p className="text-sm text-gray-600 mt-2">
                    Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </div>
              
              <Button
                type="submit"
                disabled={!file || status.type === 'loading'}
                className="w-full bg-purple-500 hover:bg-purple-600"
              >
                {status.type === 'loading' ? 'Uploading...' : 'Upload & Index File'}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
