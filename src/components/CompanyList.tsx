'use client';

import { memo } from 'react';
import { Company, MatchingProduct } from '@/types';
import { CompanyCard } from './CompanyCard';
import { StaggerChildren, StaggerItem } from '@/components/ui';

interface CompanyWithMatchingProduct extends Company {
  matchingProduct?: MatchingProduct;
}

interface CompanyListProps {
  companies: CompanyWithMatchingProduct[];
  emptyMessage?: string;
}

export const CompanyList = memo(function CompanyList({ companies, emptyMessage = 'No companies found' }: CompanyListProps) {
  if (!companies || companies.length === 0) {
    return (
      <div className="text-center py-12">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
          />
        </svg>
        <h3 className="mt-4 text-lg font-medium text-gray-900">{emptyMessage}</h3>
        <p className="mt-2 text-sm text-gray-500">
          Try adjusting your search or filters to find what you&apos;re looking for.
        </p>
      </div>
    );
  }

  return (
    <StaggerChildren className="grid gap-4 sm:gap-6">
      {companies.map((company) => (
        <StaggerItem key={company.id}>
          <CompanyCard
            company={company}
            matchingProduct={company.matchingProduct}
          />
        </StaggerItem>
      ))}
    </StaggerChildren>
  );
});
