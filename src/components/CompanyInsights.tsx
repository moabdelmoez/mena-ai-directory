'use client';

import { useEffect, useState } from 'react';

interface InsightsStats {
  totalViews: number;
  uniqueVisitors: number;
  last7Days: number;
  last30Days: number;
  viewsByDay: Array<{ date: string; views: number }>;
  topSources: Array<{ source: string; count: number }>;
  topSearchTerms: Array<{ term: string; count: number }>;
}

const SOURCE_LABELS: Record<string, string> = {
  search: 'Search',
  direct: 'Direct',
  external: 'External',
  internal: 'Internal',
};

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white rounded-2xl border border-zinc-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="text-2xl font-semibold text-zinc-900 mt-1">{value.toLocaleString()}</p>
    </div>
  );
}

function ViewsChart({ data }: { data: Array<{ date: string; views: number }> }) {
  const maxViews = Math.max(...data.map((d) => d.views), 1);

  return (
    <div className="bg-white rounded-2xl border border-zinc-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-4">
        Views — Last 30 Days
      </p>
      <div className="flex items-end gap-0.5 h-32">
        {data.map((d) => {
          const heightPct = Math.round((d.views / maxViews) * 100);
          return (
            <div key={d.date} className="group relative flex-1 flex flex-col justify-end h-full">
              <div
                className="w-full rounded-sm bg-blue-500/80 transition-opacity hover:opacity-90"
                style={{ height: `${heightPct}%`, minHeight: d.views > 0 ? '2px' : '0' }}
              />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block z-10 pointer-events-none">
                <div className="bg-zinc-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                  {d.views.toLocaleString()} &middot; {d.date}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SourcesBreakdown({
  data,
  total,
}: {
  data: Array<{ source: string; count: number }>;
  total: number;
}) {
  return (
    <div className="bg-white rounded-2xl border border-zinc-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-4">
        Traffic Sources
      </p>
      <div className="space-y-3">
        {data.map(({ source, count }) => {
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          return (
            <div key={source}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-zinc-700">
                  {SOURCE_LABELS[source] ?? source}
                </span>
                <span className="text-xs text-zinc-500">{pct}%</span>
              </div>
              <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500/70 rounded-full transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
        {data.length === 0 && (
          <p className="text-sm text-zinc-400">No source data available.</p>
        )}
      </div>
    </div>
  );
}

function SearchTermsList({ terms }: { terms: Array<{ term: string; count: number }> }) {
  if (terms.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-zinc-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-4">
        Top Search Terms
      </p>
      <ul className="space-y-2">
        {terms.map(({ term, count }) => (
          <li key={term} className="flex items-center justify-between">
            <span className="text-sm text-zinc-700">
              &ldquo;{term}&rdquo;
            </span>
            <span className="text-xs text-zinc-500 tabular-nums">{count.toLocaleString()}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function CompanyInsights({ companyId }: { companyId: string }) {
  const [stats, setStats] = useState<InsightsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchStats() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/companies/${companyId}/insights/stats`);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
        }
        const data: InsightsStats = await res.json();
        if (!cancelled) setStats(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load insights');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchStats();
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-zinc-100 rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="h-40 bg-zinc-100 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="text-center py-8 text-zinc-500">
        {error || 'No data available'}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Views" value={stats.totalViews} />
        <StatCard label="Last 7 Days" value={stats.last7Days} />
        <StatCard label="Last 30 Days" value={stats.last30Days} />
        <StatCard label="Unique Visitors" value={stats.uniqueVisitors} />
      </div>

      <ViewsChart data={stats.viewsByDay} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SourcesBreakdown data={stats.topSources} total={stats.totalViews} />
        <SearchTermsList terms={stats.topSearchTerms} />
      </div>
    </div>
  );
}
