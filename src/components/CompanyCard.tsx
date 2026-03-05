'use client';

import { memo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Company, MatchingProduct } from '@/types';
import { Card } from '@/components/ui';
import { truncateText } from '@/lib/utils';
import { CompanyLogo } from './CompanyLogo';

interface CompanyCardProps {
  company: Company;
  matchingProduct?: MatchingProduct;
}

export const CompanyCard = memo(function CompanyCard({ company, matchingProduct }: CompanyCardProps) {
  return (
    <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
    <Link href={`/company/${company.slug}`}>
      <Card className="h-full" interactive>
        <div className="flex gap-4">
          <CompanyLogo logo={company.logo} name={company.name} size="sm" logo_bg={company.logo_bg} />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-lg font-semibold text-zinc-900 truncate">
                {company.name}
              </h3>
            </div>
            <p className="mt-1 text-sm text-zinc-600 line-clamp-2">
              {truncateText(company.description, 150)}
            </p>
            {matchingProduct && (
              <div className="mt-2 bg-blue-50 border border-blue-100 rounded-md px-3 py-2">
                <div className="flex items-center gap-1.5 text-xs text-blue-600 font-medium mb-0.5">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  Matching Product
                </div>
                <span className="text-sm text-zinc-900 font-medium">{matchingProduct.name}</span>
                <p className="text-xs text-zinc-600 line-clamp-1">{matchingProduct.description}</p>
              </div>
            )}
            <div className="mt-2 flex items-center justify-between text-sm text-zinc-500">
              <span>{company.hq_country}</span>
              {company.average_rating !== undefined && company.average_rating > 0 && (
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  {company.average_rating.toFixed(1)} ({company.review_count})
                </span>
              )}
            </div>
          </div>
        </div>
      </Card>
    </Link>
    </motion.div>
  );
});
