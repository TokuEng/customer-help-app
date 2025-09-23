'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { LoadingProgress } from './LoadingProgress';
import ReactMarkdown from 'react-markdown';

interface ArticleContentProps {
  content: string;
  articleId: string;
  className?: string;
  summary?: string | null;
}

export function ArticleContent({ content, articleId, className = '', summary }: ArticleContentProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [isAIRendering, setIsAIRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [markdownContent, setMarkdownContent] = useState<string | null>(null);

  const pollRenderStatus = useCallback(async (renderId: string) => {
    const poll = async () => {
      try {
        // Use proper API URL with fallback
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/backend/api';
        const response = await fetch(`${apiUrl}/render/${renderId}/status`);
        const status = await response.json();
        
        setRenderProgress(status.progress);
        
        if (status.status === 'completed') {
          // Refresh the page to get the new AI-rendered content
          window.location.reload();
        } else if (status.status === 'failed') {
          setIsAIRendering(false);
        } else {
          // Continue polling
          setTimeout(poll, 1000);
        }
      } catch (error) {
        console.error('Failed to poll render status:', error);
        setIsAIRendering(false);
      }
    };
    
    poll();
  }, []);

  const triggerAIRender = useCallback(async () => {
    try {
      setIsAIRendering(true);
      setRenderProgress(10);

      // Trigger AI rendering
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/backend/api';
      const response = await fetch(`${apiUrl}/render`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          article_id: articleId,
          force_rerender: false
        })
      });

      const result = await response.json();
      
      if (result.success && result.render_id) {
        // Poll for progress
        pollRenderStatus(result.render_id);
      } else {
        setIsAIRendering(false);
      }
    } catch (error) {
      console.error('Failed to trigger AI render:', error);
      setIsAIRendering(false);
    }
  }, [articleId, pollRenderStatus]);

  // Check if AI rendering should be triggered
  useEffect(() => {
    const shouldTriggerAIRender = () => {
      // Trigger AI render if content looks like basic HTML/markdown
      const hasBasicFormatting = content.includes('##') || 
                                 content.includes('**') || 
                                 (!content.includes('<div class="callout') && 
                                  !content.includes('<section'));
      
      return hasBasicFormatting && content.length > 500; // Only for substantial content
    };

    if (shouldTriggerAIRender()) {
      triggerAIRender();
    }
  }, [articleId, content, triggerAIRender]);

  // Detect if the provided HTML actually contains raw markdown inside text nodes
  useEffect(() => {
    try {
      const temp = document.createElement('div');
      temp.innerHTML = content || '';
      const plainText = temp.textContent || '';

      const looksLikeMarkdown = /(^|\n)\s{0,3}(#{1,6})\s+.+|\!\[[^\]]*\]\([^\)]+\)|\[[^\]]+\]\([^\)]+\)|(^|\n)\s*\d+\.\s+/.test(plainText);

      // If lots of HTML tags are present, prefer HTML; otherwise if markdown patterns are present, render via markdown
      const htmlTagCount = (content.match(/<[^>]+>/g) || []).length;
      const preferMarkdown = looksLikeMarkdown && htmlTagCount < 10; // heuristics: light HTML wrapper around markdown

      setMarkdownContent(preferMarkdown ? plainText : null);
    } catch {
      setMarkdownContent(null);
    }
  }, [content]);

  useEffect(() => {
    if (contentRef.current && !isAIRendering) {
      const container = contentRef.current;
      
      // Clean up problematic HTML elements from Notion import
      const cleanupProblematicElements = () => {
        // Remove empty or emoji-only blockquotes
        const blockquotes = container.querySelectorAll('blockquote');
        blockquotes.forEach((blockquote) => {
          const text = blockquote.textContent?.trim() || '';
          // If blockquote only contains 1-2 characters (likely an emoji) or is empty
          if (text.length <= 2 || text === '' || /^[\u{1F300}-\u{1F9FF}]$/u.test(text)) {
            blockquote.remove();
          }
        });
        
        // Remove consecutive hr elements and those at the start
        const hrs = container.querySelectorAll('hr');
        let previousWasHr = false;
        hrs.forEach((hr) => {
          // Remove if it's among the first two elements
          if (hr.previousElementSibling === null || 
              (hr.previousElementSibling && hr.previousElementSibling.tagName === 'HR')) {
            hr.remove();
            return;
          }
          
          // Remove consecutive hrs
          if (previousWasHr) {
            hr.remove();
            return;
          }
          previousWasHr = true;
        });
        
        // Clean up double hrs at the end
        const allElements = Array.from(container.children);
        for (let i = allElements.length - 1; i >= 1; i--) {
          if (allElements[i].tagName === 'HR' && allElements[i - 1].tagName === 'HR') {
            (allElements[i] as HTMLElement).remove();
          }
        }
        
        // Remove duplicate summary text from beginning of content
        if (summary) {
          const firstParagraph = container.querySelector('p:first-child');
          if (firstParagraph) {
            const paragraphText = firstParagraph.textContent?.trim() || '';
            const summaryText = summary.trim();
            
            // Check if the first paragraph is very similar to the summary
            // Remove common formatting differences and compare
            const cleanParagraph = paragraphText.toLowerCase()
              .replace(/[^\w\s]/g, '') // Remove punctuation
              .replace(/\s+/g, ' '); // Normalize spaces
            const cleanSummary = summaryText.toLowerCase()
              .replace(/[^\w\s]/g, '')
              .replace(/\s+/g, ' ');
            
            // Check if they're the same or if paragraph starts with summary
            if (cleanParagraph === cleanSummary || 
                cleanParagraph.startsWith(cleanSummary.substring(0, Math.min(50, cleanSummary.length)))) {
              firstParagraph.remove();
              
              // Also remove the following hr if it exists
              const nextElement = container.querySelector('p:first-child + hr, hr:first-child');
              if (nextElement && nextElement.tagName === 'HR') {
                nextElement.remove();
              }
            }
          }
        }
      };
      
      cleanupProblematicElements();

      const isInCode = (el: Element) => !!el.closest('pre, code');

      const candidates = container.querySelectorAll('p, li, a, h1, h2, h3, h4, h5, h6');
      candidates.forEach((el) => {
        if (isInCode(el)) return;

        if (el.childNodes.length === 1 && el.childNodes[0].nodeType === Node.TEXT_NODE) {
          const txt = el.textContent || '';
          const m = txt.match(/^\s*(#{2,6})\s+(.*)$/);
          if (m) {
            const level = m[1].length;
            const rest = m[2];

            if (el.tagName.toLowerCase() === 'p' && level >= 2 && level <= 6) {
              const h = document.createElement(`h${Math.min(level, 6)}`);
              h.textContent = rest;
              el.replaceWith(h);
              return;
            }

            el.textContent = rest;
          }
        } else {
          const first = el.firstChild;
          if (first && first.nodeType === Node.TEXT_NODE) {
            const t = first.textContent || '';
            const tm = t.match(/^\s*(#{2,6})\s+(.*)$/);
            if (tm) first.textContent = tm[2];
          }
        }
      });

      const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
      headings.forEach((heading) => {
        if (!heading.id) {
          const text = heading.textContent || '';
          const idText = text
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/[-\s]+/g, '-')
            .replace(/^-+|-+$/g, '');
          
          if (idText) {
            heading.id = `h-${idText}`;
          }
        }
      });

      const images = container.querySelectorAll('img');
      images.forEach((img) => {
        img.style.maxWidth = '100%';
        img.style.height = 'auto';
        img.style.borderRadius = '8px';
        img.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
        img.style.margin = '2rem auto';
        img.style.display = 'block';
        
        img.onerror = function() {
          const placeholder = document.createElement('div');
          placeholder.className = 'image-placeholder';
          placeholder.style.cssText = `
            background-color: #f3f4f6;
            border: 2px dashed #d1d5db;
            border-radius: 8px;
            padding: 3rem 2rem;
            text-align: center;
            color: #6b7280;
            font-style: italic;
            margin: 2rem auto;
            max-width: 600px;
          `;
          placeholder.innerHTML = `
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" style="margin: 0 auto 1rem; opacity: 0.3;">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <circle cx="8.5" cy="8.5" r="1.5"></circle>
              <polyline points="21 15 16 10 5 21"></polyline>
            </svg>
            <div>Image not available</div>
            <div style="font-size: 0.875rem; margin-top: 0.5rem; opacity: 0.8;">
              This image may have been moved or the link expired
            </div>
          `;
          
          if (img.parentNode) {
            img.parentNode.replaceChild(placeholder, img);
          }
        };
      });
    }
  }, [content, isAIRendering, summary]);

  if (isAIRendering) {
    return (
      <div className={`article-content prose prose-lg prose-gray max-w-none ${className}`}>
        <div className="my-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center space-x-2 text-blue-700">
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="font-medium">AI is optimizing this article for better readability...</span>
            </div>
            <LoadingProgress 
              className="max-w-md mx-auto"
              message={`Enhancing content structure and formatting (${renderProgress}%)`}
              showMessage={true}
            />
            <p className="text-sm text-blue-600">
              This will only take a moment. The AI is analyzing the content and applying smart formatting for the best reading experience.
            </p>
          </div>
        </div>
        
        {/* Show original content below the loading indicator */}
        <div 
          ref={contentRef}
          className="opacity-75"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      </div>
    );
  }

  // Markdown fallback renderer (handles cases where the backend HTML contains raw markdown text)
  if (markdownContent) {
    return (
      <div className={`article-content prose prose-lg prose-gray max-w-none ${className}`}>
        <ReactMarkdown>{markdownContent}</ReactMarkdown>
      </div>
    );
  }

  return (
    <div 
      ref={contentRef}
      className={`article-content prose prose-lg prose-gray max-w-none ${className}`}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}