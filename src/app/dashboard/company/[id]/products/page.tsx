'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@stackframe/stack';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, Button, ConfirmDialog } from '@/components/ui';
import { ProductList } from '@/components/ProductList';
import { ProductForm } from '@/components/ProductForm';
import { MediaUploadSection } from '@/components/MediaUploadSection';
import { Product, ProductInput, Company } from '@/types';

interface Props {
  params: { id: string };
}

export default function ProductManagementPage({ params }: Props) {
  const user = useUser();
  const router = useRouter();
  const companyId = params.id;

  const [company, setCompany] = useState<Company | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      // Fetch company and products in parallel
      const [companyRes, productsRes] = await Promise.all([
        fetch(`/api/companies/${companyId}`),
        fetch(`/api/products?company_id=${companyId}`),
      ]);

      if (!companyRes.ok) {
        throw new Error('Company not found');
      }
      const companyData = await companyRes.json();
      setCompany(companyData);

      if (productsRes.ok) {
        const productsData = await productsRes.json();
        setProducts(productsData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    if (!mounted) return;

    if (!user) {
      router.push('/signin');
      return;
    }

    fetchData();
  }, [mounted, user, router, fetchData]);

  const handleAddProduct = async (data: ProductInput) => {
    setIsSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, company_id: companyId }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to add product');
      }

      await fetchData();
      setIsAdding(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add product');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateProduct = async (data: ProductInput) => {
    if (!editingProduct) return;
    setIsSubmitting(true);
    setError('');
    try {
      const res = await fetch(`/api/products/${editingProduct.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to update product');
      }

      await fetchData();
      setEditingProduct(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update product');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProduct = async (product: Product) => {
    setProductToDelete(null);
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to delete product');
      }

      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete product');
    }
  };

  if (!mounted || isLoading || !user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="animate-pulse">
          <div className="h-8 bg-zinc-200 rounded w-1/3 mb-8" />
          <div className="space-y-4">
            <div className="h-24 bg-zinc-200 rounded" />
            <div className="h-24 bg-zinc-200 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (error && !company) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-zinc-900 mb-4">Error</h1>
        <p className="text-zinc-600 mb-6">{error}</p>
        <Button variant="primary" onClick={() => router.push('/dashboard')}>
          Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {/* Breadcrumb */}
      <nav className="mb-6">
        <ol className="flex items-center gap-2 text-sm text-zinc-500">
          <li>
            <Link href="/dashboard" className="hover:text-zinc-700">
              Dashboard
            </Link>
          </li>
          <li>/</li>
          <li className="text-zinc-900 font-medium">{company?.name} Products</li>
        </ol>
      </nav>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Manage Products</h1>
          <p className="text-zinc-600 mt-1">
            Add and manage products for {company?.name}
          </p>
        </div>
        {!isAdding && !editingProduct && (
          <Button variant="primary" onClick={() => setIsAdding(true)}>
            Add Product
          </Button>
        )}
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      {isAdding && (
        <Card className="mb-6">
          <h2 className="text-lg font-semibold text-zinc-900 mb-4">Add New Product</h2>
          <ProductForm
            onSubmit={handleAddProduct}
            onCancel={() => setIsAdding(false)}
            isSubmitting={isSubmitting}
          />
        </Card>
      )}

      {editingProduct && (
        <Card className="mb-6">
          <h2 className="text-lg font-semibold text-zinc-900 mb-4">Edit Product</h2>
          <ProductForm
            product={editingProduct}
            onSubmit={handleUpdateProduct}
            onCancel={() => setEditingProduct(null)}
            isSubmitting={isSubmitting}
          />
        </Card>
      )}

      {!isAdding && !editingProduct && (
        <Card>
          <h2 className="text-lg font-semibold text-zinc-900 mb-4">
            Products ({products.length})
          </h2>
          <ProductList
            products={products}
            onEdit={setEditingProduct}
            onDelete={setProductToDelete}
            showActions
            emptyMessage="No products yet. Add your first product to make it searchable in the directory."
          />
        </Card>
      )}

      {/* Media Section */}
      <Card className="mt-6">
        <h2 className="text-lg font-semibold text-zinc-900 mb-4">Media</h2>
        <MediaUploadSection companyId={companyId} />
      </Card>

      <ConfirmDialog
        open={!!productToDelete}
        title="Delete Product"
        message={`Are you sure you want to delete "${productToDelete?.name}"?`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => productToDelete && handleDeleteProduct(productToDelete)}
        onCancel={() => setProductToDelete(null)}
      />
    </div>
  );
}
