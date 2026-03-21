'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { classNames } from '@/lib/utils';

interface Stats {
  pending: number;
  approved: number;
  rejected: number;
  total: number;
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-[104px] bg-zinc-200 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  const statCards = [
    {
      label: 'Pending Review',
      value: stats?.pending || 0,
      bg: 'bg-amber-50',
      accent: 'text-amber-600',
      iconBg: 'bg-amber-100',
      ring: 'ring-amber-200/50',
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      ),
    },
    {
      label: 'Approved',
      value: stats?.approved || 0,
      bg: 'bg-emerald-50',
      accent: 'text-emerald-600',
      iconBg: 'bg-emerald-100',
      ring: 'ring-emerald-200/50',
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      ),
    },
    {
      label: 'Rejected',
      value: stats?.rejected || 0,
      bg: 'bg-red-50',
      accent: 'text-red-600',
      iconBg: 'bg-red-100',
      ring: 'ring-red-200/50',
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      ),
    },
    {
      label: 'Total Companies',
      value: stats?.total || 0,
      bg: 'bg-blue-50',
      accent: 'text-blue-600',
      iconBg: 'bg-blue-100',
      ring: 'ring-blue-200/50',
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      ),
    },
  ];

  return (
    <div>
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">Dashboard</h1>
        <p className="text-zinc-500 mt-1">Overview of your directory at a glance.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((card) => (
          <div
            key={card.label}
            className={classNames(
              'relative rounded-2xl p-6 ring-1 transition-all duration-200',
              card.bg,
              card.ring
            )}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{card.label}</p>
                <p className={classNames('text-4xl font-extrabold tracking-tight mt-2', card.accent)}>
                  {card.value}
                </p>
              </div>
              <div className={classNames('w-11 h-11 rounded-xl flex items-center justify-center', card.iconBg)}>
                <svg className={classNames('w-5 h-5', card.accent)} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {card.icon}
                </svg>
              </div>
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
    </div>
  );
}
