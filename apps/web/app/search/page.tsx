import { Suspense } from 'react';
import { SearchBar } from '@/components/SearchBar';
import { ResultCard } from '@/components/ResultCard';
import { SearchFilters } from '@/components/SearchFilters';
import { api } from '@/lib/api';

interface SearchPageProps {
  searchParams: Promise<{
    q?: string;
    category?: string;
    type?: string;
  }>;
}

async function SearchResults({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const query = params.q || '';
  
  try {
    const results = await api.search({
      q: query || '*',  // Use wildcard to get all articles when no query
      top_k: 50,  // Show up to 50 results instead of default 10
      filters: {
        category: params.category,
        type: params.type,
      },
    });

    if (results.length === 0) {
      return (
        <div className="text-center py-12">
          <h2 className="text-2xl font-semibold mb-2">No results found</h2>
          <p className="text-gray-500">Try searching with different keywords</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-600 mb-4">
          {query ? `Found ${results.length} results for "${query}"` : `Showing ${results.length} articles`}
        </p>
        {results.map((result) => (
          <ResultCard
            key={result.slug}
            title={result.title}
            slug={result.slug}
            summary={result.summary}
            type={result.type}
            category={result.category}
            readingTime={result.reading_time_min}
            updatedAt={result.updated_at}
            snippet={result.snippet}
          />
        ))}
      </div>
    );
  } catch (error) {
    console.error('Search error:', error);
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-semibold mb-2">Something went wrong</h2>
        <p className="text-gray-500">Please try again later</p>
      </div>
    );
  }
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Search Help Center</h1>
          
          <div className="mb-8">
            <SearchBar defaultValue={params.q} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Filters Sidebar */}
            <aside className="lg:col-span-1">
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h3 className="font-semibold mb-4">Filters</h3>
                <SearchFilters 
                  currentCategory={params.category} 
                  currentType={params.type} 
                />
              </div>
            </aside>

            {/* Search Results */}
            <main className="lg:col-span-3">
              <Suspense fallback={<div>Loading...</div>}>
                <SearchResults searchParams={searchParams} />
              </Suspense>
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
