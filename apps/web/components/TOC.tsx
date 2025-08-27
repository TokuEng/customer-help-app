'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface TOCItem {
  id: string;
  text: string;
  level: number;
}

interface TOCProps {
  items: TOCItem[];
}

export function TOC({ items }: TOCProps) {
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      const observer = new IntersectionObserver(
        (entries) => {
          // Find the entry that's most visible
          const mostVisible = entries.find(entry => entry.isIntersecting);
          if (mostVisible) {
            setActiveId(mostVisible.target.id);
          }
        },
        {
          rootMargin: '-80px 0% -50% 0%',
          threshold: 0.1
        }
      );

      items.forEach((item) => {
        // Try multiple ID formats to find the heading element
        const possibleIds = [
          item.id,
          item.id.startsWith('h-') ? item.id : `h-${item.id}`,
          item.text
            .replace(/\*\*/g, '').replace(/\*/g, '').trim()
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/[-\s]+/g, '-')
            .replace(/^-+|-+$/g, '')
        ];
        
        let element = null;
        for (const possibleId of possibleIds) {
          element = document.getElementById(possibleId);
          if (element) break;
          
          // Also try with h- prefix
          if (!possibleId.startsWith('h-')) {
            element = document.getElementById(`h-${possibleId}`);
            if (element) break;
          }
        }
        
        if (element) {
          observer.observe(element);
        }
      });

      return () => observer.disconnect();
    }, 100);

    return () => clearTimeout(timer);
  }, [items]);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string, text: string) => {
    e.preventDefault();
    
    // Try multiple ID formats to ensure compatibility
    const possibleIds = [
      id, // Original ID from API
      id.startsWith('h-') ? id : `h-${id}`, // Add h- prefix if missing
      text
        .replace(/\*\*/g, '').replace(/\*/g, '').trim()
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/[-\s]+/g, '-')
        .replace(/^-+|-+$/g, '')
    ];
    
    let element = null;
    for (const possibleId of possibleIds) {
      element = document.getElementById(possibleId);
      if (element) break;
      
      // Also try with h- prefix
      if (!possibleId.startsWith('h-')) {
        element = document.getElementById(`h-${possibleId}`);
        if (element) break;
      }
    }
    
    if (element) {
      const offset = 100; // Adjust for header and padding
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
      
      // Update active state immediately for better UX
      setActiveId(element.id);
    }
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <nav className="sticky top-20 max-h-[calc(100vh-5rem)] overflow-y-auto">
      <ul className="space-y-1 text-sm">
        {items.map((item) => (
          <li
            key={item.id}
            style={{ paddingLeft: `${(item.level - 1) * 1}rem` }}
          >
            <a
              href={`#${item.id}`}
              onClick={(e) => handleClick(e, item.id, item.text)}
              className={cn(
                'block py-2 px-3 rounded-md transition-all duration-200 hover:bg-blue-50 hover:text-blue-700 cursor-pointer text-left',
                activeId === item.id
                  ? 'font-medium text-blue-700 bg-blue-50 border-l-2 border-blue-500'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              {item.text.replace(/\*\*/g, '').replace(/\*/g, '').trim()}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
