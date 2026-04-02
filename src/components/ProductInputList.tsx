'use client';

import { useState, useCallback, useId, useRef } from 'react';
import { Input, Textarea, Button } from '@/components/ui';
import { ProductInput } from '@/types';

interface ProductWithKey extends ProductInput {
  _key?: string;
  id?: string;
}

interface ClassificationOptions {
  tech_categories: string[];
  industries: string[];
}

const DEFAULT_PRODUCT: ProductWithKey = {
  name: '',
  description: '',
  product_url: null,
  tech_category: null,
  industry: null,
};

interface ProductInputListProps {
  products: ProductInput[];
  onChange: (products: ProductInput[]) => void;
  maxProducts?: number;
  classificationOptions?: ClassificationOptions;
}

export function ProductInputList({
  products,
  onChange,
  maxProducts = 10,
  classificationOptions,
}: ProductInputListProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newProduct, setNewProduct] = useState<ProductWithKey>(DEFAULT_PRODUCT);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const baseId = useId();
  const keyCounterRef = useRef(0);

  const generateKey = () => {
    return `${baseId}-${++keyCounterRef.current}-${Date.now()}`;
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
      product_url: newProduct.product_url?.trim() || null,
      tech_category: newProduct.tech_category ?? null,
      industry: newProduct.industry ?? null,
      _key: generateKey(),
    };
    onChange([...products, productWithKey]);
    setNewProduct(DEFAULT_PRODUCT);
    setIsAdding(false);
  };

  const handleUpdate = (index: number) => {
    const product = products[index];
    if (!product.name.trim() || !product.description.trim()) {
      return;
    }

    const updated = [...products];
    updated[index] = {
      ...(product as ProductWithKey),
      name: product.name.trim(),
      description: product.description.trim(),
      product_url: product.product_url?.trim() || null,
      tech_category: product.tech_category ?? null,
      industry: product.industry ?? null,
    };
    onChange(updated);
    setEditIndex(null);
  };

  const handleRemove = (index: number) => {
    onChange(products.filter((_, i) => i !== index));
  };

  const handleProductChange = useCallback((index: number, field: keyof ProductInput, value: string | null) => {
    const updated = [...products];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  }, [products, onChange]);

  const showClassificationFields = !!(
    classificationOptions &&
    (classificationOptions.tech_categories.length > 0 || classificationOptions.industries.length > 0)
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-zinc-700">
          Products (optional)
        </label>
        {products.length > 0 && (
          <span className="text-sm text-zinc-500">
            {products.length} of {maxProducts}
          </span>
        )}
      </div>

      {productsWithKeys.length > 0 && (
        <div className="space-y-3">
          {productsWithKeys.map((product, index) => (
            <div
              key={product._key}
              className="border border-zinc-200 rounded-lg p-4 bg-zinc-50"
            >
              {editIndex === index ? (
                <div className="space-y-3">
                  <Input
                    value={product.name}
                    onChange={(e) => handleProductChange(index, 'name', e.target.value)}
                    placeholder="Product name…"
                    aria-label="Product name"
                  />
                  <Textarea
                    value={product.description}
                    onChange={(e) => handleProductChange(index, 'description', e.target.value)}
                    placeholder="Product description…"
                    aria-label="Product description"
                    rows={2}
                  />
                  <Input
                    value={product.product_url || ''}
                    onChange={(e) => handleProductChange(index, 'product_url', e.target.value || null)}
                    placeholder="https://…"
                    type="url"
                    aria-label="Product URL"
                  />
                  {classificationOptions && (classificationOptions.tech_categories.length > 0 || classificationOptions.industries.length > 0) && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-zinc-600 mb-1">Tech Category</label>
                        <select
                          value={product.tech_category || ''}
                          onChange={(e) => handleProductChange(index, 'tech_category', e.target.value || null)}
                          className="w-full text-sm border border-zinc-300 rounded-md px-2 py-1.5 bg-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500"
                        >
                          <option value="">None</option>
                          {classificationOptions.tech_categories.map((tc) => (
                            <option key={tc} value={tc}>{tc}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-zinc-600 mb-1">Industry</label>
                        <select
                          value={product.industry || ''}
                          onChange={(e) => handleProductChange(index, 'industry', e.target.value || null)}
                          className="w-full text-sm border border-zinc-300 rounded-md px-2 py-1.5 bg-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500"
                        >
                          <option value="">None</option>
                          {classificationOptions.industries.map((ind) => (
                            <option key={ind} value={ind}>{ind}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
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
                    <h4 className="font-medium text-zinc-900 truncate">{product.name}</h4>
                    <p className="text-sm text-zinc-600 line-clamp-2">{product.description}</p>
                    {product.product_url && (
                      <a
                        href={product.product_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:text-blue-700 truncate block mt-0.5"
                      >
                        {product.product_url}
                      </a>
                    )}
                    {(product.tech_category || product.industry) && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {product.tech_category && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-blue-100 text-blue-700">
                            {product.tech_category}
                          </span>
                        )}
                        {product.industry && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-green-100 text-green-700">
                            {product.industry}
                          </span>
                        )}
                      </div>
                    )}
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
              placeholder="Product description…"
                    aria-label="Product description"
              rows={2}
            />
            <Input
              value={newProduct.product_url || ''}
              onChange={(e) => setNewProduct({ ...newProduct, product_url: e.target.value || null })}
              placeholder="https://..."
              type="url"
            />
            {showClassificationFields && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">Tech Category</label>
                  <select
                    value={newProduct.tech_category || ''}
                    onChange={(e) => setNewProduct({ ...newProduct, tech_category: e.target.value || null })}
                    className="w-full text-sm border border-zinc-300 rounded-md px-2 py-1.5 bg-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500"
                  >
                    <option value="">None</option>
                    {classificationOptions!.tech_categories.map((tc) => (
                      <option key={tc} value={tc}>{tc}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">Industry</label>
                  <select
                    value={newProduct.industry || ''}
                    onChange={(e) => setNewProduct({ ...newProduct, industry: e.target.value || null })}
                    className="w-full text-sm border border-zinc-300 rounded-md px-2 py-1.5 bg-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500"
                  >
                    <option value="">None</option>
                    {classificationOptions!.industries.map((ind) => (
                      <option key={ind} value={ind}>{ind}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsAdding(false);
                  setNewProduct(DEFAULT_PRODUCT);
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
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Product
          </Button>
        )
      )}

      <p className="text-xs text-zinc-500">
        Add products or services offered by your company. These will be searchable in the directory.
      </p>
    </div>
  );
}
