'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { WorkSubmissionResponse } from '@/lib/api';
import { KanbanBoard } from '@/components/KanbanBoard';
import { LayoutGrid, List, RefreshCw } from 'lucide-react';


export default function WorkSubmissionsPage() {
  const [submissions, setSubmissions] = useState<WorkSubmissionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [filter, setFilter] = useState<{ status?: string; priority?: string }>({});

  useEffect(() => {
    loadSubmissions();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const loadSubmissions = async () => {
    setLoading(true);
    try {
      const data = await api.getWorkSubmissions({
        ...filter,
        limit: 100 // Increased for kanban view
      });
      setSubmissions(data);
    } catch (error) {
      console.error('Failed to load submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (submissionId: string, newStatus: string) => {
    setUpdating(true);
    try {
      const updatedSubmission = await api.updateWorkSubmission(submissionId, {
        status: newStatus
      });
      
      // Update the local state
      setSubmissions(prev => 
        prev.map(sub => 
          sub.id === submissionId 
            ? { ...sub, status: newStatus, updated_at: updatedSubmission.updated_at }
            : sub
        )
      );
    } catch (error) {
      console.error('Failed to update submission status:', error);
      // Optionally show a toast notification here
    } finally {
      setUpdating(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold">Work Submissions</h1>
          
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'kanban' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('kanban')}
              className="gap-2"
            >
              <LayoutGrid className="h-4 w-4" />
              Kanban
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="gap-2"
            >
              <List className="h-4 w-4" />
              List
            </Button>
          </div>
        </div>
        
        <div className="flex gap-4 mb-6">
          {viewMode === 'list' && (
            <>
              <select
                className="px-4 py-2 border rounded-md"
                value={filter.status || ''}
                onChange={(e) => setFilter({ ...filter, status: e.target.value || undefined })}
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="rejected">Rejected</option>
              </select>

              <select
                className="px-4 py-2 border rounded-md"
                value={filter.priority || ''}
                onChange={(e) => setFilter({ ...filter, priority: e.target.value || undefined })}
              >
                <option value="">All Priorities</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </>
          )}

          <Button
            variant="outline"
            onClick={loadSubmissions}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="flex items-center gap-2 text-gray-500">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600"></div>
            <span>Loading submissions...</span>
          </div>
        </div>
      ) : submissions.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            <div className="mb-4">
              <LayoutGrid className="h-12 w-12 mx-auto text-gray-300" />
            </div>
            <p>No work submissions found.</p>
          </CardContent>
        </Card>
      ) : viewMode === 'kanban' ? (
        <KanbanBoard
          submissions={submissions}
          onUpdateStatus={handleUpdateStatus}
          isUpdating={updating}
        />
      ) : (
        <div className="space-y-4">
          {submissions.map((submission) => (
            <Card key={submission.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <CardTitle className="text-xl">{submission.title}</CardTitle>
                    <div className="flex gap-2 flex-wrap">
                      <Badge className={getPriorityColor(submission.priority)}>
                        {submission.priority.toUpperCase()}
                      </Badge>
                      <Badge className={getStatusColor(submission.status)}>
                        {submission.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                      <Badge variant="outline">{submission.request_type}</Badge>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500 text-right">
                    <div>{formatDate(submission.created_at)}</div>
                    <div className="font-medium">{submission.submitter_name}</div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 mb-4">{submission.description}</p>
                
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-500">
                    <span className="font-medium">Email:</span> {submission.submitter_email}
                    {submission.department && (
                      <span className="ml-4">
                        <span className="font-medium">Dept:</span> {submission.department}
                      </span>
                    )}
                  </div>
                  
                  {submission.tags.length > 0 && (
                    <div className="flex gap-2">
                      {submission.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-xs px-2 py-1 bg-gray-100 rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                
                {submission.assigned_to && (
                  <div className="mt-2 text-sm">
                    <span className="font-medium">Assigned to:</span> {submission.assigned_to}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

