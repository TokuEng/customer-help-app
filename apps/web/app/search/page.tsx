import { Suspense } from 'react';
import { SearchBar } from '@/components/SearchBar';
import { ResultCard } from '@/components/ResultCard';
import { SearchFilters } from '@/components/SearchFilters';
import { SearchPageTracker } from '@/components/SearchPageTracker';
import { api } from '@/lib/api';
import { SearchProgress } from '@/components/LoadingProgress';

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
          <h2 className="text-2xl font-bold mb-2">No results found</h2>
          <p className="text-gray-500 font-medium">Try searching with different keywords</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <SearchPageTracker resultsCount={results.length} />
        <p className="text-sm text-gray-600 mb-4 font-medium">
          {query ? `Found ${results.length} results for "${query}"` : `Showing ${results.length} articles`}
        </p>
        <div>
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
      </div>
    );
  } catch {
    // Search error occurred
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-2">Something went wrong</h2>
        <p className="text-gray-500 font-medium">Please try again later</p>
      </div>
    );
  }
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8">Search Help Center</h1>
          
          <div className="mb-6 sm:mb-8">
            <SearchBar defaultValue={params.q} />
          </div>

          {/* Filters - Mobile collapsible / Desktop sidebar */}
          <div className="mb-6 lg:hidden">
            <SearchFilters 
              currentCategory={params.category} 
              currentType={params.type} 
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8">
            {/* Filters Sidebar - Desktop only */}
            <aside className="hidden lg:block lg:col-span-1">
              <div className="bg-white rounded-lg p-4 sm:p-6 shadow-sm sticky top-24">
                <h3 className="font-bold mb-4 text-gray-900">Filters</h3>
                <SearchFilters 
                  currentCategory={params.category} 
                  currentType={params.type} 
                />
              </div>
            </aside>

            {/* Search Results */}
            <main className="lg:col-span-3">
              <Suspense fallback={
                <div className="py-12">
                  <SearchProgress />
                </div>
              }>
                <SearchResults searchParams={searchParams} />
              </Suspense>
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
