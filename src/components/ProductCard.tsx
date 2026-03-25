'use client';

import { memo } from 'react';
import { Product } from '@/types';
import { Card } from '@/components/ui';

interface ProductCardProps {
  product: Product;
  onEdit?: (product: Product) => void;
  onDelete?: (product: Product) => void;
  showActions?: boolean;
}

export const ProductCard = memo(function ProductCard({ product, onEdit, onDelete, showActions = false }: ProductCardProps) {
  return (
    <Card className="h-full">
      <div className="flex flex-col h-full">
        <h4 className="font-semibold text-zinc-900 mb-2">
          {product.product_url ? (
            <a
              href={product.product_url}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-blue-600 inline-flex items-center gap-1"
            >
              {product.name}
              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          ) : (
            product.name
          )}
        </h4>
        <p className="text-sm text-zinc-600 flex-1">{product.description}</p>

        {(product.tech_category || product.industry) && (
          <div className="flex flex-wrap gap-1 mt-3">
            {product.tech_category && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                {product.tech_category}
              </span>
            )}
            {product.industry && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                {product.industry}
              </span>
            )}
          </div>
        )}

        {showActions && (onEdit || onDelete) && (
          <div className="flex gap-2 mt-4 pt-4 border-t border-zinc-100">
            {onEdit && (
              <button
                type="button"
                onClick={() => onEdit(product)}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/20 rounded"
              >
                Edit
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(product)}
                className="text-sm text-red-600 hover:text-red-700 font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600/20 rounded"
              >
                Delete
              </button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
});
