'use client';

import Link from 'next/link';

interface FilterChipsProps {
  className?: string;
}

export function FilterChips({ className = '' }: FilterChipsProps) {
  return (
    <div className={`flex flex-wrap gap-2 justify-center ${className}`}>
      <Link
        href="/search"
        className="px-4 py-2 rounded-full text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors"
      >
        Browse All Companies
      </Link>
    </div>
  );
}

// Keeping the old name as an alias for backward compatibility
export const CategoryChips = FilterChips;
