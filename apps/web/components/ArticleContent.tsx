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
      const container = contentRef.current;

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
  }, [content]);

  return (
    <div 
      ref={contentRef}
      className={`article-content prose prose-lg prose-gray max-w-none ${className}`}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}
