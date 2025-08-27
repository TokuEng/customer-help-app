'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Icon } from '@/components/ui/icon';

interface SearchFiltersProps {
  currentCategory?: string;
  currentType?: string;
}

export function SearchFilters({ currentCategory, currentType }: SearchFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleFilterChange = (filterType: 'category' | 'type', value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (params.get(filterType) === value) {
      params.delete(filterType);
    } else {
      params.set(filterType, value);
    }
    
    router.push(`/search?${params.toString()}`);
  };

  const hasActiveFilters = currentCategory || currentType;

  return (
    <div>
      {/* Mobile Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden w-full flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors mb-4"
      >
        <span className="font-medium text-gray-900">
          Filters {hasActiveFilters && <span className="text-primary">({(currentCategory ? 1 : 0) + (currentType ? 1 : 0)} active)</span>}
        </span>
        {isOpen ? (
          <Icon name="chevron-up" className="h-4 w-4" />
        ) : (
          <Icon name="chevron-down" className="h-4 w-4" />
        )}
      </button>

      {/* Filter Content */}
      <div className={`lg:block ${isOpen ? 'block' : 'hidden'} space-y-6`}>
        <div>
          <h4 className="text-sm font-medium mb-3 text-gray-900">Category</h4>
          <div className="space-y-2">
            {['Library', 'Token Payroll', 'Benefits', 'Policy'].map((cat) => (
              <label key={cat} className="flex items-center cursor-pointer group py-1.5 hover:bg-gray-50 rounded px-2 -mx-2 transition-colors">
                <input
                  type="radio"
                  name="category"
                  value={cat}
                  checked={currentCategory === cat}
                  className="mr-3 text-primary focus:ring-2 focus:ring-primary focus:ring-offset-1 rounded"
                  onChange={() => handleFilterChange('category', cat)}
                />
                <span className="text-sm group-hover:text-primary transition-colors">{cat}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium mb-3 text-gray-900">Type</h4>
          <div className="space-y-2">
            {['how-to', 'guide', 'policy', 'faq', 'process', 'info'].map((type) => (
              <label key={type} className="flex items-center cursor-pointer group py-1.5 hover:bg-gray-50 rounded px-2 -mx-2 transition-colors">
                <input
                  type="radio"
                  name="type"
                  value={type}
                  checked={currentType === type}
                  className="mr-3 text-primary focus:ring-2 focus:ring-primary focus:ring-offset-1 rounded"
                  onChange={() => handleFilterChange('type', type)}
                />
                <span className="text-sm capitalize group-hover:text-primary transition-colors">{type}</span>
              </label>
            ))}
          </div>
        </div>

        {hasActiveFilters && (
          <button
            onClick={() => {
              const params = new URLSearchParams(searchParams.toString());
              params.delete('category');
              params.delete('type');
              router.push(`/search?${params.toString()}`);
            }}
            className="w-full text-sm text-primary hover:text-primary-700 hover:bg-primary/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded px-3 py-2 border border-primary/20"
          >
            Clear all filters
          </button>
        )}
      </div>
    </div>
  );
}
