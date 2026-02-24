'use client';

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { SearchBox } from '@/components/SearchBox';
import { CompanyList } from '@/components/CompanyList';
import { Pagination } from '@/components/Pagination';
import { Select, Button } from '@/components/ui';
import { MENA_COUNTRIES } from '@/constants';
import { Company, PaginatedResponse } from '@/types';

// Format technical value for display (e.g., gpu_compute_management -> GPU Compute Management)
const ACRONYMS = ['AI', 'GPU'];

function formatLabel(value: string): string {
  return value
    .split('_')
    .map(word => {
      const upper = word.toUpperCase();
      if (ACRONYMS.includes(upper)) {
        return upper;
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

interface FilterOptions {
  capabilities: string[];
  verticals: string[];
}

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [results, setResults] = useState<PaginatedResponse<Company> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({ capabilities: [], verticals: [] });
  const [filterOptionsLoading, setFilterOptionsLoading] = useState(true);

  const query = searchParams.get('q') || '';
  const hq_country = searchParams.get('hq_country') || '';
  const ai_infrastructure = searchParams.get('ai_infrastructure') === 'true';
  const ai_platform = searchParams.get('ai_platform') === 'true';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const derived_capabilities = searchParams.getAll('derived_capabilities');
  const domain_verticals = searchParams.getAll('domain_verticals');
  // Serialize arrays for stable dependency comparison (arrays create new references each render)
  const derivedCapabilitiesStr = derived_capabilities.join(',');
  const domainVerticalsStr = domain_verticals.join(',');

  const fetchResults = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set('q', query);
      if (hq_country) params.set('hq_country', hq_country);
      if (ai_infrastructure) params.set('ai_infrastructure', 'true');
      if (ai_platform) params.set('ai_platform', 'true');
      if (page > 1) params.set('page', page.toString());
      // Use the serialized strings to reconstruct arrays (avoids dependency array issues)
      if (derivedCapabilitiesStr) {
        derivedCapabilitiesStr.split(',').forEach((cap) => params.append('derived_capabilities', cap));
      }
      if (domainVerticalsStr) {
        domainVerticalsStr.split(',').forEach((vert) => params.append('domain_verticals', vert));
      }

      const response = await fetch(`/api/search?${params.toString()}`);
      const data = await response.json();
      setResults(data);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [query, hq_country, ai_infrastructure, ai_platform, page, derivedCapabilitiesStr, domainVerticalsStr]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  // Fetch filter options on mount
  useEffect(() => {
    async function fetchFilterOptions() {
      try {
        const response = await fetch('/api/filter-options');
        if (response.ok) {
          const data = await response.json();
          setFilterOptions(data);
        }
      } catch (error) {
        console.error('Error fetching filter options:', error);
      } finally {
        setFilterOptionsLoading(false);
      }
    }
    fetchFilterOptions();
  }, []);

  const updateFilters = useCallback(
    (key: string, value: string | string[] | boolean) => {
      const params = new URLSearchParams(searchParams.toString());

      if (Array.isArray(value)) {
        params.delete(key);
        value.forEach((v) => params.append(key, v));
      } else if (typeof value === 'boolean') {
        if (value) {
          params.set(key, 'true');
        } else {
          params.delete(key);
        }
      } else if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }

      params.delete('page'); // Reset page when filters change
      router.push(`/search?${params.toString()}`);
    },
    [searchParams, router]
  );

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', newPage.toString());
    router.push(`/search?${params.toString()}`);
  };

  const clearFilters = () => {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    router.push(`/search?${params.toString()}`);
  };

  const hasFilters = hq_country || ai_infrastructure || ai_platform || derived_capabilities.length > 0 || domain_verticals.length > 0;

  // Memoize static options to avoid recreating arrays on each render
  const countryOptions = useMemo(
    () => MENA_COUNTRIES.map((c) => ({ value: c, label: c })),
    []
  );

  // Memoized handlers for filter checkboxes
  const handleCapabilityChange = useCallback(
    (tag: string, checked: boolean) => {
      const currentCaps = searchParams.getAll('derived_capabilities');
      const newCaps = checked
        ? [...currentCaps, tag]
        : currentCaps.filter((t) => t !== tag);
      updateFilters('derived_capabilities', newCaps);
    },
    [searchParams, updateFilters]
  );

  const handleVerticalChange = useCallback(
    (industry: string, checked: boolean) => {
      const currentVerticals = searchParams.getAll('domain_verticals');
      const newVerticals = checked
        ? [...currentVerticals, industry]
        : currentVerticals.filter((i) => i !== industry);
      updateFilters('domain_verticals', newVerticals);
    },
    [searchParams, updateFilters]
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Search Header */}
      <div className="mb-8">
        <SearchBox initialQuery={query} size="sm" className="max-w-2xl" />
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Filters Sidebar */}
        <aside className="w-full lg:w-64 flex-shrink-0">
          <div className="bg-white rounded-xl border border-gray-200 p-6 sticky top-24">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Filters</h2>
              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Clear all
                </Button>
              )}
            </div>

            <div className="space-y-6">
              {/* Company Type Filters */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company Type
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={ai_infrastructure}
                      onChange={(e) => updateFilters('ai_infrastructure', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">AI Infrastructure</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={ai_platform}
                      onChange={(e) => updateFilters('ai_platform', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">AI Platform</span>
                  </label>
                </div>
              </div>

              {/* Country Filter */}
              <Select
                label="Country"
                id="hq_country"
                placeholder="All Countries"
                value={hq_country}
                onChange={(e) => updateFilters('hq_country', e.target.value)}
                options={countryOptions}
              />

              {/* Capabilities Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Capabilities
                </label>
                <div className="space-y-2">
                  {filterOptionsLoading ? (
                    <div className="text-sm text-gray-500">Loading...</div>
                  ) : filterOptions.capabilities.length === 0 ? (
                    <div className="text-sm text-gray-500">No capabilities available</div>
                  ) : (
                    filterOptions.capabilities.map((cap) => (
                      <label key={cap} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={derived_capabilities.includes(cap)}
                          onChange={(e) => handleCapabilityChange(cap, e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{formatLabel(cap)}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              {/* Verticals Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Industries
                </label>
                <div className="space-y-2">
                  {filterOptionsLoading ? (
                    <div className="text-sm text-gray-500">Loading...</div>
                  ) : filterOptions.verticals.length === 0 ? (
                    <div className="text-sm text-gray-500">No industries available</div>
                  ) : (
                    filterOptions.verticals.map((vertical) => (
                      <label key={vertical} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={domain_verticals.includes(vertical)}
                          onChange={(e) => handleVerticalChange(vertical, e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{formatLabel(vertical)}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Results */}
        <div className="flex-1">
          {/* Results Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              {query && (
                <h1 className="text-2xl font-bold text-gray-900">
                  Results for &ldquo;{query}&rdquo;
                </h1>
              )}
              {!query && (
                <h1 className="text-2xl font-bold text-gray-900">
                  Browse Companies
                </h1>
              )}
              {results && !isLoading && (
                <p className="text-gray-500 mt-1">
                  {results.total} {results.total === 1 ? 'company' : 'companies'} found
                </p>
              )}
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse"
                >
                  <div className="flex gap-4">
                    <div className="w-16 h-16 bg-gray-200 rounded-lg" />
                    <div className="flex-1">
                      <div className="h-5 bg-gray-200 rounded w-1/3 mb-2" />
                      <div className="h-4 bg-gray-200 rounded w-2/3 mb-2" />
                      <div className="h-4 bg-gray-200 rounded w-1/2" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Results List */}
          {!isLoading && results && (
            <>
              <CompanyList companies={results.data} />

              {results.totalPages > 1 && (
                <div className="mt-8">
                  <Pagination
                    currentPage={results.page}
                    totalPages={results.totalPages}
                    onPageChange={handlePageChange}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
      <SearchContent />
    </Suspense>
  );
}
