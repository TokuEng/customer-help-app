'use client';

import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { WorkSubmissionResponse } from '@/lib/api';
import { User, Calendar, Tag } from 'lucide-react';

interface KanbanCardProps {
  submission: WorkSubmissionResponse;
  isDragging?: boolean;
}

export function KanbanCard({ submission, isDragging = false }: KanbanCardProps) {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      whileHover={{ scale: 1.02 }}
      whileDrag={{ scale: 1.05, rotate: 2 }}
      className={`cursor-grab active:cursor-grabbing ${isDragging ? 'z-50' : ''}`}
    >
      <Card className={`mb-3 transition-all duration-200 hover:shadow-md ${
        isDragging ? 'shadow-lg ring-2 ring-blue-400' : ''
      }`}>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start gap-2">
            <CardTitle className="text-sm font-medium leading-tight">
              {submission.title}
            </CardTitle>
            <Badge className={`${getPriorityColor(submission.priority)} text-xs shrink-0`}>
              {submission.priority.toUpperCase()}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          <p className="text-xs text-gray-600 mb-3 line-clamp-2">
            {submission.description}
          </p>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <User className="h-3 w-3" />
              <span className="truncate">{submission.submitter_name}</span>
            </div>
            
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Calendar className="h-3 w-3" />
              <span>{formatDate(submission.created_at)}</span>
            </div>
            
            {submission.tags.length > 0 && (
              <div className="flex items-center gap-1">
                <Tag className="h-3 w-3 text-gray-400" />
                <div className="flex gap-1 flex-wrap">
                  {submission.tags.slice(0, 2).map((tag) => (
                    <span
                      key={tag}
                      className="text-xs px-1.5 py-0.5 bg-gray-100 rounded text-gray-600"
                    >
                      {tag}
                    </span>
                  ))}
                  {submission.tags.length > 2 && (
                    <span className="text-xs text-gray-400">
                      +{submission.tags.length - 2}
                    </span>
                  )}
                </div>
              </div>
            )}
            
            {submission.assigned_to && (
              <div className="text-xs">
                <span className="text-gray-500">Assigned:</span>
                <span className="ml-1 font-medium text-gray-700">
                  {submission.assigned_to}
                </span>
              </div>
            )}
          </div>
          
          <Badge variant="outline" className="mt-2 text-xs">
            {submission.request_type}
          </Badge>
        </CardContent>
      </Card>
    </motion.div>
  );
}


