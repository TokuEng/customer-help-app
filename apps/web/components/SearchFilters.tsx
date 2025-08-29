'use client';

import { useRouter, useSearchParams } from 'next/navigation';

interface SearchFiltersProps {
  currentCategory?: string;
  currentType?: string;
}

export function SearchFilters({ currentCategory, currentType }: SearchFiltersProps) {
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

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-sm font-medium mb-2">Category</h4>
        <div className="space-y-2">
          {['Library', 'Token Payroll', 'Benefits', 'Policy'].map((cat) => (
            <label key={cat} className="flex items-center cursor-pointer group py-1">
              <input
                type="radio"
                name="category"
                value={cat}
                checked={currentCategory === cat}
                className="mr-2 text-primary focus:ring-2 focus:ring-primary focus:ring-offset-1"
                onChange={() => handleFilterChange('category', cat)}
              />
              <span className="text-sm group-hover:text-primary transition-colors">{cat}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium mb-2">Type</h4>
        <div className="space-y-2">
          {['how-to', 'guide', 'policy', 'faq', 'process', 'info'].map((type) => (
            <label key={type} className="flex items-center cursor-pointer group py-1">
              <input
                type="radio"
                name="type"
                value={type}
                checked={currentType === type}
                className="mr-2 text-primary focus:ring-2 focus:ring-primary focus:ring-offset-1"
                onChange={() => handleFilterChange('type', type)}
              />
              <span className="text-sm capitalize group-hover:text-primary transition-colors">{type}</span>
            </label>
          ))}
        </div>
      </div>

      <button
        onClick={() => {
          const params = new URLSearchParams(searchParams.toString());
          params.delete('category');
          params.delete('type');
          router.push(`/search?${params.toString()}`);
        }}
        className="text-sm text-primary hover:text-primary-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded px-2 py-1"
      >
        Clear filters
      </button>
    </div>
  );
}
