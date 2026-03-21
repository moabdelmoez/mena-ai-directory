export default function AdminLoading() {
  return (
    <div>
      {/* Header Skeleton */}
      <div className="mb-10">
        <div className="h-9 w-48 bg-zinc-200 rounded-lg animate-pulse mb-2" />
        <div className="h-5 w-64 bg-zinc-100 rounded-lg animate-pulse" />
      </div>

      {/* Stats Cards Skeleton */}
      <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-zinc-100 rounded-2xl p-6 animate-pulse">
            <div className="h-3 w-24 bg-zinc-200 rounded mb-3" />
            <div className="h-10 w-16 bg-zinc-200 rounded-lg" />
          </div>
        ))}
      </div>

      {/* Table Skeleton */}
      <div className="bg-white rounded-2xl border border-zinc-200/60 overflow-hidden">
        <div className="border-b border-zinc-100 p-4 animate-pulse">
          <div className="flex gap-4">
            <div className="h-4 w-1/4 bg-zinc-200 rounded" />
            <div className="h-4 w-1/4 bg-zinc-200 rounded" />
            <div className="h-4 w-1/4 bg-zinc-200 rounded" />
            <div className="h-4 w-1/4 bg-zinc-200 rounded" />
          </div>
        </div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="border-b border-zinc-100 p-4 animate-pulse last:border-0">
            <div className="flex gap-4 items-center">
              <div className="w-10 h-10 bg-zinc-200 rounded-lg" />
              <div className="h-4 w-1/4 bg-zinc-200 rounded" />
              <div className="h-4 w-1/4 bg-zinc-100 rounded" />
              <div className="h-6 w-20 bg-zinc-200 rounded-full" />
              <div className="flex gap-2 ml-auto">
                <div className="h-8 w-16 bg-zinc-200 rounded-xl" />
                <div className="h-8 w-16 bg-zinc-200 rounded-xl" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
