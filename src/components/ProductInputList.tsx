'use client';

import { useState, useId } from 'react';
import { Input, Textarea, Button } from '@/components/ui';
import { ProductInput } from '@/types';

interface ProductWithKey extends ProductInput {
  _key?: string;
}

interface ProductInputListProps {
  products: ProductInput[];
  onChange: (products: ProductInput[]) => void;
  maxProducts?: number;
}

export function ProductInputList({ products, onChange, maxProducts = 10 }: ProductInputListProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newProduct, setNewProduct] = useState<ProductWithKey>({ name: '', description: '' });
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const baseId = useId();
  const [keyCounter, setKeyCounter] = useState(0);

  // Generate a unique key for new products
  const generateKey = () => {
    setKeyCounter((c) => c + 1);
    return `${baseId}-${keyCounter}-${Date.now()}`;
  };

  // Ensure products have keys for stable rendering
  const productsWithKeys: ProductWithKey[] = products.map((p, i) => ({
    ...p,
    _key: (p as ProductWithKey)._key || `existing-${i}`,
  }));

  const handleAdd = () => {
    if (!newProduct.name.trim() || !newProduct.description.trim()) {
      return;
    }

    const productWithKey: ProductWithKey = {
      name: newProduct.name.trim(),
      description: newProduct.description.trim(),
      _key: generateKey(),
    };
    onChange([...products, productWithKey]);
    setNewProduct({ name: '', description: '' });
    setIsAdding(false);
  };

  const handleUpdate = (index: number) => {
    const product = products[index];
    if (!product.name.trim() || !product.description.trim()) {
      return;
    }

    const updated = [...products];
    updated[index] = { name: product.name.trim(), description: product.description.trim() };
    onChange(updated);
    setEditIndex(null);
  };

  const handleRemove = (index: number) => {
    onChange(products.filter((_, i) => i !== index));
  };

  const handleProductChange = (index: number, field: keyof ProductInput, value: string) => {
    const updated = [...products];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          Products (optional)
        </label>
        {products.length > 0 && (
          <span className="text-sm text-gray-500">
            {products.length} of {maxProducts}
          </span>
        )}
      </div>

      {productsWithKeys.length > 0 && (
        <div className="space-y-3">
          {productsWithKeys.map((product, index) => (
            <div
              key={product._key}
              className="border border-gray-200 rounded-lg p-4 bg-gray-50"
            >
              {editIndex === index ? (
                <div className="space-y-3">
                  <Input
                    value={product.name}
                    onChange={(e) => handleProductChange(index, 'name', e.target.value)}
                    placeholder="Product name"
                  />
                  <Textarea
                    value={product.description}
                    onChange={(e) => handleProductChange(index, 'description', e.target.value)}
                    placeholder="Product description"
                    rows={2}
                  />
                  <div className="flex gap-2 justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setEditIndex(null)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={() => handleUpdate(index)}
                    >
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 truncate">{product.name}</h4>
                    <p className="text-sm text-gray-600 line-clamp-2">{product.description}</p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => setEditIndex(index)}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemove(index)}
                      className="text-sm text-red-600 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {isAdding ? (
        <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
          <div className="space-y-3">
            <Input
              value={newProduct.name}
              onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
              placeholder="Product name"
            />
            <Textarea
              value={newProduct.description}
              onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
              placeholder="Product description"
              rows={2}
            />
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsAdding(false);
                  setNewProduct({ name: '', description: '' });
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleAdd}
                disabled={!newProduct.name.trim() || !newProduct.description.trim()}
              >
                Add
              </Button>
            </div>
          </div>
        </div>
      ) : (
        products.length < maxProducts && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsAdding(true)}
            className="w-full"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Product
          </Button>
        )
      )}

      <p className="text-xs text-gray-500">
        Add products or services offered by your company. These will be searchable in the directory.
      </p>
    </div>
  );
}
