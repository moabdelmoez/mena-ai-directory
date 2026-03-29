'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@stackframe/stack';
import { Button, Textarea } from '@/components/ui';
import { StarRating } from './StarRating';
import { getEmailDomain, isPublicEmailDomain } from '@/lib/domain-utils';

interface ReviewFormProps {
  companyId: string;
  onSubmit: (rating: number, comment: string) => Promise<void>;
}

export function ReviewForm({ onSubmit }: ReviewFormProps) {
  const router = useRouter();
  const user = useUser();
  const connectedAccounts = user?.useConnectedAccounts() ?? [];
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const userEmail = user?.primaryEmail || '';
  const emailDomain = getEmailDomain(userEmail);
  const isPersonalEmail = userEmail ? isPublicEmailDomain(emailDomain) : false;
  const hasLinkedIn = connectedAccounts.some(a => a.provider === 'linkedin');
  const isReviewBlocked = user && isPersonalEmail && !hasLinkedIn;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (rating === 0) {
      setError('Please select a rating');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(rating, comment);
      setRating(0);
      setComment('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit review');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="bg-zinc-50 rounded-lg p-6 text-center">
        <p className="text-zinc-600">Sign in to leave a review</p>
        <Button
          variant="primary"
          className="mt-3"
          onClick={() => router.push('/handler/sign-in')}
        >
          Sign In
        </Button>
      </div>
    );
  }

  if (isReviewBlocked) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <p className="text-sm font-medium text-amber-900 mb-2">
          Reviews require a verified identity
        </p>
        <p className="text-sm text-amber-800 mb-3">
          You&apos;re signed in with <span className="font-medium">{userEmail}</span> ({emailDomain}).
          Reviews can only be submitted using a LinkedIn account or a company email address.
        </p>
        <p className="text-sm text-amber-800">
          To leave a review, sign out and sign back in with LinkedIn or your company email.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-2">
          Your Rating
        </label>
        <StarRating
          rating={rating}
          size="lg"
          interactive
          onChange={setRating}
        />
      </div>

      <Textarea
        label="Your Review (optional)"
        id="comment"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Share your experience with this company..."
        rows={4}
      />

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      <Button
        type="submit"
        variant="primary"
        isLoading={isSubmitting}
      >
        Submit Review
      </Button>
    </form>
  );
}
