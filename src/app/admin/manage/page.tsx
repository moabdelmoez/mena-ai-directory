'use client';

import { useState, useEffect, FormEvent, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input, Select, Textarea, Button, Card } from '@/components/ui';
import { TAGS, INDUSTRIES, MENA_COUNTRIES } from '@/constants';
import { ProductInputList } from '@/components/ProductInputList';
import { ProductInput, Product } from '@/types';

interface ProductWithId extends ProductInput {
  id?: string;
}

interface CompanyData {
  id: string;
  name: string;
  website: string | null;
  description: string;
  logo: string | null;
  derived_capabilities: string[];
  domain_verticals: string[];
  hq_country: string;
  hq_region: string | null;
  ai_infrastructure: boolean;
  ai_platform: boolean;
  products: Product[];
}

function ManageCompanyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const companyId = searchParams.get('id');
  const isEditMode = !!companyId;

  const [isLoading, setIsLoading] = useState(isEditMode);
  const [formData, setFormData] = useState({
    name: '',
    website: '',
    description: '',
    derived_capabilities: [] as string[],
    domain_verticals: [] as string[],
    hq_country: '',
    hq_region: '',
    ai_infrastructure: false,
    ai_platform: false,
  });
  const [products, setProducts] = useState<ProductWithId[]>([]);
  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [, setExistingLogo] = useState<string | null>(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');

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
          website: data.website || '',
          description: data.description,
          derived_capabilities: data.derived_capabilities || [],
          domain_verticals: data.domain_verticals || [],
          hq_country: data.hq_country,
          hq_region: data.hq_region || '',
          ai_infrastructure: data.ai_infrastructure,
          ai_platform: data.ai_platform,
        });
        setProducts(data.products.map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          category: p.category || undefined,
          capabilities: p.capabilities,
          use_cases: p.use_cases,
          target_customers: p.target_customers,
          deployment: p.deployment,
          maturity: p.maturity || undefined,
          pricing_model: p.pricing_model || undefined,
        })));
        if (data.logo) {
          setExistingLogo(data.logo);
          setLogoPreview(data.logo);
        }
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
      if (formData.website) {
        data.append('website', formData.website);
      }
      data.append('description', formData.description);
      data.append('hq_country', formData.hq_country);
      if (formData.hq_region) {
        data.append('hq_region', formData.hq_region);
      }
      data.append('ai_infrastructure', formData.ai_infrastructure.toString());
      data.append('ai_platform', formData.ai_platform.toString());
      formData.derived_capabilities.forEach((cap) => data.append('derived_capabilities', cap));
      formData.domain_verticals.forEach((vert) => data.append('domain_verticals', vert));

      if (logo) {
        data.append('logo', logo);
      }
      if (removeLogo) {
        data.append('remove_logo', 'true');
      }

      // Prepare products with IDs for edit mode
      const productsWithIds = products.map((p) => ({
        id: (p as ProductWithId).id,
        name: p.name,
        description: p.description,
        category: p.category,
        capabilities: p.capabilities,
        use_cases: p.use_cases,
        target_customers: p.target_customers,
        deployment: p.deployment,
        maturity: p.maturity,
        pricing_model: p.pricing_model,
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
    if (!confirm('Are you sure you want to permanently delete this company? This action cannot be undone.')) {
      return;
    }

    setIsDeleting(true);

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
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4" />
          <div className="h-4 bg-gray-200 rounded w-2/3 mb-8" />
          <div className="space-y-4">
            <div className="h-10 bg-gray-200 rounded" />
            <div className="h-10 bg-gray-200 rounded" />
            <div className="h-32 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditMode ? 'Edit Company' : 'Create Company'}
          </h1>
          <p className="text-gray-600 mt-1">
            {isEditMode
              ? 'Update company information. Changes will be auto-approved.'
              : 'Add a new company to the directory. It will be automatically approved.'}
          </p>
        </div>
        {isEditMode && (
          <Button
            variant="ghost"
            onClick={handleDelete}
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Company Logo
            </label>
            <div className="flex items-center gap-4">
              {logoPreview ? (
                <div className="w-20 h-20 relative rounded-lg overflow-hidden bg-gray-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={logoPreview}
                    alt="Logo preview"
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : (
                <div className="w-20 h-20 rounded-lg bg-gray-100 flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-gray-400"
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
                <p className="text-xs text-gray-500">
                  PNG, JPEG, or WebP. Max 2MB.
                </p>
              </div>
            </div>
          </div>

          {/* Basic Info Section */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
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
                id="website"
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                placeholder="https://example.com"
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

          {/* Company Type Section */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Company Type</h3>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.ai_infrastructure}
                  onChange={(e) => setFormData({ ...formData, ai_infrastructure: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">AI Infrastructure Provider</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.ai_platform}
                  onChange={(e) => setFormData({ ...formData, ai_platform: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">AI Platform Provider</span>
              </label>
            </div>
          </div>

          {/* Location Section */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Location</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Headquarters Country"
                id="hq_country"
                required
                value={formData.hq_country}
                onChange={(e) => setFormData({ ...formData, hq_country: e.target.value })}
                placeholder="Select a country"
                options={MENA_COUNTRIES.map((c) => ({ value: c, label: c }))}
              />

              <Input
                label="Headquarters Region"
                id="hq_region"
                value={formData.hq_region}
                onChange={(e) => setFormData({ ...formData, hq_region: e.target.value })}
                placeholder="e.g., Dubai, Riyadh"
              />
            </div>
          </div>

          {/* Capabilities Section */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">AI Capabilities</h3>
            <p className="text-sm text-gray-500 mb-3">Select all that apply</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {TAGS.map((tag) => (
                <label key={tag} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.derived_capabilities.includes(tag)}
                    onChange={(e) => {
                      const newCaps = e.target.checked
                        ? [...formData.derived_capabilities, tag]
                        : formData.derived_capabilities.filter((t) => t !== tag);
                      setFormData({ ...formData, derived_capabilities: newCaps });
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{tag}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Industries Section */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Target Industries</h3>
            <p className="text-sm text-gray-500 mb-3">Select all that apply</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {INDUSTRIES.map((industry) => (
                <label key={industry} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.domain_verticals.includes(industry)}
                    onChange={(e) => {
                      const newVerticals = e.target.checked
                        ? [...formData.domain_verticals, industry]
                        : formData.domain_verticals.filter((i) => i !== industry);
                      setFormData({ ...formData, domain_verticals: newVerticals });
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{industry}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Products Section */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Products</h3>
            <ProductInputList
              products={products}
              onChange={setProducts}
              maxProducts={10}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="border-t border-gray-200 pt-6 flex items-center justify-between">
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
    </div>
  );
}

export default function ManagePage() {
  return (
    <Suspense fallback={
      <div className="max-w-3xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4" />
          <div className="h-4 bg-gray-200 rounded w-2/3 mb-8" />
          <div className="space-y-4">
            <div className="h-10 bg-gray-200 rounded" />
            <div className="h-10 bg-gray-200 rounded" />
            <div className="h-32 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    }>
      <ManageCompanyForm />
    </Suspense>
  );
}
