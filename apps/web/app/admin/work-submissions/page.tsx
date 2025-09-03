'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Search, Clock, CheckCircle, AlertCircle, FileText, Mail, User } from 'lucide-react'
import { format } from 'date-fns'
import { getAuthToken } from '@/lib/auth-token'

interface WorkSubmission {
  id: string
  request_type: string
  title: string
  description: string
  priority: string
  status: string
  submitter_name: string
  submitter_email: string
  submitter_role: string | null
  department: string | null
  tags: string[]
  attachments: Array<{
    name?: string;
    url?: string;
    type?: string;
  }>
  assigned_to: string | null
  created_at: string
  updated_at: string
  completed_at: string | null
}

export default function WorkSubmissionsAdmin() {
  const [submissions, setSubmissions] = useState<WorkSubmission[]>([])
  const [filteredSubmissions, setFilteredSubmissions] = useState<WorkSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSubmission, setSelectedSubmission] = useState<WorkSubmission | null>(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  const fetchSubmissions = async () => {
    try {
      const token = getAuthToken()
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api'
      const response = await fetch(`${apiUrl}/admin/work-submissions?limit=200`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setSubmissions(data)
      }
    } catch (error) {
      console.error('Failed to fetch work submissions:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterSubmissions = useCallback(() => {
    let filtered = [...submissions]

    if (statusFilter !== 'all') {
      filtered = filtered.filter(s => s.status === statusFilter)
    }

    if (priorityFilter !== 'all') {
      filtered = filtered.filter(s => s.priority === priorityFilter)
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(s => 
        s.title.toLowerCase().includes(query) ||
        s.description.toLowerCase().includes(query) ||
        s.submitter_name.toLowerCase().includes(query) ||
        s.submitter_email.toLowerCase().includes(query)
      )
    }

    setFilteredSubmissions(filtered)
  }, [submissions, statusFilter, priorityFilter, searchQuery])

  useEffect(() => {
    fetchSubmissions()
  }, [])

  useEffect(() => {
    filterSubmissions()
  }, [filterSubmissions])

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { color: string; icon: React.ComponentType<{ className?: string }> | null }> = {
      pending: { color: 'bg-yellow-500', icon: Clock },
      in_progress: { color: 'bg-blue-500', icon: AlertCircle },
      completed: { color: 'bg-green-500', icon: CheckCircle },
      cancelled: { color: 'bg-gray-500', icon: null }
    }
    
    const variant = variants[status] || { color: 'bg-gray-500', icon: null }
    
    return (
      <Badge className={`${variant.color} text-white`}>
        {variant.icon && <variant.icon className="h-3 w-3 mr-1" />}
        {status.replace('_', ' ')}
      </Badge>
    )
  }

  const getPriorityBadge = (priority: string) => {
    const colors: Record<string, string> = {
      low: 'bg-gray-100 text-gray-800',
      medium: 'bg-blue-100 text-blue-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800'
    }
    
    return (
      <Badge className={colors[priority] || 'bg-gray-100'}>
        {priority}
      </Badge>
    )
  }

  const stats = {
    total: submissions.length,
    pending: submissions.filter(s => s.status === 'pending').length,
    inProgress: submissions.filter(s => s.status === 'in_progress').length,
    completed: submissions.filter(s => s.status === 'completed').length,
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
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Work Submissions</h1>
        <p className="text-muted-foreground">Manage and track work requests from users</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <AlertCircle className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inProgress}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completed}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by title, description, or submitter..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Submissions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Work Requests</CardTitle>
          <CardDescription>
            {filteredSubmissions.length} {filteredSubmissions.length === 1 ? 'request' : 'requests'} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Submitter</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSubmissions.map((submission) => (
                <TableRow key={submission.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{submission.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {submission.description.substring(0, 50)}...
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>{submission.request_type}</TableCell>
                  <TableCell>{getStatusBadge(submission.status)}</TableCell>
                  <TableCell>{getPriorityBadge(submission.priority)}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <p>{submission.submitter_name}</p>
                      <p className="text-muted-foreground">{submission.department || 'N/A'}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {format(new Date(submission.created_at), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedSubmission(submission)}
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

      {/* Details Dialog */}
      <Dialog open={!!selectedSubmission} onOpenChange={() => setSelectedSubmission(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Work Submission Details</DialogTitle>
            <DialogDescription>
              Request ID: {selectedSubmission?.id}
            </DialogDescription>
          </DialogHeader>
          
          {selectedSubmission && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">{selectedSubmission.title}</h3>
                <div className="flex gap-2 mb-4">
                  {getStatusBadge(selectedSubmission.status)}
                  {getPriorityBadge(selectedSubmission.priority)}
                  <Badge variant="outline">{selectedSubmission.request_type}</Badge>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Description</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {selectedSubmission.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Submitter Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedSubmission.submitter_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedSubmission.submitter_email}</span>
                    </div>
                    {selectedSubmission.submitter_role && (
                      <div>Role: {selectedSubmission.submitter_role}</div>
                    )}
                    {selectedSubmission.department && (
                      <div>Department: {selectedSubmission.department}</div>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Timeline</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      Created: {format(new Date(selectedSubmission.created_at), 'PPpp')}
                    </div>
                    <div>
                      Updated: {format(new Date(selectedSubmission.updated_at), 'PPpp')}
                    </div>
                    {selectedSubmission.completed_at && (
                      <div>
                        Completed: {format(new Date(selectedSubmission.completed_at), 'PPpp')}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {selectedSubmission.tags.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Tags</h4>
                  <div className="flex gap-2 flex-wrap">
                    {selectedSubmission.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary">{tag}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}