'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

import { api } from '@/lib/api';

interface WorkSubmissionFormData {
  request_type: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  submitter_name: string;
  submitter_email: string;
  submitter_role?: string;
  department?: string;
  tags: string[];
}

interface WorkSubmissionFormProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WorkSubmissionForm({ isOpen, onClose }: WorkSubmissionFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<WorkSubmissionFormData>({
    request_type: '',
    title: '',
    description: '',
    priority: 'medium',
    submitter_name: '',
    submitter_email: '',
    submitter_role: '',
    department: '',
    tags: []
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Clean up empty optional fields
      const submissionData = {
        ...formData,
        submitter_role: formData.submitter_role || undefined,
        department: formData.department || undefined,
        tags: formData.tags.filter(tag => tag.trim() !== '')
      };

      await api.submitWorkRequest(submissionData);
      setSubmitted(true);
      
      // Reset form after 3 seconds
      setTimeout(() => {
        setSubmitted(false);
        onClose();
        setFormData({
          request_type: '',
          title: '',
          description: '',
          priority: 'medium',
          submitter_name: '',
          submitter_email: '',
          submitter_role: '',
          department: '',
          tags: []
        });
      }, 3000);
    } catch (err) {
      setError('Failed to submit request. Please try again.');
      console.error('Work submission error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof WorkSubmissionFormData, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleTagInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const input = e.currentTarget;
      const tag = input.value.trim();
      
      if (tag && !formData.tags.includes(tag)) {
        setFormData(prev => ({ ...prev, tags: [...prev.tags, tag] }));
        input.value = '';
      }
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Submit Work Request</CardTitle>
              <CardDescription>
                Fill out the form below to submit a new work request
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              ✕
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          {submitted ? (
            <div className="text-center py-8 space-y-4">
              <div className="h-16 w-16 text-green-500 mx-auto text-6xl">✅</div>
              <h3 className="text-xl font-semibold">Request Submitted Successfully!</h3>
              <p className="text-muted-foreground">
                Your work request has been received and will be reviewed soon.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Request Type <span className="text-red-500">*</span>
                  </label>
                  <Input
                    required
                    placeholder="e.g., Feature Request, Bug Fix, Documentation"
                    value={formData.request_type}
                    onChange={(e) => handleInputChange('request_type', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <Input
                    required
                    placeholder="Brief title for your request"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    className="w-full min-h-[100px] px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2"
                    placeholder="Provide detailed description of your request"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Priority <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2"
                    value={formData.priority}
                    onChange={(e) => handleInputChange('priority', e.target.value)}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Your Name <span className="text-red-500">*</span>
                    </label>
                    <Input
                      required
                      placeholder="John Doe"
                      value={formData.submitter_name}
                      onChange={(e) => handleInputChange('submitter_name', e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <Input
                      required
                      type="email"
                      placeholder="john@example.com"
                      value={formData.submitter_email}
                      onChange={(e) => handleInputChange('submitter_email', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Role
                    </label>
                    <select
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2"
                      value={formData.submitter_role}
                      onChange={(e) => handleInputChange('submitter_role', e.target.value)}
                    >
                      <option value="">Select Role</option>
                      <option value="employee">Employee</option>
                      <option value="contractor">Contractor</option>
                      <option value="admin">Admin</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Department
                    </label>
                    <Input
                      placeholder="e.g., Engineering, HR, Sales"
                      value={formData.department}
                      onChange={(e) => handleInputChange('department', e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Tags
                  </label>
                  <Input
                    placeholder="Type and press Enter to add tags"
                    onKeyDown={handleTagInput}
                  />
                  {formData.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 rounded-full text-sm"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => removeTag(tag)}
                            className="text-gray-500 hover:text-gray-700"
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <span className="animate-spin inline-block">⏳</span> Submitting...
                    </>
                  ) : (
                    <>
                      📨 Submit Request
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

