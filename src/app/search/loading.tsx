export default function SearchLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Search Header Skeleton */}
      <div className="mb-8">
        <div className="max-w-2xl h-12 bg-zinc-200 rounded-lg animate-pulse" />
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Filters Sidebar Skeleton */}
        <aside className="w-full lg:w-64 flex-shrink-0">
          <div className="bg-white rounded-xl border border-zinc-200 p-6">
            <div className="h-6 w-20 bg-zinc-200 rounded animate-pulse mb-6" />

            <div className="space-y-6">
              {/* Company Type Filter Skeleton */}
              <div>
                <div className="h-4 w-24 bg-zinc-200 rounded animate-pulse mb-3" />
                <div className="space-y-2">
                  <div className="h-5 w-32 bg-zinc-100 rounded animate-pulse" />
                  <div className="h-5 w-28 bg-zinc-100 rounded animate-pulse" />
                </div>
              </div>

              {/* Country Filter Skeleton */}
              <div>
                <div className="h-4 w-16 bg-zinc-200 rounded animate-pulse mb-2" />
                <div className="h-10 bg-zinc-100 rounded animate-pulse" />
              </div>

              {/* Capabilities Filter Skeleton */}
              <div>
                <div className="h-4 w-24 bg-zinc-200 rounded animate-pulse mb-3" />
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-5 w-28 bg-zinc-100 rounded animate-pulse" />
                  ))}
                </div>
              </div>

              {/* Industries Filter Skeleton */}
              <div>
                <div className="h-4 w-20 bg-zinc-200 rounded animate-pulse mb-3" />
                <div className="space-y-2">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-5 w-24 bg-zinc-100 rounded animate-pulse" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Results Skeleton */}
        <div className="flex-1">
          {/* Results Header Skeleton */}
          <div className="mb-6">
            <div className="h-8 w-48 bg-zinc-200 rounded animate-pulse mb-2" />
            <div className="h-5 w-32 bg-zinc-100 rounded animate-pulse" />
          </div>

          {/* Company Cards Skeleton */}
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-xl border border-zinc-200 p-6 animate-pulse"
              >
                <div className="flex gap-4">
                  <div className="w-16 h-16 bg-zinc-200 rounded-lg" />
                  <div className="flex-1">
                    <div className="h-5 bg-zinc-200 rounded w-1/3 mb-2" />
                    <div className="h-4 bg-zinc-200 rounded w-2/3 mb-2" />
                    <div className="h-4 bg-zinc-200 rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
