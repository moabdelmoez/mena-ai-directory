'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

interface FilterChipsProps {
  className?: string;
}

function FilterChipsContent({ className = '' }: FilterChipsProps) {
  const searchParams = useSearchParams();
  const aiInfra = searchParams.get('ai_infrastructure') === 'true';
  const aiPlatform = searchParams.get('ai_platform') === 'true';
  const query = searchParams.get('q') || '';

  const buildUrl = (params: Record<string, string | undefined>) => {
    const newParams = new URLSearchParams();
    if (query) newParams.set('q', query);

    Object.entries(params).forEach(([key, value]) => {
      if (value) newParams.set(key, value);
    });

    return `/search?${newParams.toString()}`;
  };

  return (
    <div className={`flex flex-wrap gap-2 justify-center ${className}`}>
      <Link
        href={buildUrl({})}
        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
          !aiInfra && !aiPlatform
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        All
      </Link>
      <Link
        href={buildUrl({ ai_infrastructure: aiInfra ? undefined : 'true' })}
        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
          aiInfra
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        AI Infrastructure
      </Link>
      <Link
        href={buildUrl({ ai_platform: aiPlatform ? undefined : 'true' })}
        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
          aiPlatform
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        AI Platform
      </Link>
    </div>
  );
}

export function FilterChips({ className = '' }: FilterChipsProps) {
  return (
    <Suspense fallback={<FilterChipsFallback className={className} />}>
      <FilterChipsContent className={className} />
    </Suspense>
  );
}

function FilterChipsFallback({ className = '' }: FilterChipsProps) {
  return (
    <div className={`flex flex-wrap gap-2 justify-center ${className}`}>
      <Link
        href="/search"
        className="px-4 py-2 rounded-full text-sm font-medium bg-blue-600 text-white"
      >
        All
      </Link>
      <Link
        href="/search?ai_infrastructure=true"
        className="px-4 py-2 rounded-full text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200"
      >
        AI Infrastructure
      </Link>
      <Link
        href="/search?ai_platform=true"
        className="px-4 py-2 rounded-full text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200"
      >
        AI Platform
      </Link>
    </div>
  );
}

// Keeping the old name as an alias for backward compatibility during migration
export const CategoryChips = FilterChips;
