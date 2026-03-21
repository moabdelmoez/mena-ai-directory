'use client';

import { useState, useEffect, FormEvent, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input, Select, Textarea, Button, Card, ConfirmDialog } from '@/components/ui';
import { MENA_COUNTRIES } from '@/constants';
import { ProductInputList } from '@/components/ProductInputList';
import { ProductInput, Product } from '@/types';

interface ProductWithId extends ProductInput {
  id?: string;
  tech_category?: string | null;
  industry?: string | null;
}

interface ClassificationOptions {
  tech_categories: string[];
  industries: string[];
}

interface CompanyData {
  id: string;
  name: string;
  company_url: string | null;
  linkedin_profile: string | null;
  description: string;
  logo: string | null;
  logo_bg: 'white' | 'black' | null;
  hq_country: string;
  products: Array<Pick<Product, 'id' | 'name' | 'description' | 'product_url'> & { tech_category?: string | null; industry?: string | null }>;
}

function ManageCompanyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const companyId = searchParams.get('id');
  const isEditMode = !!companyId;

  const [isLoading, setIsLoading] = useState(isEditMode);
  const [classificationOptions, setClassificationOptions] = useState<ClassificationOptions>({
    tech_categories: [],
    industries: [],
  });
  const [formData, setFormData] = useState({
    name: '',
    company_url: '',
    linkedin_profile: '',
    description: '',
    hq_country: '',
  });
  const [products, setProducts] = useState<ProductWithId[]>([]);
  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [, setExistingLogo] = useState<string | null>(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [logoBg, setLogoBg] = useState<'white' | 'black' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState('');

  // Fetch classification options on mount
  useEffect(() => {
    fetch('/api/filter-options')
      .then((r) => r.json())
      .then((data) => {
        setClassificationOptions({
          tech_categories: data.tech_categories || [],
          industries: data.industries || [],
        });
      })
      .catch(() => {/* non-critical, leave empty */});
  }, []);

  // Fetch company data in edit mode
  useEffect(() => {
    if (!companyId) return;

    const fetchCompany = async () => {
      try {
        const response = await fetch(`/api/admin/companies/${companyId}`);
        if (!response.ok) {
          if (response.status === 401) {
            router.push('/admin/login');
            return;
          }
          throw new Error('Failed to fetch company');
        }

        const data: CompanyData = await response.json();
        setFormData({
          name: data.name,
          company_url: data.company_url || '',
          linkedin_profile: data.linkedin_profile || '',
          description: data.description,
          hq_country: data.hq_country,
        });
        setProducts(data.products.map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          product_url: p.product_url ?? null,
          tech_category: p.tech_category ?? null,
          industry: p.industry ?? null,
        })));
        if (data.logo) {
          setExistingLogo(data.logo);
          setLogoPreview(data.logo);
        }
        setLogoBg(data.logo_bg ?? null);
      } catch (err) {
        console.error('Error fetching company:', err);
        setError('Failed to load company data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCompany();
  }, [companyId, router]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const allowedTypes = ['image/png', 'image/jpeg', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        setError('Invalid logo type. Allowed: PNG, JPEG, WebP');
        return;
      }

      if (file.size > 2 * 1024 * 1024) {
        setError('Logo must be less than 2MB');
        return;
      }

      setLogo(file);
      setLogoPreview(URL.createObjectURL(file));
      setRemoveLogo(false);
      setError('');
    }
  };

  const handleRemoveLogo = () => {
    setLogo(null);
    setLogoPreview(null);
    setRemoveLogo(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name || !formData.description || !formData.hq_country) {
      setError('Please fill in all required fields (Name, Description, HQ Country)');
      return;
    }

    setIsSubmitting(true);

    try {
      const data = new FormData();
      data.append('name', formData.name);
      if (formData.company_url) {
        data.append('company_url', formData.company_url);
      }
      if (formData.linkedin_profile) {
        data.append('linkedin_profile', formData.linkedin_profile);
      }
      data.append('description', formData.description);
      data.append('hq_country', formData.hq_country);

      if (logo) {
        data.append('logo', logo);
      }
      if (removeLogo) {
        data.append('remove_logo', 'true');
      }
      data.append('logo_bg', logoBg ?? '');

      // Prepare products with IDs for edit mode
      const productsWithIds = products.map((p) => ({
        id: (p as ProductWithId).id,
        name: p.name,
        description: p.description,
        product_url: p.product_url ?? null,
        tech_category: (p as ProductWithId).tech_category ?? null,
        industry: (p as ProductWithId).industry ?? null,
      }));
      data.append('products', JSON.stringify(productsWithIds));

      const url = isEditMode
        ? `/api/admin/companies/${companyId}`
        : '/api/admin/companies';

      const response = await fetch(url, {
        method: isEditMode ? 'PUT' : 'POST',
        body: data,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save company');
      }

      router.push('/admin/companies');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save company');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setShowDeleteConfirm(false);

    try {
      const response = await fetch(`/api/admin/companies/${companyId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete company');
      }

      router.push('/admin/companies');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete company');
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-zinc-200 rounded w-1/3 mb-4" />
          <div className="h-4 bg-zinc-200 rounded w-2/3 mb-8" />
          <div className="space-y-4">
            <div className="h-10 bg-zinc-200 rounded" />
            <div className="h-10 bg-zinc-200 rounded" />
            <div className="h-32 bg-zinc-200 rounded" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">
            {isEditMode ? 'Edit Company' : 'Create Company'}
          </h1>
          <p className="text-zinc-500 mt-1">
            {isEditMode
              ? 'Update company information. Changes will be auto-approved.'
              : 'Add a new company to the directory. It will be automatically approved.'}
          </p>
        </div>
        {isEditMode && (
          <Button
            variant="ghost"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={isDeleting}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            {isDeleting ? 'Deleting...' : 'Delete Company'}
          </Button>
        )}
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Logo Upload */}
          <div>
            <label htmlFor="logo-upload" className="block text-sm font-medium text-zinc-700 mb-2">
              Company Logo
            </label>
            <div className="flex items-center gap-4">
              {logoPreview ? (
                <div
                  className={`w-20 h-20 relative rounded-lg overflow-hidden ${logoBg === 'black' ? 'bg-black' : logoBg === 'white' ? 'bg-white' : 'bg-zinc-100'}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={logoPreview}
                    alt="Logo preview"
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : (
                <div className="w-20 h-20 rounded-lg bg-zinc-100 flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-zinc-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
              )}
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleLogoChange}
                    className="hidden"
                    id="logo-upload"
                  />
                  <label htmlFor="logo-upload">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById('logo-upload')?.click()}
                    >
                      {logoPreview ? 'Change Logo' : 'Upload Logo'}
                    </Button>
                  </label>
                  {logoPreview && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveLogo}
                      className="text-red-600 hover:text-red-700"
                    >
                      Remove
                    </Button>
                  )}
                </div>
                <p className="text-xs text-zinc-500">
                  PNG, JPEG, or WebP. Max 2MB.
                </p>
              </div>
            </div>
            {logoPreview && (
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs text-zinc-500 font-medium">Logo Background:</span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setLogoBg(null)}
                    className={`px-3 py-1 text-xs rounded border ${logoBg === null ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium' : 'border-zinc-200 text-zinc-600 hover:border-zinc-300'}`}
                  >
                    Default
                  </button>
                  <button
                    type="button"
                    onClick={() => setLogoBg('white')}
                    className={`px-3 py-1 text-xs rounded border ${logoBg === 'white' ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium' : 'border-zinc-200 text-zinc-600 hover:border-zinc-300'}`}
                  >
                    White
                  </button>
                  <button
                    type="button"
                    onClick={() => setLogoBg('black')}
                    className={`px-3 py-1 text-xs rounded border ${logoBg === 'black' ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium' : 'border-zinc-200 text-zinc-600 hover:border-zinc-300'}`}
                  >
                    Black
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Basic Info Section */}
          <div className="border-t border-zinc-200 pt-6">
            <h3 className="text-lg font-medium text-zinc-900 mb-4">Basic Information</h3>
            <div className="space-y-4">
              <Input
                label="Company Name"
                id="name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter company name"
              />

              <Input
                label="Website"
                id="company_url"
                type="url"
                value={formData.company_url}
                onChange={(e) => setFormData({ ...formData, company_url: e.target.value })}
                placeholder="https://example.com"
              />

              <Input
                label="LinkedIn Profile"
                id="linkedin_profile"
                type="url"
                value={formData.linkedin_profile}
                onChange={(e) => setFormData({ ...formData, linkedin_profile: e.target.value })}
                placeholder="https://linkedin.com/company/example"
              />

              <Textarea
                label="Description"
                id="description"
                required
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe what the company does..."
                rows={4}
              />
            </div>
          </div>

          {/* Location Section */}
          <div className="border-t border-zinc-200 pt-6">
            <h3 className="text-lg font-medium text-zinc-900 mb-4">Location</h3>
            <Select
              label="Headquarters Country"
              id="hq_country"
              required
              value={formData.hq_country}
              onChange={(e) => setFormData({ ...formData, hq_country: e.target.value })}
              placeholder="Select a country"
              options={MENA_COUNTRIES.map((c) => ({ value: c, label: c }))}
            />
          </div>

          {/* Products Section */}
          <div className="border-t border-zinc-200 pt-6">
            <h3 className="text-lg font-medium text-zinc-900 mb-4">Products</h3>
            <ProductInputList
              products={products}
              onChange={setProducts}
              maxProducts={10}
              classificationOptions={classificationOptions}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="border-t border-zinc-200 pt-6 flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/admin/companies')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
            >
              {isEditMode ? 'Save Changes' : 'Create Company'}
            </Button>
          </div>
        </form>
      </Card>

      <ConfirmDialog
        open={showDeleteConfirm}
        title="Delete Company"
        message="Are you sure you want to permanently delete this company? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}

export default function ManagePage() {
  return (
    <Suspense fallback={
      <div className="max-w-3xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-zinc-200 rounded w-1/3 mb-4" />
          <div className="h-4 bg-zinc-200 rounded w-2/3 mb-8" />
          <div className="space-y-4">
            <div className="h-10 bg-zinc-200 rounded" />
            <div className="h-10 bg-zinc-200 rounded" />
            <div className="h-32 bg-zinc-200 rounded" />
          </div>
        </div>
      </div>
    }>
      <ManageCompanyForm />
    </Suspense>
  );
}
