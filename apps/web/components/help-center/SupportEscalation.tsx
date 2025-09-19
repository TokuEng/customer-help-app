'use client'

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import { isFeatureEnabled } from '@/lib/featureFlags'

type Category = 'billing' | 'benefits' | 'customer_success' | 'legal' | 'payroll'
type Priority = 'low' | 'medium' | 'high'

interface SupportEscalationProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userQuery: string
  chatHistory: Array<{ role: string; content: string }>
  onTicketCreated?: (ticketId: string) => void
}

interface AgentState {
  user_query: string
  answer?: string
  category?: string
  confidence?: number
  escalate?: boolean
  ticket_id?: string
  processing_errors?: string[]
}

export function SupportEscalation({
  open,
  onOpenChange,
  userQuery,
  chatHistory,
  onTicketCreated,
}: SupportEscalationProps) {
  const [category, setCategory] = useState<Category>('customer_success')
  const [email, setEmail] = useState('')
  const [priority, setPriority] = useState<Priority>('medium')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ticketId, setTicketId] = useState<string | null>(null)
  
  // Check if feature is enabled
  if (!isFeatureEnabled('helpCenterV2Agent')) {
    return null
  }
  
  const handleSubmit = async () => {
    setIsSubmitting(true)
    setError(null)
    
    try {
      // Build the request payload
      const payload = {
        user_query: userQuery,
        chat_history: chatHistory.slice(-20), // Last 20 messages
        user_meta: {
          escalate: true,
          category,
          email: email || undefined,
          priority,
          url: typeof window !== 'undefined' ? window.location.href : undefined,
        },
      }
      
      // Create an EventSource for SSE
      const response = await fetch('/api/agent/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })
      
      if (!response.ok) {
        throw new Error(`Failed to create ticket: ${response.statusText}`)
      }
      
      // Read the SSE stream
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      
      if (!reader) {
        throw new Error('No response body')
      }
      
      let buffer = ''
      
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        
        buffer += decoder.decode(value, { stream: true })
        
        // Process complete SSE events
        const lines = buffer.split('\n')
        buffer = lines[lines.length - 1] // Keep incomplete line
        
        for (let i = 0; i < lines.length - 1; i++) {
          const line = lines[i].trim()
          
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              
              // Check for ticket ID in the state
              if (data.state?.ticket_id) {
                setTicketId(data.state.ticket_id)
                onTicketCreated?.(data.state.ticket_id)
              }
              
              // Check for errors
              if (data.state?.processing_errors?.length > 0) {
                setError(data.state.processing_errors[0])
              }
            } catch (e) {
              console.error('Failed to parse SSE data:', e)
            }
          } else if (line.startsWith('event: error')) {
            // Handle error event
            const nextLine = lines[i + 1]
            if (nextLine?.startsWith('data: ')) {
              try {
                const errorData = JSON.parse(nextLine.slice(6))
                setError(errorData.error || 'An error occurred')
              } catch {
                setError('An error occurred while processing your request')
              }
            }
          }
        }
      }
      
      if (ticketId) {
        // Success - close modal after a delay
        setTimeout(() => {
          onOpenChange(false)
          // Reset form
          setEmail('')
          setPriority('medium')
          setTicketId(null)
        }, 2000)
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create support ticket')
    } finally {
      setIsSubmitting(false)
    }
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Contact Support</DialogTitle>
          <DialogDescription>
            We'll create a support ticket to help you with your question. Our team will get back to you as soon as possible.
          </DialogDescription>
        </DialogHeader>
        
        {ticketId ? (
          <div className="py-6">
            <div className="flex items-center justify-center mb-4">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
            <p className="text-center text-lg font-medium">
              Ticket Created Successfully!
            </p>
            <p className="text-center text-sm text-gray-600 mt-2">
              Ticket ID: <span className="font-mono font-semibold">#{ticketId}</span>
            </p>
            <p className="text-center text-sm text-gray-500 mt-1">
              Our support team will contact you soon.
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="category">Category</Label>
                <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
                  <SelectTrigger id="category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="billing">Billing & Invoicing</SelectItem>
                    <SelectItem value="benefits">Benefits & Insurance</SelectItem>
                    <SelectItem value="payroll">Payroll & Compensation</SelectItem>
                    <SelectItem value="legal">Legal & Compliance</SelectItem>
                    <SelectItem value="customer_success">General Support</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="email">Email (optional)</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting}
                />
                <p className="text-xs text-gray-500">
                  Provide your email for faster support response
                </p>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="priority">Priority</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                  <SelectTrigger id="priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low - General inquiry</SelectItem>
                    <SelectItem value="medium">Medium - Standard issue</SelectItem>
                    <SelectItem value="high">High - Urgent matter</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
                  <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}
            </div>
            
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating Ticket...
                  </>
                ) : (
                  'Send to Support'
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
