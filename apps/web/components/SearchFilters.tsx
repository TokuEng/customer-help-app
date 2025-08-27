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
            <label key={cat} className="flex items-center cursor-pointer">
              <input
                type="radio"
                name="category"
                value={cat}
                checked={currentCategory === cat}
                className="mr-2"
                onChange={() => handleFilterChange('category', cat)}
              />
              <span className="text-sm">{cat}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium mb-2">Type</h4>
        <div className="space-y-2">
          {['how-to', 'guide', 'policy', 'faq', 'process', 'info'].map((type) => (
            <label key={type} className="flex items-center cursor-pointer">
              <input
                type="radio"
                name="type"
                value={type}
                checked={currentType === type}
                className="mr-2"
                onChange={() => handleFilterChange('type', type)}
              />
              <span className="text-sm capitalize">{type}</span>
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
        className="text-sm text-blue-600 hover:text-blue-800"
      >
        Clear filters
      </button>
    </div>
  );
}
