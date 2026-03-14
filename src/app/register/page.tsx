'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useUser } from '@stackframe/stack';
import { useRouter } from 'next/navigation';
import { Input, Select, Textarea, Button, Card } from '@/components/ui';
import { MENA_COUNTRIES } from '@/constants';
import { ProductInputList } from '@/components/ProductInputList';
import { ProductInput } from '@/types';

export default function RegisterPage() {
  const user = useUser();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [formData, setFormData] = useState({
    name: '',
    company_url: '',
    linkedin_profile: '',
    description: '',
    hq_country: '',
  });
  const [products, setProducts] = useState<ProductInput[]>([]);
  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/png', 'image/jpeg', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        setError('Invalid logo type. Allowed: PNG, JPEG, WebP');
        return;
      }

      // Validate file size (2MB)
      if (file.size > 2 * 1024 * 1024) {
        setError('Logo must be less than 2MB');
        return;
      }

      setLogo(file);
      setLogoPreview(URL.createObjectURL(file));
      setError('');
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name || !formData.description || !formData.hq_country) {
      setError('Please fill in all required fields');
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
      if (products.length > 0) {
        data.append('products', JSON.stringify(products));
      }

      const response = await fetch('/api/companies', {
        method: 'POST',
        body: data,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Registration failed');
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!mounted) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
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

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-zinc-900 mb-4">Sign In Required</h1>
        <p className="text-zinc-600 mb-6">
          You need to sign in to register a company.
        </p>
        <Button
          variant="primary"
          onClick={() => router.push('/handler/sign-in')}
        >
          Sign In
        </Button>
      </div>
    );
  }

  if (success) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-6">
          <svg
            className="w-8 h-8 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-zinc-900 mb-4">
          Registration Submitted
        </h1>
        <p className="text-zinc-600 mb-6">
          Your company registration has been submitted for review.
          We&apos;ll notify you once it&apos;s approved.
        </p>
        <div className="flex gap-4 justify-center">
          <Button variant="outline" onClick={() => router.push('/dashboard')}>
            View My Submissions
          </Button>
          <Button variant="primary" onClick={() => router.push('/')}>
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-zinc-900 mb-2">Register Your Company</h1>
      <p className="text-zinc-600 mb-8">
        Fill in the details below to list your AI company in the MENA directory.
        All submissions are reviewed before publication.
      </p>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Logo Upload */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              Company Logo (optional)
            </label>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              {logoPreview ? (
                <div className="w-20 h-20 relative rounded-lg overflow-hidden bg-zinc-100">
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
              <div>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleLogoChange}
                  className="hidden"
                  id="logo-upload"
                />
                <label htmlFor="logo-upload">
                  <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById('logo-upload')?.click()}>
                    Upload Logo
                  </Button>
                </label>
                <p className="text-xs text-zinc-500 mt-1">
                  PNG, JPEG, or WebP. Max 2MB.
                </p>
              </div>
            </div>
          </div>

          {/* Basic Info */}
          <Input
            label="Company Name"
            id="name"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Enter company name"
          />

          <Input
            label="Website (optional)"
            id="company_url"
            type="url"
            value={formData.company_url}
            onChange={(e) => setFormData({ ...formData, company_url: e.target.value })}
            placeholder="https://example.com"
          />

          <Input
            label="LinkedIn Profile (optional)"
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
            placeholder="Describe what your company does..."
            rows={4}
          />

          {/* Country */}
          <Select
            label="Headquarters Country"
            id="hq_country"
            required
            value={formData.hq_country}
            onChange={(e) => setFormData({ ...formData, hq_country: e.target.value })}
            placeholder="Select a country"
            options={MENA_COUNTRIES.map((c) => ({ value: c, label: c }))}
          />

          {/* Products */}
          <ProductInputList
            products={products}
            onChange={setProducts}
            maxProducts={10}
          />

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
              {error}
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            className="w-full"
            isLoading={isSubmitting}
          >
            Submit Registration
          </Button>
        </form>
      </Card>
    </div>
  );
}
