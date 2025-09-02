'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  X, 
  Send, 
  CheckCircle2,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { api } from '@/lib/api';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

// Form validation schema
const formSchema = z.object({
  request_type: z.string().min(1, 'Required'),
  title: z.string().min(3, 'Min 3 chars'),
  description: z.string().min(10, 'Min 10 chars'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  submitter_name: z.string().min(2, 'Required'),
  submitter_email: z.string().email('Invalid email'),
  submitter_role: z.string().optional(),
  department: z.string().optional(),
  tags: z.array(z.string())
});

type FormData = z.infer<typeof formSchema>;

interface WorkSubmissionFormProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WorkSubmissionForm({ isOpen, onClose }: WorkSubmissionFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [tagInput, setTagInput] = useState('');
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      request_type: '',
      title: '',
      description: '',
      priority: 'medium',
      submitter_name: '',
      submitter_email: '',
      submitter_role: '',
      department: '',
      tags: []
    }
  });

  const currentTags = form.watch('tags');

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    
    try {
      const submissionData = {
        ...data,
        submitter_role: data.submitter_role || undefined,
        department: data.department || undefined,
      };

      await api.submitWorkRequest(submissionData);
      setSubmitted(true);
      
      setTimeout(() => {
        setSubmitted(false);
        onClose();
        form.reset();
      }, 2000);
    } catch (err) {
      console.error('Work submission error:', err);
      form.setError('root', {
        message: 'Failed to submit. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddTag = () => {
    const trimmedTag = tagInput.trim();
    if (trimmedTag && !currentTags.includes(trimmedTag) && currentTags.length < 5) {
      form.setValue('tags', [...currentTags, trimmedTag]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    form.setValue('tags', currentTags.filter(tag => tag !== tagToRemove));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div 
        className="fixed inset-0"
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-lg bg-white rounded-xl shadow-xl overflow-hidden animate-slideUp">
        {/* Compact Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3.5">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-white">Submit Work Request</h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-white/20 rounded-lg transition-colors"
              aria-label="Close"
            >
              <X className="h-4 w-4 text-white" />
            </button>
          </div>
        </div>

        {/* Compact Content */}
        <div className="p-5 max-h-[calc(100vh-120px)] overflow-y-auto">
          {submitted ? (
            <div className="text-center py-8 space-y-3 animate-fadeIn">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Submitted!</h3>
              <p className="text-sm text-gray-600">Your request has been received.</p>
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {/* Type & Title - Same Row */}
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="request_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium">
                          Type <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <input
                            type="text"
                            placeholder="Feature, Bug, etc."
                            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium">
                          Title <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <input
                            type="text"
                            placeholder="Brief title"
                            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Description */}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium">
                        Description <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <textarea
                          rows={3}
                          placeholder="Provide details..."
                          className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                {/* Priority - Compact Pills */}
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium">
                        Priority <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <div className="flex gap-2">
                          {(['low', 'medium', 'high', 'urgent'] as const).map((priority) => (
                            <button
                              key={priority}
                              type="button"
                              onClick={() => field.onChange(priority)}
                              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all capitalize ${
                                field.value === priority
                                  ? priority === 'low'
                                    ? 'bg-green-100 text-green-800 ring-1 ring-green-500'
                                    : priority === 'medium'
                                    ? 'bg-yellow-100 text-yellow-800 ring-1 ring-yellow-500'
                                    : priority === 'high'
                                    ? 'bg-orange-100 text-orange-800 ring-1 ring-orange-500'
                                    : 'bg-red-100 text-red-800 ring-1 ring-red-500'
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              }`}
                            >
                              {priority}
                            </button>
                          ))}
                        </div>
                      </FormControl>
                    </FormItem>
                  )}
                />

                {/* Contact Info - Same Row */}
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="submitter_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium">
                          Name <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <input
                            type="text"
                            placeholder="John Doe"
                            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="submitter_email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium">
                          Email <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <input
                            type="email"
                            placeholder="john@example.com"
                            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Role & Department - Optional */}
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="submitter_role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium text-gray-600">
                          Role <span className="text-gray-400">(optional)</span>
                        </FormLabel>
                        <FormControl>
                          <select
                            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                            {...field}
                          >
                            <option value="">Select</option>
                            <option value="Employee">Employee</option>
                            <option value="Contractor">Contractor</option>
                            <option value="Manager">Manager</option>
                            <option value="Other">Other</option>
                          </select>
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="department"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium text-gray-600">
                          Department <span className="text-gray-400">(optional)</span>
                        </FormLabel>
                        <FormControl>
                          <input
                            type="text"
                            placeholder="e.g., Engineering"
                            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            {...field}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                {/* Compact Tags */}
                                  <FormField
                    control={form.control}
                    name="tags"
                    render={() => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium text-gray-600">
                        Tags <span className="text-gray-400">(max 5)</span>
                      </FormLabel>
                      <FormControl>
                        <div>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={tagInput}
                              onChange={(e) => setTagInput(e.target.value)}
                              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                              placeholder="Add tags..."
                              disabled={currentTags.length >= 5}
                              className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                            />
                            <button
                              type="button"
                              onClick={handleAddTag}
                              disabled={!tagInput.trim() || currentTags.length >= 5}
                              className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                            >
                              Add
                            </button>
                          </div>
                          {currentTags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {currentTags.map((tag) => (
                                <span
                                  key={tag}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs"
                                >
                                  {tag}
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveTag(tag)}
                                    className="text-blue-500 hover:text-blue-700"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </FormControl>
                    </FormItem>
                  )}
                />

                {/* Error */}
                {form.formState.errors.root && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs flex items-center gap-2">
                    <AlertCircle className="h-3 w-3" />
                    {form.formState.errors.root.message}
                  </div>
                )}

                {/* Compact Actions */}
                <div className="flex justify-end gap-2 pt-3 border-t">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 text-sm bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="h-3 w-3" />
                        Submit
                      </>
                    )}
                  </button>
                </div>
              </form>
            </Form>
          )}
        </div>
      </div>
    </div>
  );
}