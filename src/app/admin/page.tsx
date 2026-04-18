'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface InfoRequestItem {
  id: string;
  userEmail: string;
  createdAt: string;
  company: { id: string; name: string; slug: string } | null;
}

interface CompanyOwnerItem {
  id: string;
  name: string;
  slug: string;
  owner: { email: string; name: string | null } | null;
}

interface Stats {
  pending: number;
  approved: number;
  rejected: number;
  total: number;
  registeredUsers: number;
  recentInfoRequests: InfoRequestItem[];
  companiesWithOwners: CompanyOwnerItem[];
}

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/stats');

      if (!res.ok) {
        router.push('/admin/login');
        return;
      }

      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
      router.push('/admin/login');
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-9 bg-zinc-200 rounded-lg w-1/4 mb-2" />
        <div className="h-5 bg-zinc-100 rounded-lg w-1/3 mb-10" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-[104px] bg-zinc-100 rounded-2xl border border-zinc-200/60" />
          ))}
        </div>
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="bg-zinc-100 border border-zinc-200/60 rounded-2xl p-6 space-y-3">
              <div className="h-4 bg-zinc-200 rounded w-32 mb-4" />
              {[...Array(6)].map((_, j) => (
                <div key={j} className="h-10 bg-zinc-200/60 rounded-lg" />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  const statCards = [
    {
      label: 'Pending Review',
      value: stats?.pending ?? 0,
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      ),
    },
    {
      label: 'Approved',
      value: stats?.approved ?? 0,
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      ),
    },
    {
      label: 'Rejected',
      value: stats?.rejected ?? 0,
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      ),
    },
    {
      label: 'Total Companies',
      value: stats?.total ?? 0,
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      ),
    },
    {
      label: 'Registered Users',
      value: stats?.registeredUsers ?? 0,
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      ),
    },
  ];

  const recentInfoRequests = stats?.recentInfoRequests || [];
  const companiesWithOwners = stats?.companiesWithOwners || [];

  return (
    <div>
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">Dashboard</h1>
        <p className="text-zinc-500 mt-1">Overview of your directory at a glance.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="bg-white border border-zinc-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)] rounded-2xl p-6"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{card.label}</p>
                <p className="text-3xl font-semibold text-zinc-900 mt-2 tabular-nums">
                  {card.value.toLocaleString()}
                </p>
              </div>
              <svg className="w-5 h-5 text-zinc-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {card.icon}
              </svg>
            </div>
          </div>
        ))}
      </div>

      {stats?.pending != null && stats.pending > 0 && (
        <div className="mt-8">
          <div className="flex items-center gap-4 bg-amber-50 ring-1 ring-amber-200/60 rounded-2xl p-5">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-900">
                {stats.pending} {stats.pending === 1 ? 'company' : 'companies'} awaiting review
              </p>
              <p className="text-xs text-amber-700/70 mt-0.5">These need your attention before they go live.</p>
            </div>
            <Link
              href="/admin/pending"
              className="flex-shrink-0 px-4 py-2 text-sm font-semibold text-amber-700 bg-amber-100 hover:bg-amber-200 rounded-xl transition-colors"
            >
              Review Now
            </Link>
          </div>
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white border border-zinc-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)] rounded-2xl p-6" aria-label="Recent info requests">
          <h2 className="text-sm font-semibold text-zinc-900 mb-4">Recent Info Requests</h2>
          {recentInfoRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <svg className="w-10 h-10 text-zinc-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              <p className="text-sm font-medium text-zinc-400">No info requests yet</p>
              <p className="text-xs text-zinc-400/70 mt-1">Requests will appear here as users ask for info.</p>
            </div>
          ) : (
            <div>
              {recentInfoRequests.map((req) => (
                <div
                  key={req.id}
                  className="flex items-center gap-3 py-2.5 border-b border-zinc-100 last:border-b-0 rounded -mx-1 px-1 transition-colors hover:bg-zinc-50"
                >
                  <div className="w-7 h-7 rounded-full bg-blue-50 text-blue-600 text-xs font-semibold flex items-center justify-center flex-shrink-0 uppercase">
                    {req.userEmail.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-700 truncate">{req.userEmail}</p>
                    <p className="text-xs text-zinc-500 truncate">
                      {req.company ? (
                        <>
                          →{' '}
                          <Link href={`/company/${req.company.slug}`} className="hover:text-zinc-900 hover:underline">
                            {req.company.name}
                          </Link>
                        </>
                      ) : (
                        <span className="text-zinc-400">— company removed</span>
                      )}
                    </p>
                  </div>
                  <span className="text-xs text-zinc-400 tabular-nums flex-shrink-0">
                    {new Date(req.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="bg-white border border-zinc-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)] rounded-2xl p-6" aria-label="Companies and owners">
          <h2 className="text-sm font-semibold text-zinc-900 mb-4">Companies &amp; Owners</h2>
          {companiesWithOwners.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <svg className="w-10 h-10 text-zinc-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <p className="text-sm font-medium text-zinc-400">No companies yet</p>
              <p className="text-xs text-zinc-400/70 mt-1">Approved companies will appear here with their owner.</p>
            </div>
          ) : (
            <div>
              {companiesWithOwners.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-3 py-2.5 border-b border-zinc-100 last:border-b-0 rounded -mx-1 px-1 transition-colors hover:bg-zinc-50"
                >
                  <Link href={`/company/${c.slug}`} className="text-sm text-zinc-700 truncate flex-1 hover:text-zinc-900 hover:underline">
                    {c.name}
                  </Link>
                  {c.owner ? (
                    <span className="text-sm text-zinc-500 truncate flex-shrink-0 max-w-[50%]" title={c.owner.email}>
                      {c.owner.name || c.owner.email}
                    </span>
                  ) : (
                    <span className="text-sm text-zinc-400 flex-shrink-0">—</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
