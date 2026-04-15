'use client';

import { useState } from 'react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

interface RequestInfoButtonProps {
  companyId: string;
  companyName: string;
  userEmail: string | null;
  isAuthenticated: boolean;
  returnUrl: string;
}

export function RequestInfoButton({ companyId, companyName, userEmail, isAuthenticated, returnUrl }: RequestInfoButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    if (!isAuthenticated) {
      window.location.href = `/signin?after_auth_return_to=${encodeURIComponent(returnUrl)}`;
      return;
    }
    setShowConfirm(true);
  }

  async function handleConfirm() {
    setShowConfirm(false);
    setStatus('loading');
    setError(null);

    try {
      const res = await fetch('/api/info-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? `Request failed (${res.status})`);
      }

      setStatus('success');
      setTimeout(() => setStatus('idle'), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setStatus('idle');
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={status === 'loading' || status === 'success'}
        className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white rounded-xl active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed"
        style={{
          backgroundColor: status === 'success' ? '#16a34a' : '#253ba8',
          boxShadow: status === 'success'
            ? '0 4px 14px rgba(22, 163, 74, 0.35)'
            : '0 4px 14px rgba(37, 59, 168, 0.35)',
        }}
      >
        {status === 'loading' && (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {status === 'success' && (
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )}
        {status === 'success' ? 'Request Sent' : 'Request Info'}
      </button>

      {error && (
        <p className="text-xs text-red-600 mt-1">{error}</p>
      )}

      <ConfirmDialog
        open={showConfirm}
        onConfirm={handleConfirm}
        onCancel={() => setShowConfirm(false)}
        title="Request Info"
        message={`We'll share your profile (${userEmail}) with ${companyName}. Click to confirm.`}
        confirmLabel="Confirm"
      />
    </>
  );
}
