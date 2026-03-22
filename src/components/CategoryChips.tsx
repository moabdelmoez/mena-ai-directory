'use client';

import Link from 'next/link';

interface CategoryChipsProps {
  className?: string;
}

export function CategoryChips({ className = '' }: CategoryChipsProps) {
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
