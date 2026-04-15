'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@stackframe/stack';
import { Button } from '@/components/ui';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { extractDomain, getEmailDomain, emailMatchesCompanyDomain } from '@/lib/domain-utils';

interface ClaimProfileModalProps {
  companyId: string;
  companySlug: string;
  companyUrl: string;
  open: boolean;
  onClose: () => void;
  onClaimed?: () => void;
}

const PENDING_CLAIM_KEY = 'pendingClaim';

type Step = 'prompt' | 'confirming' | 'success' | 'error';

function ClaimProfileModal({ companyId, companySlug, companyUrl, open, onClose, onClaimed }: ClaimProfileModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const user = useUser();
  const [step, setStep] = useState<Step>('prompt');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const companyDomain = extractDomain(companyUrl);
  const userEmail = user?.primaryEmail || '';
  const userEmailDomain = getEmailDomain(userEmail);
  const domainMatches = userEmail ? emailMatchesCompanyDomain(companyUrl, userEmail) : false;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
      setStep('prompt');
      setError('');
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // Check for pending claim on mount
  useEffect(() => {
    if (!user || !open) return;

    try {
      const pending = localStorage.getItem(PENDING_CLAIM_KEY);
      if (pending) {
        const { companyId: pendingCompanyId } = JSON.parse(pending);
        if (pendingCompanyId === companyId && domainMatches) {
          localStorage.removeItem(PENDING_CLAIM_KEY);
          setStep('confirming');
        }
      }
    } catch {
      localStorage.removeItem(PENDING_CLAIM_KEY);
    }
  }, [user, open, companyId, domainMatches]);

  const handleSignOut = async () => {
    // Save pending claim so the modal auto-opens after re-sign-in
    localStorage.setItem(PENDING_CLAIM_KEY, JSON.stringify({ companyId, companySlug }));
    if (user) {
      await user.signOut();
    }
  };

  const handleCompleteClaim = async () => {
    setIsSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/claims/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: companyId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to claim profile');
      }

      localStorage.removeItem(PENDING_CLAIM_KEY);
      onClaimed?.();
      setStep('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to claim profile');
      setStep('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (step === 'success') {
      router.refresh();
    }
    onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      onCancel={handleClose}
      className="bg-transparent p-0 m-0 max-w-none max-h-none backdrop:bg-black/50 overscroll-contain"
    >
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg border border-zinc-200 p-6 w-full max-w-md">
          {step === 'success' ? (
            <>
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mb-4">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-zinc-900 mb-2">Profile Claimed!</h3>
                <p className="text-sm text-zinc-600 mb-6">
                  You now have direct edit access to this company profile and can manage its products.
                </p>
                <Button variant="primary" onClick={handleClose}>
                  Done
                </Button>
              </div>
            </>
          ) : step === 'error' ? (
            <>
              <h3 className="text-lg font-semibold text-zinc-900 mb-2">Claim Failed</h3>
              <p className="text-sm text-red-600 mb-6">{error}</p>
              <div className="flex items-center justify-end gap-3">
                <Button variant="outline" onClick={handleClose}>
                  Close
                </Button>
                <Button variant="primary" onClick={() => setStep('prompt')}>
                  Try Again
                </Button>
              </div>
            </>
          ) : step === 'confirming' || (step === 'prompt' && user && domainMatches) ? (
            <>
              <h3 className="text-lg font-semibold text-zinc-900 mb-2">Claim this Profile</h3>
              <p className="text-sm text-zinc-600 mb-4">
                You&apos;re signed in as <span className="font-medium">{userEmail}</span>.
                This email matches the company domain.
              </p>
              <p className="text-sm text-zinc-500 mb-6">
                Claiming this profile will give you direct edit access and display a Verified badge.
              </p>
              <div className="flex items-center justify-end gap-3">
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleCompleteClaim}
                  isLoading={isSubmitting}
                >
                  Claim Profile
                </Button>
              </div>
            </>
          ) : (
            <>
              <h3 className="text-lg font-semibold text-zinc-900 mb-2">Claim this Profile</h3>
              <p className="text-sm text-zinc-600 mb-4">
                To verify you represent this company, you need to sign in with an
                {' '}<span className="font-medium">@{companyDomain}</span> email address.
              </p>
              {user && !domainMatches && userEmail && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-amber-800 mb-3">
                    You&apos;re currently signed in as <span className="font-medium">{userEmail}</span> ({userEmailDomain}).
                  </p>
                  <ol className="text-sm text-amber-900 space-y-2 list-decimal list-inside">
                    <li>
                      <button
                        type="button"
                        onClick={handleSignOut}
                        className="text-blue-700 underline hover:text-blue-800 font-medium"
                      >
                        Sign out
                      </button>
                      {' '}of your current account
                    </li>
                    <li>Sign in with your <span className="font-medium">@{companyDomain}</span> email</li>
                    <li>Return to this page and click &quot;Claim this Profile&quot;</li>
                  </ol>
                </div>
              )}
              <div className="flex items-center justify-end gap-3">
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                {!user && (
                  <Button
                    variant="primary"
                    onClick={() => {
                      localStorage.setItem(PENDING_CLAIM_KEY, JSON.stringify({ companyId, companySlug }));
                      window.location.href = `/signin?after_auth_return_to=${encodeURIComponent(`/company/${companySlug}`)}`;
                    }}
                  >
                    Sign in to claim
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </dialog>
  );
}

/**
 * Button that opens the claim modal. Used on company detail pages
 * for unclaimed companies that have a website URL.
 */
export function ClaimProfileButton({ companyId, companySlug, companyUrl }: { companyId: string; companySlug: string; companyUrl: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [claimed, setClaimed] = useState(false);

  if (claimed) {
    return <VerifiedBadge />;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
        Claim this Profile
      </button>
      <ClaimProfileModal
        companyId={companyId}
        companySlug={companySlug}
        companyUrl={companyUrl}
        open={isOpen}
        onClose={() => setIsOpen(false)}
        onClaimed={() => setClaimed(true)}
      />
    </>
  );
}
