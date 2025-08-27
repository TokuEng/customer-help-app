'use client';

import { useEffect, useRef } from 'react';

interface ArticleContentProps {
  content: string;
  className?: string;
}

export function ArticleContent({ content, className = '' }: ArticleContentProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current) {
      // Add IDs to headings for TOC navigation using same logic as backend
      const headings = contentRef.current.querySelectorAll('h1, h2, h3, h4, h5, h6');
      headings.forEach((heading) => {
        if (!heading.id) {
          // Generate ID from heading text using same logic as ChunkingService
          const text = heading.textContent || '';
          const idText = text
            .toLowerCase()
            .replace(/[^\w\s-]/g, '') // Remove special characters
            .replace(/[-\s]+/g, '-') // Replace spaces and multiple hyphens with single hyphen
            .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
          
          if (idText) {
            heading.id = `h-${idText}`;
          }
        }
      });

      // Enhance images with better styling and handle broken images
      const images = contentRef.current.querySelectorAll('img');
      images.forEach((img) => {
        img.style.maxWidth = '100%';
        img.style.height = 'auto';
        img.style.borderRadius = '8px';
        img.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
        img.style.margin = '2rem auto';
        img.style.display = 'block';
        
        // Handle broken images
        img.onerror = function() {
          // Create a placeholder div
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
          
          // Replace the broken image with the placeholder
          if (img.parentNode) {
            img.parentNode.replaceChild(placeholder, img);
          }
        };
      });
    }
  }, [content]);

  return (
    <div 
      ref={contentRef}
      className={`article-content prose prose-lg prose-gray max-w-none ${className}`}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}
