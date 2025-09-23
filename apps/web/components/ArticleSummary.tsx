'use client';

import { useState, useEffect } from 'react';
import { Icon } from '@/components/ui/icon';
import '../app/article-summary.css';

interface ArticleSummaryProps {
  summary: string | null;
  className?: string;
}

/**
 * Enhanced markdown/HTML cleaner that handles edge cases
 */
function cleanSummaryText(text: string): string {
  if (!text) return '';
  
  const cleaned = text
    // Remove HTML tags if any
    .replace(/<[^>]*>/g, '')
    // Remove markdown formatting
    .replace(/\*\*([^*]+)\*\*/g, '$1')     // Bold
    .replace(/\*([^*]+)\*/g, '$1')         // Italic
    .replace(/__([^_]+)__/g, '$1')         // Alt bold
    .replace(/_([^_]+)_/g, '$1')           // Alt italic
    .replace(/~~([^~]+)~~/g, '$1')         // Strikethrough
    .replace(/^#+\s*/gm, '')               // Headers
    .replace(/^\s*[-*+]\s*/gm, '')         // Bullet points
    .replace(/^\s*\d+\.\s*/gm, '')         // Numbered lists
    .replace(/^\s*>\s*/gm, '')             // Block quotes
    // Clean links - keep text, remove URLs
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\[[^\]]+\]/g, '$1')
    // Remove raw URLs
    .replace(/https?:\/\/[^\s]+/g, '')
    // Remove images
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
    // Remove code blocks
    .replace(/```[^`]*```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    // Remove horizontal rules
    .replace(/^[-*_]{3,}\s*$/gm, '')
    // Remove special characters that might break rendering
    .replace(/[<>{}\\]/g, '')
    // Handle special prefixes
    .replace(/^Toku:\s*/i, '')
    .replace(/^Summary:\s*/i, '')
    .replace(/^Overview:\s*/i, '')
    .replace(/^Description:\s*/i, '')
    // Fix common encoding issues
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    // Clean up whitespace
    .replace(/\n{3,}/g, '\n\n')           // Multiple newlines
    .replace(/\s+/g, ' ')                  // Multiple spaces
    .replace(/^\s+|\s+$/gm, '')            // Trim each line
    .trim();
    
  return cleaned;
}

/**
 * Split text into paragraphs for better rendering
 */
function splitIntoParagraphs(text: string): string[] {
  const cleaned = cleanSummaryText(text);
  
  // Split by double newlines or period followed by capital letter
  const paragraphs = cleaned
    .split(/\n\n+|\.\s+(?=[A-Z])/)
    .map(p => p.trim())
    .filter(p => p.length > 0)
    .map(p => {
      // Ensure each paragraph ends with punctuation
      if (p && !/[.!?]$/.test(p)) {
        return p + '.';
      }
      return p;
    });
    
  return paragraphs;
}

export function ArticleSummary({ summary, className = '' }: ArticleSummaryProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [paragraphs, setParagraphs] = useState<string[]>([]);
  const [needsExpansion, setNeedsExpansion] = useState(false);
  
  useEffect(() => {
    if (!summary) return;
    
    // Safety check: limit summary to 5000 characters to prevent rendering issues
    const safeSummary = summary.length > 5000 ? summary.substring(0, 5000) + '...' : summary;
    
    const paras = splitIntoParagraphs(safeSummary);
    setParagraphs(paras);
    
    // Check if we need expansion button (more than 2 paragraphs or very long text)
    const totalLength = paras.join(' ').length;
    setNeedsExpansion(paras.length > 2 || totalLength > 300);
  }, [summary]);
  
  if (!summary || paragraphs.length === 0) return null;
  
  const displayParagraphs = needsExpansion && !isExpanded 
    ? paragraphs.slice(0, 2) 
    : paragraphs;
  
  return (
    <div className={`mt-4 sm:mt-6 ${className}`}>
      {/* Container with gradient background and border */}
      <div className="relative overflow-hidden rounded-lg sm:rounded-xl shadow-sm hover:shadow-md transition-shadow">
        {/* Gradient background with better contrast */}
        <div className="absolute inset-0 summary-gradient-bg" />
        
        {/* Blue accent border on the left */}
        <div className="absolute left-0 top-0 bottom-0 w-1 sm:w-1.5 bg-gradient-to-b from-blue-500 to-indigo-500" />
        
        {/* Content container */}
        <div className="relative px-4 sm:px-6 py-4 sm:py-5">
          {/* Summary header for desktop only */}
          <div className="hidden sm:block mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-700">
              Summary
            </span>
          </div>
          
          {/* Text content */}
          <div className="space-y-2">
            {displayParagraphs.map((para, index) => (
              <p 
                key={index}
                className="article-summary-text summary-text-enhanced text-sm sm:text-base lg:text-lg leading-relaxed"
              >
                {para}
              </p>
            ))}
            
            {/* Fade effect when collapsed */}
            {needsExpansion && !isExpanded && (
              <div className="absolute bottom-0 left-0 right-0 summary-fade-mask" />
            )}
            
            {/* Expand/Collapse button */}
            {needsExpansion && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="summary-expand-btn relative mt-3 inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 active:text-blue-800 transition-colors"
                aria-expanded={isExpanded}
                aria-label={isExpanded ? 'Show less content' : 'Read more content'}
              >
                <span>{isExpanded ? 'Show less' : 'Read more'}</span>
                <Icon 
                  name={isExpanded ? 'chevron-up' : 'chevron-down'} 
                  className="w-4 h-4"
                  alt={isExpanded ? 'Collapse' : 'Expand'}
                />
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Alternative style - Card layout (commented for option) */}
      {/* 
      <div className="bg-white border border-blue-100 rounded-lg sm:rounded-xl shadow-sm hover:shadow-md transition-shadow">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-2 border-b border-blue-100">
          <span className="text-xs sm:text-sm font-semibold text-blue-700 uppercase tracking-wide">
            Summary
          </span>
        </div>
        <div className="p-4 sm:p-6">
          {content here}
        </div>
      </div>
      */}
    </div>
  );
}
