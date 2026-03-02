'use client';

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { SearchBox } from '@/components/SearchBox';
import { CompanyList } from '@/components/CompanyList';
import { Pagination } from '@/components/Pagination';
import { Button } from '@/components/ui';
import { MENA_COUNTRIES } from '@/constants';
import { Company, PaginatedResponse } from '@/types';

interface FilterOptions {
  tech_categories: string[];
  industries: string[];
}

function CheckboxGroup({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div>
      <p className="text-sm font-medium text-gray-700 mb-2">{label}</p>
      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
        {options.map((option) => (
          <label key={option} className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={selected.includes(option)}
              onChange={() => onToggle(option)}
              className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-600 group-hover:text-gray-900 leading-tight">{option}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [results, setResults] = useState<PaginatedResponse<Company> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({ tech_categories: [], industries: [] });

  const query = searchParams.get('q') || '';
  const hq_country = searchParams.get('hq_country') || '';
  const tech_categories_param = searchParams.get('tech_categories') || '';
  const industries_param = searchParams.get('industries') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);

  const selectedCountries = useMemo(
    () => hq_country ? hq_country.split(',').filter(Boolean) : [],
    [hq_country]
  );
  const selectedTechCategories = useMemo(
    () => tech_categories_param ? tech_categories_param.split(',').filter(Boolean) : [],
    [tech_categories_param]
  );
  const selectedIndustries = useMemo(
    () => industries_param ? industries_param.split(',').filter(Boolean) : [],
    [industries_param]
  );

  // Fetch filter options once
  useEffect(() => {
    fetch('/api/filter-options')
      .then((r) => r.json())
      .then((data) => setFilterOptions({
        tech_categories: data.tech_categories || [],
        industries: data.industries || [],
      }))
      .catch(() => {});
  }, []);

  const fetchResults = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (query) params.set('q', query);
      if (hq_country) params.set('hq_country', hq_country);
      if (tech_categories_param) params.set('tech_categories', tech_categories_param);
      if (industries_param) params.set('industries', industries_param);
      if (page > 1) params.set('page', page.toString());

      const response = await fetch(`/api/search?${params.toString()}`);
      const data = await response.json();
      setResults(data);
    } catch (err) {
      console.error('Search error:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [query, hq_country, tech_categories_param, industries_param, page]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  const toggleArrayParam = useCallback(
    (paramKey: string, currentValues: string[], value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      const next = currentValues.includes(value)
        ? currentValues.filter((v) => v !== value)
        : [...currentValues, value];

      if (next.length > 0) {
        params.set(paramKey, next.join(','));
      } else {
        params.delete(paramKey);
      }
      params.delete('page');
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

  const hasFilters = !!(hq_country || tech_categories_param || industries_param);

  const countryOptions = useMemo(() => [...MENA_COUNTRIES], []);

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
              {/* Country Filter */}
              <CheckboxGroup
                label="Country"
                options={countryOptions}
                selected={selectedCountries}
                onToggle={(v) => toggleArrayParam('hq_country', selectedCountries, v)}
              />

              {/* Tech Category Filter */}
              {filterOptions.tech_categories.length > 0 && (
                <CheckboxGroup
                  label="Tech Category"
                  options={filterOptions.tech_categories}
                  selected={selectedTechCategories}
                  onToggle={(v) => toggleArrayParam('tech_categories', selectedTechCategories, v)}
                />
              )}

              {/* Industry Filter */}
              {filterOptions.industries.length > 0 && (
                <CheckboxGroup
                  label="Industry"
                  options={filterOptions.industries}
                  selected={selectedIndustries}
                  onToggle={(v) => toggleArrayParam('industries', selectedIndustries, v)}
                />
              )}
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

          {/* Error State */}
          {!isLoading && error && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center max-w-md">
                <svg
                  className="mx-auto h-12 w-12 text-red-400 mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                  />
                </svg>
                <p className="text-gray-700 mb-4">{error}</p>
                <Button variant="primary" onClick={() => fetchResults()}>
                  Try Again
                </Button>
              </div>
            </div>
          )}

          {/* Results List */}
          {!isLoading && !error && results && (
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
    <Suspense fallback={
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pulse">
        <div className="mb-8">
          <div className="h-12 bg-gray-200 rounded-xl max-w-2xl" />
        </div>
        <div className="flex flex-col lg:flex-row gap-8">
          <aside className="w-full lg:w-64 flex-shrink-0">
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <div className="h-5 bg-gray-200 rounded w-1/2" />
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-4 bg-gray-200 rounded w-2/3" />
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-4 bg-gray-200 rounded w-1/2" />
            </div>
          </aside>
          <div className="flex-1 space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-6">
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
        </div>
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}
