'use client';

import { useState, useEffect, useCallback, useId } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, Button, Input } from '@/components/ui';
import { Pagination } from '@/components/Pagination';
import type { InfoRequest } from '@/types';

interface ViewerEntry {
  userId: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
  visitCount: number;
  lastVisited: string;
  topSource: string;
}

interface ViewersResponse {
  viewers: ViewerEntry[];
  total: number;
  page: number;
  pageSize: number;
}

interface InsightsStats {
  totalViews: number;
  uniqueVisitors: number;
  last7Days: number;
  last30Days: number;
  topSources: Array<{ source: string; count: number }>;
}

const SOURCE_LABELS: Record<string, string> = {
  search: 'Search',
  direct: 'Direct',
  external: 'External',
  internal: 'Internal',
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AdminInsightsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const skeletonBaseId = useId();
  const [viewers, setViewers] = useState<ViewersResponse | null>(null);
  const [stats, setStats] = useState<InsightsStats | null>(null);
  const [infoRequests, setInfoRequests] = useState<InfoRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const pageSize = 20;

  const companyId = params.id;

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [viewersRes, infoRes] = await Promise.all([
        fetch(`/api/admin/companies/${companyId}/insights/viewers?page=${page}&pageSize=${pageSize}`),
        fetch(`/api/companies/${companyId}/info-requests`),
      ]);
      if (!viewersRes.ok) {
        router.push('/admin/login');
        return;
      }
      const data = await viewersRes.json();
      setStats(data.stats);
      setViewers({ viewers: data.viewers, total: data.total, page: data.page, pageSize: data.pageSize });

      if (infoRes.ok) {
        const infoData: InfoRequest[] = await infoRes.json();
        setInfoRequests(infoData);
      }
    } catch {
      router.push('/admin/login');
    } finally {
      setIsLoading(false);
    }
  }, [companyId, page, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Filter viewers client-side by search term
  const filteredViewers = viewers?.viewers.filter((v) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (v.name && v.name.toLowerCase().includes(q)) ||
      v.email.toLowerCase().includes(q)
    );
  }) || [];

  const totalPages = viewers ? Math.ceil(viewers.total / pageSize) : 0;

  const renderLoadingState = () => (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={`${skeletonBaseId}-skeleton-${i}`} className="h-20 bg-zinc-100 rounded-2xl animate-pulse" />
      ))}
    </div>
  );

  const renderAvatar = (viewer: ViewerEntry) => (
    viewer.avatarUrl ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={viewer.avatarUrl}
        alt=""
        className="w-8 h-8 rounded-full object-cover"
      />
    ) : (
      <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center">
        <span className="text-zinc-400 text-xs font-medium">
          {(viewer.name ?? viewer.email).charAt(0).toUpperCase()}
        </span>
      </div>
    )
  );

  const renderViewersTable = () => (
    <>
      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {filteredViewers.map((viewer) => (
          <div key={viewer.userId} className="bg-white rounded-2xl border border-zinc-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-4">
            <div className="flex items-start gap-3">
              {renderAvatar(viewer)}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-zinc-900 truncate">
                  {viewer.name ?? <span className="text-zinc-400 italic">No name</span>}
                </div>
                <div className="text-xs text-zinc-500 truncate mt-0.5">{viewer.email}</div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-sm font-semibold text-zinc-900">{viewer.visitCount}</div>
                <div className="text-xs text-zinc-400">visits</div>
              </div>
            </div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-100 text-xs text-zinc-500">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 font-medium">
                {SOURCE_LABELS[viewer.topSource] ?? viewer.topSource}
              </span>
              <span>{formatDate(viewer.lastVisited)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white rounded-2xl border border-zinc-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-zinc-100">
            <thead className="bg-zinc-50/80">
              <tr>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-zinc-600 uppercase tracking-wider">
                  Viewer
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-zinc-600 uppercase tracking-wider">
                  Visits
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-zinc-600 uppercase tracking-wider">
                  Top Source
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-zinc-600 uppercase tracking-wider">
                  Last Visited
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-zinc-100">
              {filteredViewers.map((viewer) => (
                <tr key={viewer.userId} className="hover:bg-zinc-50/50 transition-colors duration-150">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      {renderAvatar(viewer)}
                      <div>
                        <div className="text-sm font-medium text-zinc-900">
                          {viewer.name ?? <span className="text-zinc-400 italic">No name</span>}
                        </div>
                        <div className="text-sm text-zinc-500">{viewer.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-zinc-900">
                    {viewer.visitCount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-600">
                      {SOURCE_LABELS[viewer.topSource] ?? viewer.topSource}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-500">
                    {formatDate(viewer.lastVisited)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="mt-8">
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      )}
    </>
  );

  const renderEmptyState = () => (
    <Card className="text-center py-12">
      <h3 className="text-lg font-medium text-zinc-900">No viewers found</h3>
      <p className="mt-2 text-zinc-500">
        {search
          ? 'No viewers match your search. Try adjusting your query.'
          : 'No one has viewed this company profile yet.'}
      </p>
    </Card>
  );

  const renderContent = () => {
    if (isLoading) return renderLoadingState();
    if (filteredViewers.length > 0) return renderViewersTable();
    return renderEmptyState();
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <Link href="/admin/companies">
            <Button variant="ghost" size="sm" className="text-zinc-500 hover:text-zinc-700">
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">Company Insights</h1>
            <p className="text-zinc-500 mt-1 hidden sm:block">Viewer analytics for this company profile.</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-5">
            <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1">Total Views</div>
            <div className="text-2xl font-bold text-zinc-900">{stats.totalViews.toLocaleString()}</div>
          </Card>
          <Card className="p-5">
            <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1">Last 7 Days</div>
            <div className="text-2xl font-bold text-zinc-900">{stats.last7Days.toLocaleString()}</div>
          </Card>
          <Card className="p-5">
            <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1">Last 30 Days</div>
            <div className="text-2xl font-bold text-zinc-900">{stats.last30Days.toLocaleString()}</div>
          </Card>
          <Card className="p-5">
            <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1">Unique Visitors</div>
            <div className="text-2xl font-bold text-zinc-900">{stats.uniqueVisitors.toLocaleString()}</div>
          </Card>
        </div>
      )}

      {/* Search */}
      <div className="bg-white rounded-2xl border border-zinc-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-4 mb-6">
        <Input
          placeholder="Search viewers by name or email..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
      </div>

      {renderContent()}

      {/* Info Requests Section */}
      {!isLoading && infoRequests.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold text-zinc-900 mb-4">
            Info Requests <span className="text-zinc-400 font-normal text-base">({infoRequests.length})</span>
          </h2>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {infoRequests.map((req) => (
              <div key={req.id} className="bg-white rounded-2xl border border-zinc-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-4">
                <div className="flex items-start gap-3">
                  {req.user?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={req.user.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center">
                      <span className="text-zinc-400 text-xs font-medium">
                        {(req.user?.name ?? req.user_email).charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-zinc-900 truncate">
                      {req.user?.name ?? <span className="text-zinc-400 italic">No name</span>}
                    </div>
                    <div className="text-xs text-zinc-500 truncate mt-0.5">{req.user_email}</div>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-zinc-100 text-xs text-zinc-500">
                  {formatDate(req.created_at)}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block bg-white rounded-2xl border border-zinc-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-zinc-100">
                <thead className="bg-zinc-50/80">
                  <tr>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold text-zinc-600 uppercase tracking-wider">
                      Requester
                    </th>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold text-zinc-600 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold text-zinc-600 uppercase tracking-wider">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-zinc-100">
                  {infoRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-zinc-50/50 transition-colors duration-150">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          {req.user?.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={req.user.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center">
                              <span className="text-zinc-400 text-xs font-medium">
                                {(req.user?.name ?? req.user_email).charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                          <span className="text-sm font-medium text-zinc-900">
                            {req.user?.name ?? <span className="text-zinc-400 italic">No name</span>}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-500">
                        {req.user_email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-500">
                        {formatDate(req.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
