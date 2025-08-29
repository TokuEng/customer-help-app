export default function CalendarLoading() {
  return (
    <div className="min-h-screen">
      {/* Hero Section Skeleton */}
      <div className="bg-gradient-to-b from-blue-50 to-white py-8 sm:py-12">
        <div className="mx-auto max-w-6xl px-4 md:px-8">
          <div className="text-center">
            <div className="h-10 w-96 bg-gray-200 rounded-lg mx-auto animate-pulse" />
            <div className="mt-3 h-6 w-[600px] bg-gray-200 rounded mx-auto animate-pulse" />
          </div>
        </div>
      </div>

      {/* Calendar Skeleton */}
      <section className="mx-auto max-w-6xl px-4 md:px-8 py-8 sm:py-12">
        <div className="rounded-xl border bg-white shadow-sm">
          <div className="border-b px-4 sm:px-6 py-4 sm:py-5">
            <div className="h-8 w-64 bg-gray-200 rounded animate-pulse" />
          </div>
          <div className="p-4 sm:p-6">
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 35 }).map((_, i) => (
                <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
