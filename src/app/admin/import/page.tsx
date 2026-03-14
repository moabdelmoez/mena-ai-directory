'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Button } from '@/components/ui';

interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
}

export default function ImportPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [autoApprove, setAutoApprove] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a CSV file');
      return;
    }

    setIsImporting(true);
    setError('');
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('autoApprove', autoApprove.toString());

      const response = await fetch('/api/admin/import', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/admin/login');
          return;
        }
        const data = await response.json();
        throw new Error(data.error || 'Import failed');
      }

      const data = await response.json();
      setResult(data.results);
      setFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-zinc-900 mb-8">CSV Import</h1>

      <div className="max-w-2xl">
        <Card>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* CSV Format Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 mb-2">CSV Format</h3>
              <p className="text-sm text-blue-700 mb-2">
                Your CSV file should have the following columns:
              </p>
              <code className="text-xs bg-blue-100 px-2 py-1 rounded block overflow-x-auto">
                name,company_url,description,hq_country,logo_url
              </code>
              <p className="text-sm text-blue-700 mt-2">
                The <strong>hq_country</strong> must be a valid MENA country name. The <strong>company_url</strong> column also accepts <code>website</code> as an alias.
              </p>
            </div>

            {/* File Upload */}
            <div>
              <label htmlFor="csv-upload" className="block text-sm font-medium text-zinc-700 mb-2">
                CSV File
              </label>
              <div className="border-2 border-dashed border-zinc-300 rounded-lg p-6 text-center">
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="hidden"
                  id="csv-upload"
                />
                <label
                  htmlFor="csv-upload"
                  className="cursor-pointer"
                >
                  {file ? (
                    <div className="flex items-center justify-center gap-2">
                      <svg
                        className="w-6 h-6 text-green-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span className="text-zinc-900 font-medium">{file.name}</span>
                    </div>
                  ) : (
                    <div>
                      <svg
                        className="mx-auto h-12 w-12 text-zinc-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                        />
                      </svg>
                      <p className="mt-2 text-sm text-zinc-600">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-xs text-zinc-500">CSV files only</p>
                    </div>
                  )}
                </label>
              </div>
            </div>

            {/* Auto-approve Option */}
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={autoApprove}
                onChange={(e) => setAutoApprove(e.target.checked)}
                className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-zinc-700">
                Auto-approve imported companies
              </span>
            </label>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
                {error}
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              isLoading={isImporting}
              disabled={!file}
            >
              Import Companies
            </Button>
          </form>
        </Card>

        {/* Results */}
        {result && (
          <Card className="mt-6">
            <h3 className="font-semibold text-zinc-900 mb-4">Import Results</h3>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-green-700">{result.success}</p>
                <p className="text-sm text-green-600">Successful</p>
              </div>
              <div className="bg-red-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-red-700">{result.failed}</p>
                <p className="text-sm text-red-600">Failed</p>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div>
                <h4 className="font-medium text-zinc-900 mb-2">Errors:</h4>
                <div className="bg-zinc-50 rounded-lg p-4 max-h-48 overflow-y-auto">
                  <ul className="text-sm text-zinc-600 space-y-1">
                    {result.errors.map((err, index) => (
                      <li key={index}>{err}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
