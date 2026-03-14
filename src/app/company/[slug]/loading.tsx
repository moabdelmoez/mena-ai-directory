export default function CompanyDetailLoading() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Company Header Skeleton */}
      <div className="bg-white rounded-xl border border-zinc-200 p-6 mb-8 animate-pulse">
        <div className="flex items-start gap-6">
          <div className="w-20 h-20 bg-zinc-200 rounded-lg" />
          <div className="flex-1">
            <div className="h-8 w-48 bg-zinc-200 rounded mb-2" />
            <div className="h-5 w-64 bg-zinc-100 rounded mb-4" />
            <div className="flex gap-2">
              <div className="h-6 w-20 bg-zinc-200 rounded-full" />
              <div className="h-6 w-24 bg-zinc-200 rounded-full" />
              <div className="h-6 w-16 bg-zinc-200 rounded-full" />
            </div>
          </div>
        </div>
      </div>

      {/* Description Skeleton */}
      <div className="bg-white rounded-xl border border-zinc-200 p-6 mb-8 animate-pulse">
        <div className="h-6 w-24 bg-zinc-200 rounded mb-4" />
        <div className="space-y-2">
          <div className="h-4 bg-zinc-100 rounded w-full" />
          <div className="h-4 bg-zinc-100 rounded w-full" />
          <div className="h-4 bg-zinc-100 rounded w-3/4" />
        </div>
      </div>

      {/* Products Skeleton */}
      <div className="bg-white rounded-xl border border-zinc-200 p-6 mb-8 animate-pulse">
        <div className="h-6 w-24 bg-zinc-200 rounded mb-4" />
        <div className="grid gap-4 sm:grid-cols-2">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="border border-zinc-200 rounded-lg p-4">
              <div className="h-5 w-32 bg-zinc-200 rounded mb-2" />
              <div className="h-4 w-full bg-zinc-100 rounded mb-1" />
              <div className="h-4 w-2/3 bg-zinc-100 rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Reviews Skeleton */}
      <div className="bg-white rounded-xl border border-zinc-200 p-6 animate-pulse">
        <div className="h-6 w-20 bg-zinc-200 rounded mb-4" />
        <div className="space-y-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="border-b border-zinc-100 pb-4 last:border-0">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-zinc-200 rounded-full" />
                <div className="flex-1">
                  <div className="h-4 w-24 bg-zinc-200 rounded mb-2" />
                  <div className="h-4 w-20 bg-zinc-100 rounded mb-2" />
                  <div className="h-4 w-full bg-zinc-100 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
