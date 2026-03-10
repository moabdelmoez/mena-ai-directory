'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, Button, Select, Input, ConfirmDialog } from '@/components/ui';
import { Pagination } from '@/components/Pagination';
import { StatusBadge } from '@/components/StatusBadge';
import { Company, PaginatedResponse } from '@/types';
import { formatDate } from '@/lib/utils';
import { MENA_COUNTRIES } from '@/constants';

export default function CompaniesPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<PaginatedResponse<Company> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const fetchCompanies = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString() });
      if (statusFilter) params.set('status', statusFilter);
      if (countryFilter) params.set('hq_country', countryFilter);
      if (search) params.set('search', search);

      const response = await fetch(`/api/admin/companies?${params.toString()}`);
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
  }, [page, statusFilter, countryFilter, search, router]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleDelete = async (companyId: string) => {
    setDeletingId(companyId);
    try {
      const response = await fetch(`/api/admin/companies?companyId=${companyId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchCompanies();
      }
    } catch (error) {
      console.error('Error deleting company:', error);
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  const clearFilters = () => {
    setStatusFilter('');
    setCountryFilter('');
    setSearchInput('');
    setSearch('');
    setPage(1);
  };

  const hasActiveFilters = statusFilter || countryFilter || search;

  const renderLoadingState = () => (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={`skeleton-loader-${i}`} className="h-20 bg-gray-200 rounded-lg animate-pulse" />
      ))}
    </div>
  );

  const renderCompaniesTable = () => (
    <>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50/80">
            <tr>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Company
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Country
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3.5 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {companies!.data.map((company) => (
              <tr key={company.id} className="hover:bg-gray-50/50 transition-colors duration-150">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    {company.logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={company.logo}
                        alt=""
                        className={`w-10 h-10 rounded-lg object-contain ${company.logo_bg === 'black' ? 'bg-black' : company.logo_bg === 'white' ? 'bg-white' : 'bg-gray-50'}`}
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                        <span className="text-gray-400 text-xs font-medium">
                          {company.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {company.name}
                      </div>
                      {company.company_url && (
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          {company.company_url}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {company.hq_country}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <StatusBadge status={company.status} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(company.created_at)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                  <div className="flex items-center justify-end gap-2">
                    <Link href={`/admin/manage?id=${company.id}`}>
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setConfirmDeleteId(company.id)}
                      disabled={deletingId === company.id}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      {deletingId === company.id ? 'Deleting...' : 'Delete'}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {companies!.totalPages > 1 && (
        <div className="mt-8">
          <Pagination
            currentPage={companies!.page}
            totalPages={companies!.totalPages}
            onPageChange={setPage}
          />
        </div>
      )}
    </>
  );

  const renderEmptyState = () => (
    <Card className="text-center py-12">
      <h3 className="text-lg font-medium text-gray-900">No companies found</h3>
      <p className="mt-2 text-gray-500">
        {hasActiveFilters
          ? 'No companies match your filters. Try adjusting your search criteria.'
          : 'No companies have been registered yet.'}
      </p>
      {!hasActiveFilters && (
        <div className="mt-4">
          <Link href="/admin/manage">
            <Button variant="primary">Create First Company</Button>
          </Link>
        </div>
      )}
    </Card>
  );

  const renderContent = () => {
    if (isLoading && !companies) return renderLoadingState();
    if (companies && companies.data.length > 0) return renderCompaniesTable();
    return renderEmptyState();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">All Companies</h1>
        <Link href="/admin/manage">
          <Button variant="primary">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Company
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Input
              placeholder="Search companies..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <div>
            <Select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              placeholder="All Statuses"
              options={[
                { value: 'pending', label: 'Pending' },
                { value: 'approved', label: 'Approved' },
                { value: 'rejected', label: 'Rejected' },
              ]}
            />
          </div>
          <div>
            <Select
              value={countryFilter}
              onChange={(e) => {
                setCountryFilter(e.target.value);
                setPage(1);
              }}
              placeholder="All Countries"
              options={MENA_COUNTRIES.map((c) => ({ value: c, label: c }))}
            />
          </div>
        </div>
        {hasActiveFilters && (
          <div className="mt-4 flex items-center gap-2">
            <span className="text-sm text-gray-500">Active filters:</span>
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear all
            </Button>
          </div>
        )}
      </div>

      {renderContent()}

      <ConfirmDialog
        open={!!confirmDeleteId}
        title="Delete Company"
        message="Are you sure you want to delete this company?"
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => confirmDeleteId && handleDelete(confirmDeleteId)}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
