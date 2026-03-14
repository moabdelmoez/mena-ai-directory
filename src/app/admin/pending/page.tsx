'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Button } from '@/components/ui';
import { Pagination } from '@/components/Pagination';
import { Company, PaginatedResponse } from '@/types';
import { formatDate } from '@/lib/utils';

export default function PendingPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<PaginatedResponse<Company> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchCompanies = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/companies?status=pending&page=${page}`);
      if (!response.ok) {
        router.push('/admin/login');
        return;
      }
      const data = await response.json();
      setCompanies(data);
    } catch (error) {
      console.error('Error fetching companies:', error);
      router.push('/admin/login');
    } finally {
      setIsLoading(false);
    }
  }, [page, router]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const handleAction = async (companyId: string, action: 'approved' | 'rejected') => {
    setProcessingId(companyId);
    try {
      const response = await fetch('/api/admin/companies', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId, status: action }),
      });

      if (response.ok) {
        await fetchCompanies();
      }
    } catch (error) {
      console.error('Error updating company:', error);
    } finally {
      setProcessingId(null);
    }
  };

  if (isLoading && !companies) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-zinc-200 rounded w-1/4 mb-8" />
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-zinc-200 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-zinc-900 mb-8">Pending Registrations</h1>

      {companies && companies.data.length > 0 ? (
        <>
          <div className="space-y-4">
            {companies.data.map((company) => (
              <Card key={company.id}>
                <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-zinc-900">
                        {company.name}
                      </h3>
                    </div>
                    <p className="text-zinc-600 text-sm mb-3">{company.description}</p>
                    <div className="flex flex-wrap gap-4 text-sm text-zinc-500">
                      <span>{company.hq_country}</span>
                      {company.company_url && (
                        <a
                          href={company.company_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {company.company_url}
                        </a>
                      )}
                      <span>Submitted {formatDate(company.created_at)}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAction(company.id, 'rejected')}
                      disabled={processingId === company.id}
                      className="text-red-600 hover:bg-red-50"
                    >
                      Reject
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleAction(company.id, 'approved')}
                      disabled={processingId === company.id}
                      isLoading={processingId === company.id}
                    >
                      Approve
                    </Button>
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
            className="mx-auto h-12 w-12 text-zinc-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-zinc-900">
            No pending registrations
          </h3>
          <p className="mt-2 text-zinc-500">
            All company registrations have been reviewed.
          </p>
        </Card>
      )}
    </div>
  );
}
