import { Suspense } from 'react';
import { SearchBar } from '@/components/SearchBar';
import { ResultCard } from '@/components/ResultCard';
import { api } from '@/lib/api';

interface SearchPageProps {
  searchParams: {
    q?: string;
    category?: string;
    type?: string;
  };
}

async function SearchResults({ searchParams }: SearchPageProps) {
  const query = searchParams.q || '';
  
  if (!query) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Enter a search term to find articles</p>
      </div>
    );
  }

  try {
    const results = await api.search({
      q: query,
      filters: {
        category: searchParams.category,
        type: searchParams.type,
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
          Found {results.length} results for "{query}"
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

export default function SearchPage({ searchParams }: SearchPageProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Search Help Center</h1>
          
          <div className="mb-8">
            <SearchBar defaultValue={searchParams.q} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Filters Sidebar */}
            <aside className="lg:col-span-1">
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h3 className="font-semibold mb-4">Filters</h3>
                
                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm font-medium mb-2">Category</h4>
                    <div className="space-y-2">
                      {['Library', 'Token Payroll', 'Benefits', 'Policy'].map((cat) => (
                        <label key={cat} className="flex items-center">
                          <input
                            type="radio"
                            name="category"
                            value={cat}
                            checked={searchParams.category === cat}
                            className="mr-2"
                            onChange={() => {
                              const url = new URL(window.location.href);
                              url.searchParams.set('category', cat);
                              window.location.href = url.toString();
                            }}
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
                        <label key={type} className="flex items-center">
                          <input
                            type="radio"
                            name="type"
                            value={type}
                            checked={searchParams.type === type}
                            className="mr-2"
                            onChange={() => {
                              const url = new URL(window.location.href);
                              url.searchParams.set('type', type);
                              window.location.href = url.toString();
                            }}
                          />
                          <span className="text-sm capitalize">{type}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
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
