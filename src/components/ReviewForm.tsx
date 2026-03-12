'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@stackframe/stack';
import { Button, Textarea } from '@/components/ui';
import { StarRating } from './StarRating';

interface ReviewFormProps {
  companyId: string;
  onSubmit: (rating: number, comment: string) => Promise<void>;
  existingReview?: {
    id: string;
    rating: number;
    comment: string | null;
  };
}

export function ReviewForm({ onSubmit, existingReview }: ReviewFormProps) {
  const router = useRouter();
  const user = useUser();
  const [rating, setRating] = useState(existingReview?.rating || 0);
  const [comment, setComment] = useState(existingReview?.comment || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

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
      if (!existingReview) {
        setRating(0);
        setComment('');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit review');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="bg-gray-50 rounded-lg p-6 text-center">
        <p className="text-gray-600">Sign in to leave a review</p>
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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
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
        {existingReview ? 'Update Review' : 'Submit Review'}
      </Button>
    </form>
  );
}
