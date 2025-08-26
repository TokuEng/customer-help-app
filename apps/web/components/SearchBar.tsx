'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface SearchBarProps {
  defaultValue?: string;
  placeholder?: string;
  autoFocus?: boolean;
  size?: 'default' | 'large';
}

export function SearchBar({ 
  defaultValue = '', 
  placeholder = 'Search help articles...', 
  autoFocus = false,
  size = 'default'
}: SearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState(defaultValue);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const isLarge = size === 'large';

  return (
    <form onSubmit={handleSearch} className="w-full">
      <div className="relative">
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className={cn(
            "w-full pr-12",
            isLarge && "h-14 text-lg px-6"
          )}
        />
        <Button
          type="submit"
          size={isLarge ? "default" : "icon"}
          className={cn(
            "absolute right-1 top-1/2 -translate-y-1/2",
            isLarge && "right-2 h-10 w-10"
          )}
          variant="ghost"
        >
          <Search className={isLarge ? "h-5 w-5" : "h-4 w-4"} />
          <span className="sr-only">Search</span>
        </Button>
      </div>
    </form>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
