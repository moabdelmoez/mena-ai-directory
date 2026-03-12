'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@stackframe/stack';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, Button } from '@/components/ui';
import { Pagination } from '@/components/Pagination';
import { StatusBadge } from '@/components/StatusBadge';
import { Company, PaginatedResponse } from '@/types';
import { formatDate } from '@/lib/utils';

export default function DashboardPage() {
  const user = useUser();
  const router = useRouter();

  const [companies, setCompanies] = useState<PaginatedResponse<Company> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchCompanies = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/user/companies?page=${page}`);
      const data = await response.json();
      setCompanies(data);
    } catch (error) {
      console.error('Error fetching companies:', error);
    } finally {
      setIsLoading(false);
    }
  }, [page]);

  useEffect(() => {
    if (!mounted) return;

    if (!user) {
      router.push('/handler/sign-in');
      return;
    }

    fetchCompanies();
  }, [mounted, user, router, fetchCompanies]);

  if (!mounted || !user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-8" />
          <div className="space-y-4">
            <div className="h-24 bg-gray-200 rounded" />
            <div className="h-24 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Dashboard</h1>
          <p className="text-gray-600 mt-1">Manage your company submissions</p>
        </div>
        <Button
          variant="primary"
          onClick={() => router.push('/register')}
        >
          Register New Company
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : companies && companies.data.length > 0 ? (
        <>
          <div className="space-y-4">
            {companies.data.map((company) => (
              <Card key={company.id} interactive>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">
                        {company.name}
                      </h3>
                      <StatusBadge status={company.status} />
                      {company.claimed_by && (
                        <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 px-2 py-0.5 rounded-full text-xs font-medium">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Claimed
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600 text-sm line-clamp-2 mb-2">
                      {company.description}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>{company.hq_country}</span>
                      <span>Submitted {formatDate(company.created_at)}</span>
                    </div>
                  </div>
                  <div className="flex-shrink-0 ml-4 flex flex-col gap-2 items-end">
                    {company.status === 'approved' && (
                      <>
                        <Link
                          href={`/company/${company.slug}`}
                          className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                        >
                          View Page
                        </Link>
                        <Link
                          href={`/dashboard/company/${company.id}/products`}
                          className="text-gray-600 hover:text-gray-700 font-medium text-sm"
                        >
                          Manage Products
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {companies.totalPages > 1 && (
            <div className="mt-8">
              <Pagination
                currentPage={companies.page}
                totalPages={companies.totalPages}
                onPageChange={setPage}
              />
            </div>
          )}
        </>
      ) : (
        <Card className="text-center py-12">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            No companies yet
          </h3>
          <p className="mt-2 text-gray-500">
            Get started by registering your first company.
          </p>
          <Button
            variant="primary"
            className="mt-4"
            onClick={() => router.push('/register')}
          >
            Register a Company
          </Button>
        </Card>
      )}
    </div>
  );
}
