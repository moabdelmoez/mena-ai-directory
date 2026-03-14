export default function DashboardLoading() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Skeleton */}
      <div className="mb-8">
        <div className="h-8 w-48 bg-zinc-200 rounded animate-pulse mb-2" />
        <div className="h-5 w-64 bg-zinc-100 rounded animate-pulse" />
      </div>

      {/* Stats Cards Skeleton */}
      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-zinc-200 p-6 animate-pulse">
            <div className="h-4 w-24 bg-zinc-200 rounded mb-2" />
            <div className="h-8 w-16 bg-zinc-300 rounded" />
          </div>
        ))}
      </div>

      {/* Companies Section Skeleton */}
      <div className="bg-white rounded-xl border border-zinc-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="h-6 w-36 bg-zinc-200 rounded animate-pulse" />
          <div className="h-10 w-32 bg-zinc-200 rounded animate-pulse" />
        </div>

        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="border border-zinc-200 rounded-lg p-4 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-zinc-200 rounded-lg" />
                <div className="flex-1">
                  <div className="h-5 w-1/3 bg-zinc-200 rounded mb-2" />
                  <div className="h-4 w-1/2 bg-zinc-100 rounded" />
                </div>
                <div className="h-6 w-20 bg-zinc-200 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
