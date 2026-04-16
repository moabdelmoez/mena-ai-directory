'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Card, Button, Input, ConfirmDialog } from '@/components/ui';
import { classNames } from '@/lib/utils';

type TaxonomyType = 'tech_category' | 'industry';

interface TaxonomyRow {
  name: string;
  approvedUsage: number;
  pendingUsage: number;
  firstPendingCompany: { id: string; name: string } | null;
}

const TABS: { key: TaxonomyType; label: string }[] = [
  { key: 'industry', label: 'Industries' },
  { key: 'tech_category', label: 'Tech Categories' },
];

export default function TaxonomiesPage() {
  const [activeTab, setActiveTab] = useState<TaxonomyType>('industry');
  const [rowsByType, setRowsByType] = useState<Record<TaxonomyType, TaxonomyRow[] | null>>({
    industry: null,
    tech_category: null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ from: string; to: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TaxonomyRow | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async (type: TaxonomyType) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/taxonomies?type=${type}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to load');
      }
      const data = await res.json();
      setRowsByType((prev) => ({ ...prev, [type]: data.rows as TaxonomyRow[] }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (rowsByType[activeTab] === null) {
      load(activeTab);
    }
  }, [activeTab, rowsByType, load]);

  const rows = rowsByType[activeTab] ?? [];

  const handleRename = async () => {
    if (!editing) return;
    const to = editing.to.trim();
    if (!to || to === editing.from) {
      setEditing(null);
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/taxonomies', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: activeTab, from: editing.from, to }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Rename failed');
      }
      const data = await res.json();
      setRowsByType((prev) => ({ ...prev, [activeTab]: data.rows as TaxonomyRow[] }));
      setEditing(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Rename failed');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/taxonomies', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: activeTab, name: deleteTarget.name }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Delete failed');
      }
      const data = await res.json();
      setRowsByType((prev) => ({ ...prev, [activeTab]: data.rows as TaxonomyRow[] }));
      setDeleteTarget(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900">Taxonomies</h1>
        <p className="text-sm text-zinc-600 mt-1">
          Manage industries and tech categories. New values from pending
          registrations stay hidden until the parent company is approved.
        </p>
      </div>

      <div className="flex gap-1 border-b border-zinc-200 mb-4">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={classNames(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === tab.key
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-zinc-600 hover:text-zinc-900'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div role="alert" className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <Card padding="none" className="overflow-hidden">
        {isLoading && rows.length === 0 ? (
          <div className="p-8 text-center text-sm text-zinc-500">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-sm text-zinc-500">No values yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 border-b border-zinc-200">
              <tr className="text-left text-xs font-medium text-zinc-600 uppercase tracking-wide">
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Usage</th>
                <th className="px-4 py-2">Pending source</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const isPendingOnly = row.approvedUsage === 0 && row.pendingUsage > 0;
                return (
                  <tr key={row.name} className="border-b border-zinc-100 last:border-0">
                    <td className="px-4 py-2 font-medium text-zinc-900">{row.name}</td>
                    <td className="px-4 py-2">
                      <span
                        className={classNames(
                          'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                          isPendingOnly
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-green-100 text-green-800'
                        )}
                      >
                        {isPendingOnly ? 'Pending' : 'Approved'}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-zinc-700">
                      {row.approvedUsage}
                      {row.pendingUsage > 0 && (
                        <span className="text-zinc-500"> (+{row.pendingUsage} pending)</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-zinc-700">
                      {row.firstPendingCompany ? (
                        <Link
                          href={`/admin/manage?id=${row.firstPendingCompany.id}`}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          {row.firstPendingCompany.name}
                        </Link>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditing({ from: row.name, to: row.name })}
                          className="text-blue-600 hover:text-blue-700 text-sm"
                        >
                          Rename
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(row)}
                          className="text-red-600 hover:text-red-700 text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      {editing && (
        <dialog
          open
          className="p-0 m-0 border-0 bg-transparent max-w-none max-h-none w-full h-full fixed inset-0 z-50 flex items-center justify-center"
          onClose={() => setEditing(null)}
        >
          <div className="fixed inset-0 bg-black/30" onClick={() => setEditing(null)} />
          <div className="relative bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h2 className="text-lg font-semibold text-zinc-900 mb-4">Rename</h2>
            <p className="text-sm text-zinc-600 mb-3">
              Renaming updates every product using &ldquo;{editing.from}&rdquo;. If the new name
              already exists, the two values are merged.
            </p>
            <Input
              value={editing.to}
              onChange={(e) => setEditing({ ...editing, to: e.target.value })}
              label="New name"
            />
            <div className="flex gap-2 justify-end mt-4">
              <Button variant="outline" onClick={() => setEditing(null)} disabled={isSaving}>
                Cancel
              </Button>
              <Button onClick={handleRename} disabled={isSaving || !editing.to.trim()}>
                {isSaving ? 'Saving…' : 'Rename'}
              </Button>
            </div>
          </div>
        </dialog>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={`Delete "${deleteTarget?.name ?? ''}"?`}
        message={
          deleteTarget && deleteTarget.approvedUsage > 0
            ? `This value is used by ${deleteTarget.approvedUsage} approved company(ies). The server will block the delete — rename or reassign first.`
            : 'This will remove the value from any pending products. This cannot be undone.'
        }
        confirmLabel={isSaving ? 'Deleting…' : 'Delete'}
        variant="danger"
      />
    </div>
  );
}
