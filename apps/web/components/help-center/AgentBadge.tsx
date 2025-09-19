'use client'

import React from 'react'
import { isFeatureEnabled } from '@/lib/featureFlags'
import { cn } from '@/lib/utils'
import { Bot, Sparkles, AlertCircle } from 'lucide-react'

interface AgentBadgeProps {
  confidence?: number
  category?: string
  ticketId?: string
  className?: string
}

export function AgentBadge({ confidence, category, ticketId, className }: AgentBadgeProps) {
  // Only show in debug mode
  if (!isFeatureEnabled('agentDebugMode')) {
    return null
  }
  
  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600 bg-green-50'
    if (score >= 0.6) return 'text-yellow-600 bg-yellow-50'
    return 'text-red-600 bg-red-50'
  }
  
  const getCategoryLabel = (cat: string) => {
    const labels: Record<string, string> = {
      billing: 'Billing',
      benefits: 'Benefits',
      customer_success: 'Support',
      legal: 'Legal',
      payroll: 'Payroll',
      none: 'General',
    }
    return labels[cat] || cat
  }
  
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {confidence !== undefined && (
        <div
          className={cn(
            'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
            getConfidenceColor(confidence)
          )}
        >
          <Bot className="h-3 w-3" />
          <span>Confidence: {(confidence * 100).toFixed(0)}%</span>
        </div>
      )}
      
      {category && category !== 'none' && (
        <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-600">
          <Sparkles className="h-3 w-3" />
          <span>{getCategoryLabel(category)}</span>
        </div>
      )}
      
      {ticketId && (
        <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-600">
          <AlertCircle className="h-3 w-3" />
          <span>Ticket: #{ticketId}</span>
        </div>
      )}
    </div>
  )
}
