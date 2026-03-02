'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

interface SearchBoxProps {
  initialQuery?: string;
  size?: 'sm' | 'lg';
  className?: string;
}

export function SearchBox({ initialQuery = '', size = 'lg', className = '' }: SearchBoxProps) {
  const [query, setQuery] = useState(initialQuery);
  const router = useRouter();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    } else {
      router.push('/search');
    }
  };

  const sizes = {
    sm: 'px-4 py-2 text-base',
    lg: 'px-6 py-4 text-lg',
  };

  const iconSizes = {
    sm: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  return (
    <form onSubmit={handleSubmit} className={className}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
          <svg
            className={`${iconSizes[size]} text-gray-400`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search AI companies in MENA..."
          aria-label="Search AI companies"
          className={`w-full ${sizes[size]} pl-12 pr-20 rounded-xl border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow shadow-sm hover:shadow-md focus:shadow-lg`}
        />
        <button
          type="submit"
          className={`absolute inset-y-0 right-0 flex items-center pr-4 text-blue-600 hover:text-blue-700 font-medium ${size === 'lg' ? 'text-base' : 'text-sm'}`}
        >
          Search
        </button>
      </div>
    </form>
  );
}
