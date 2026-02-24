'use client';

import { memo } from 'react';
import { Product } from '@/types';
import { ProductCard } from './ProductCard';

interface ProductListProps {
  products: Product[];
  onEdit?: (product: Product) => void;
  onDelete?: (product: Product) => void;
  showActions?: boolean;
  emptyMessage?: string;
}

export const ProductList = memo(function ProductList({
  products,
  onEdit,
  onDelete,
  showActions = false,
  emptyMessage = 'No products available',
}: ProductListProps) {
  if (products.length === 0) {
    return (
      <p className="text-gray-500 text-sm text-center py-4">{emptyMessage}</p>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onEdit={onEdit}
          onDelete={onDelete}
          showActions={showActions}
        />
      ))}
    </div>
  );
});
