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
