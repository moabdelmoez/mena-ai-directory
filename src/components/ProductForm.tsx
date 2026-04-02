'use client';

import { useState, FormEvent } from 'react';
import { Input, Textarea, Button } from '@/components/ui';
import { Product, ProductInput } from '@/types';

interface ProductFormProps {
  product?: Product;
  onSubmit: (data: ProductInput) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function ProductForm({ product, onSubmit, onCancel, isSubmitting = false }: ProductFormProps) {
  const [name, setName] = useState(product?.name || '');
  const [description, setDescription] = useState(product?.description || '');
  const [productUrl, setProductUrl] = useState(product?.product_url || '');
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim() || !description.trim()) {
      setError('Name and description are required');
      return;
    }

    try {
      await onSubmit({ name: name.trim(), description: description.trim(), product_url: productUrl.trim() || null });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save product');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Product Name"
        id="product-name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Enter product name…"
        required
      />

      <Textarea
        label="Product Description"
        id="product-description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Describe what this product does…"
        rows={3}
        required
      />

      <Input
        label="Product URL (optional)"
        id="product-url"
        type="url"
        value={productUrl}
        onChange={(e) => setProductUrl(e.target.value)}
        placeholder="https://…"
      />

      {error && (
        <div role="alert" className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="flex gap-3 justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" isLoading={isSubmitting}>
          {product ? 'Update Product' : 'Add Product'}
        </Button>
      </div>
    </form>
  );
}
