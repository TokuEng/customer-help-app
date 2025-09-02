'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WorkSubmissionResponse } from '@/lib/api';
import { KanbanCard } from './KanbanCard';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';

interface KanbanBoardProps {
  submissions: WorkSubmissionResponse[];
  onUpdateStatus: (submissionId: string, newStatus: string) => Promise<void>;
  isUpdating?: boolean;
}

interface Column {
  id: string;
  title: string;
  status: string;
  color: string;
  description: string;
}

const columns: Column[] = [
  {
    id: 'pending',
    title: 'Not Started',
    status: 'pending',
    color: 'bg-gray-100 border-gray-200',
    description: 'New requests waiting to be reviewed'
  },
  {
    id: 'in_progress',
    title: 'In Progress',
    status: 'in_progress',
    color: 'bg-blue-50 border-blue-200',
    description: 'Currently being worked on'
  },
  {
    id: 'completed',
    title: 'Completed',
    status: 'completed',
    color: 'bg-green-50 border-green-200',
    description: 'Successfully resolved'
  },
  {
    id: 'rejected',
    title: 'Rejected',
    status: 'rejected',
    color: 'bg-red-50 border-red-200',
    description: 'Not approved or declined'
  }
];

export function KanbanBoard({ submissions, onUpdateStatus, isUpdating = false }: KanbanBoardProps) {
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  const getSubmissionsByStatus = (status: string) => {
    return submissions.filter(submission => submission.status === status);
  };

  const handleDragStart = (submissionId: string) => {
    setDraggedItem(submissionId);
  };

  const handleDragEnd = async () => {
    if (draggedItem && dragOverColumn) {
      const submission = submissions.find(s => s.id === draggedItem);
      if (submission && submission.status !== dragOverColumn) {
        try {
          await onUpdateStatus(draggedItem, dragOverColumn);
        } catch (error) {
          console.error('Failed to update status:', error);
        }
      }
    }
    setDraggedItem(null);
    setDragOverColumn(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, columnStatus: string) => {
    e.preventDefault();
    setDragOverColumn(columnStatus);
    handleDragEnd();
  };

  return (
    <div className="flex gap-6 overflow-x-auto pb-6">
      {columns.map((column) => {
        const columnSubmissions = getSubmissionsByStatus(column.status);
        const isDragOver = dragOverColumn === column.status;
        
        return (
          <div
            key={column.id}
            className={`flex-shrink-0 w-80 ${column.color} rounded-lg border-2 transition-all duration-200 ${
              isDragOver ? 'border-blue-400 bg-blue-100' : ''
            }`}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, column.status)}
          >
            {/* Column Header */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-800">{column.title}</h3>
                <Badge variant="secondary" className="text-xs">
                  {columnSubmissions.length}
                </Badge>
              </div>
              <p className="text-xs text-gray-600">{column.description}</p>
            </div>

            {/* Column Content */}
            <div className="p-4 min-h-[400px] max-h-[calc(100vh-300px)] overflow-y-auto">
              <AnimatePresence mode="popLayout">
                {columnSubmissions.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center py-8 text-gray-400"
                  >
                    <Plus className="h-8 w-8 mb-2" />
                    <p className="text-sm">No items</p>
                  </motion.div>
                ) : (
                  columnSubmissions.map((submission) => (
                    <motion.div
                      key={submission.id}
                      draggable={!isUpdating}
                      onDragStart={() => handleDragStart(submission.id)}
                      onDragEnd={handleDragEnd}
                      className={isUpdating ? 'pointer-events-none opacity-50' : ''}
                      layout
                    >
                      <KanbanCard 
                        submission={submission}
                        isDragging={draggedItem === submission.id}
                      />
                    </motion.div>
                  ))
                )}
              </AnimatePresence>

              {/* Drop Zone Indicator */}
              {isDragOver && draggedItem && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="border-2 border-dashed border-blue-400 bg-blue-50 rounded-lg p-4 mb-3 flex items-center justify-center"
                >
                  <div className="text-blue-600 text-sm font-medium">
                    Drop here to move to {column.title}
                  </div>
                </motion.div>
              )}
            </div>

            {/* Loading Indicator */}
            {isUpdating && (
              <div className="absolute inset-0 bg-white bg-opacity-50 flex items-center justify-center rounded-lg">
                <div className="flex items-center gap-2 text-blue-600">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
                  <span className="text-sm font-medium">Updating...</span>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
