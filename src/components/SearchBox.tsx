'use client';

import { useState, useMemo, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

const SIZES = {
  sm: 'px-4 py-2 text-base',
  lg: 'px-6 py-4 text-lg',
} as const;

const ICON_SIZES = {
  sm: 'w-5 h-5',
  lg: 'w-6 h-6',
} as const;

interface SearchBoxProps {
  initialQuery?: string;
  size?: 'sm' | 'lg';
  className?: string;
}

export function SearchBox({ initialQuery = '', size = 'lg', className = '' }: SearchBoxProps) {
  const [query, setQuery] = useState(initialQuery);
  const [isFocused, setIsFocused] = useState(false);
  const router = useRouter();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    } else {
      router.push('/search');
    }
  };

  const glowStyle = useMemo(() => ({
    opacity: isFocused ? 0.7 : 0.3,
    animation: isFocused ? 'none' : 'glow-pulse 3s ease-in-out infinite',
  }), [isFocused]);

  return (
    <form onSubmit={handleSubmit} className={className}>
      <div className="relative">
        {/* Gradient glow layer */}
        <div
          className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-blue-600/20 via-blue-500/20 to-blue-400/20 blur-xl transition-opacity duration-300"
          style={glowStyle}
          aria-hidden="true"
        />
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
            <svg
              className={`${ICON_SIZES[size]} text-zinc-400`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
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
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Search AI companies in the Arab world…"
            aria-label="Search AI companies"
            className={`w-full ${SIZES[size]} pl-12 pr-20 rounded-2xl border border-zinc-300 bg-white text-zinc-900 placeholder-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/20 focus-visible:border-blue-600 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)] focus:shadow-[0_2px_12px_rgba(0,0,0,0.08)]`}
          />
          <button
            type="submit"
            className={`absolute inset-y-0 right-0 flex items-center pr-4 text-blue-600 hover:text-blue-700 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/30 rounded-r-2xl ${size === 'lg' ? 'text-base' : 'text-sm'}`}
          >
            Search
          </button>
        </div>
      </div>
    </form>
  );
}
