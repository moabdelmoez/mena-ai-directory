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
        <h4 className="font-semibold text-gray-900 mb-2">{product.name}</h4>
        <p className="text-sm text-gray-600 flex-1">{product.description}</p>

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
          <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
            {onEdit && (
              <button
                onClick={() => onEdit(product)}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Edit
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(product)}
                className="text-sm text-red-600 hover:text-red-700 font-medium"
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
