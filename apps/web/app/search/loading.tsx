import { SearchProgress } from '@/components/LoadingProgress';

export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse mb-6 sm:mb-8">
            <div className="h-8 sm:h-10 bg-gray-200 rounded w-64 mb-6 sm:mb-8"></div>
            
            <div className="h-14 bg-gray-200 rounded-lg mb-6 sm:mb-8"></div>
          </div>

          {/* Filters - Mobile collapsible / Desktop sidebar */}
          <div className="mb-6 lg:hidden">
            <div className="h-12 bg-gray-200 rounded-lg animate-pulse"></div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8">
            {/* Filters Sidebar - Desktop only */}
            <aside className="hidden lg:block lg:col-span-1">
              <div className="bg-white rounded-lg p-4 sm:p-6 shadow-sm">
                <div className="animate-pulse">
                  <div className="h-5 bg-gray-200 rounded w-16 mb-4"></div>
                  <div className="space-y-4">
                    <div>
                      <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
                      <div className="space-y-2">
                        <div className="h-3 bg-gray-200 rounded w-full"></div>
                        <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                      </div>
                    </div>
                    <div>
                      <div className="h-4 bg-gray-200 rounded w-12 mb-2"></div>
                      <div className="space-y-2">
                        <div className="h-3 bg-gray-200 rounded w-full"></div>
                        <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                        <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </aside>

            {/* Search Results */}
            <main className="lg:col-span-3">
              <div className="py-12">
                <SearchProgress />
              </div>
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}


