'use client';

import { useState, useEffect, useCallback, useMemo, useRef, Suspense, memo } from 'react';
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

const AccordionFilter = memo(function AccordionFilter({
  label,
  options,
  selected,
  onToggle,
  isOpen,
  onToggleOpen,
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
  isOpen: boolean;
  onToggleOpen: () => void;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggleOpen}
        className="flex items-center justify-between w-full py-1 group"
      >
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 group-hover:text-zinc-700 flex items-center gap-2">
          {label}
          {selected.length > 0 && (
            <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-blue-600 text-white text-[10px] font-medium normal-case tracking-normal">
              {selected.length}
            </span>
          )}
        </span>
        <svg
          className={`w-4 h-4 text-zinc-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 mt-2">
          {options.map((option) => (
            <label key={option} className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={selected.includes(option)}
                onChange={() => onToggle(option)}
                className="h-3.5 w-3.5 rounded border-zinc-300 text-blue-600 focus:ring-blue-600"
              />
              <span className="text-sm text-zinc-600 group-hover:text-zinc-900 leading-tight">{option}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
});

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [results, setResults] = useState<PaginatedResponse<Company> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({ tech_categories: [], industries: [] });
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [openFilter, setOpenFilter] = useState<string | null>(null);
  const resultCache = useRef(new Map<string, PaginatedResponse<Company>>());

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

  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchResults = useCallback(async () => {
    // Abort any in-flight request
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (query) params.set('q', query);
      if (hq_country) params.set('hq_country', hq_country);
      if (tech_categories_param) params.set('tech_categories', tech_categories_param);
      if (industries_param) params.set('industries', industries_param);
      if (page > 1) params.set('page', page.toString());

      const cacheKey = params.toString();
      const cached = resultCache.current.get(cacheKey);
      if (cached) {
        setResults(cached);
        setIsLoading(false);
        return;
      }

      const response = await fetch(`/api/search?${cacheKey}`, { signal: controller.signal });
      if (!response.ok) {
        throw new Error('Search failed');
      }
      const data = await response.json();
      setResults(data);
      resultCache.current.set(cacheKey, data);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError('Something went wrong. Please try again.');
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [query, hq_country, tech_categories_param, industries_param, page]);

  useEffect(() => {
    fetchResults();
    return () => { abortControllerRef.current?.abort(); };
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
        {/* Mobile Filter Toggle */}
        <div className="lg:hidden">
          <button
            type="button"
            onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
            className="flex items-center gap-2 w-full bg-white rounded-2xl border border-zinc-200/60 px-4 py-3 text-sm font-medium text-zinc-700 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
          >
            <svg className="w-5 h-5 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filters
            {hasFilters && (
              <span className="ml-auto inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-xs font-medium">
                {selectedCountries.length + selectedTechCategories.length + selectedIndustries.length}
              </span>
            )}
            <svg className={`w-4 h-4 text-zinc-400 transition-transform ${mobileFiltersOpen ? 'rotate-180' : ''} ${hasFilters ? '' : 'ml-auto'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* Filters Sidebar */}
        <aside className={`w-full lg:w-64 flex-shrink-0 ${mobileFiltersOpen ? 'block' : 'hidden'} lg:block`}>
          <div className="bg-white rounded-2xl border border-zinc-200/60 p-6 sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-zinc-900">Filters</h2>
              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Clear all
                </Button>
              )}
            </div>

            <div className="divide-y divide-zinc-100">
              {/* Country Filter */}
              <div className="py-4 first:pt-0">
                <AccordionFilter
                  label="Country"
                  options={countryOptions}
                  selected={selectedCountries}
                  onToggle={(v) => toggleArrayParam('hq_country', selectedCountries, v)}
                  isOpen={openFilter === 'country'}
                  onToggleOpen={() => setOpenFilter(openFilter === 'country' ? null : 'country')}
                />
              </div>

              {/* Tech Category Filter */}
              {filterOptions.tech_categories.length > 0 && (
                <div className="py-4">
                  <AccordionFilter
                    label="Tech Category"
                    options={filterOptions.tech_categories}
                    selected={selectedTechCategories}
                    onToggle={(v) => toggleArrayParam('tech_categories', selectedTechCategories, v)}
                    isOpen={openFilter === 'tech_category'}
                    onToggleOpen={() => setOpenFilter(openFilter === 'tech_category' ? null : 'tech_category')}
                  />
                </div>
              )}

              {/* Industry Filter */}
              {filterOptions.industries.length > 0 && (
                <div className="py-4 last:pb-0">
                  <AccordionFilter
                    label="Industry"
                    options={filterOptions.industries}
                    selected={selectedIndustries}
                    onToggle={(v) => toggleArrayParam('industries', selectedIndustries, v)}
                    isOpen={openFilter === 'industry'}
                    onToggleOpen={() => setOpenFilter(openFilter === 'industry' ? null : 'industry')}
                  />
                </div>
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
                <h1 className="text-xl sm:text-2xl font-semibold text-zinc-900">
                  Results for &ldquo;{query}&rdquo;
                </h1>
              )}
              {!query && (
                <h1 className="text-xl sm:text-2xl font-semibold text-zinc-900">
                  Browse Companies
                </h1>
              )}
              {results && !isLoading && (
                <p className="text-zinc-500 mt-1">
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
                  className="bg-white rounded-2xl border border-zinc-200/60 p-6 animate-pulse"
                >
                  <div className="flex gap-4">
                    <div className="w-16 h-16 bg-zinc-200/60 rounded-xl" />
                    <div className="flex-1">
                      <div className="h-5 bg-zinc-200/60 rounded w-1/3 mb-2" />
                      <div className="h-4 bg-zinc-200/60 rounded w-2/3 mb-2" />
                      <div className="h-4 bg-zinc-200/60 rounded w-1/2" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Error State */}
          {!isLoading && error && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="bg-white rounded-2xl border border-zinc-200/60 p-8 text-center max-w-md shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                <svg
                  className="mx-auto h-12 w-12 text-red-400 mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                  />
                </svg>
                <p className="text-zinc-700 mb-4">{error}</p>
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
          <div className="h-12 bg-zinc-200/60 rounded-2xl max-w-2xl" />
        </div>
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="lg:hidden">
            <div className="bg-white rounded-2xl border border-zinc-200/60 h-12 animate-pulse" />
          </div>
          <aside className="w-full lg:w-64 flex-shrink-0 hidden lg:block">
            <div className="bg-white rounded-2xl border border-zinc-200/60 p-6 space-y-4">
              <div className="h-5 bg-zinc-200/60 rounded w-1/2" />
              <div className="h-4 bg-zinc-200/60 rounded w-3/4" />
              <div className="h-4 bg-zinc-200/60 rounded w-2/3" />
              <div className="h-4 bg-zinc-200/60 rounded w-3/4" />
              <div className="h-4 bg-zinc-200/60 rounded w-1/2" />
            </div>
          </aside>
          <div className="flex-1 space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-zinc-200/60 p-6">
                <div className="flex gap-4">
                  <div className="w-16 h-16 bg-zinc-200/60 rounded-xl" />
                  <div className="flex-1">
                    <div className="h-5 bg-zinc-200/60 rounded w-1/3 mb-2" />
                    <div className="h-4 bg-zinc-200/60 rounded w-2/3 mb-2" />
                    <div className="h-4 bg-zinc-200/60 rounded w-1/2" />
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
