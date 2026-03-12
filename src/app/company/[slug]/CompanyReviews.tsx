'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@stackframe/stack';
import { ReviewForm } from '@/components/ReviewForm';
import { ReviewList } from '@/components/ReviewList';
import { Review, ReviewReply } from '@/types';
import { isCompanyOwner } from '@/lib/company-permissions';

interface CompanyReviewsProps {
  companyId: string;
  companyName: string;
  companySubmittedBy: string | null;
  companyClaimedBy: string | null;
}

export function CompanyReviews({ companyId, companyName, companySubmittedBy, companyClaimedBy }: CompanyReviewsProps) {
  const user = useUser();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userReview, setUserReview] = useState<Review | null>(null);
  const [dbUserId, setDbUserId] = useState<string | null>(null);

  const isOwner = dbUserId
    ? isCompanyOwner({ submitted_by: companySubmittedBy, claimed_by: companyClaimedBy }, dbUserId)
    : false;

  // Sync Stack Auth user to get DB user ID
  useEffect(() => {
    if (!user) {
      setDbUserId(null);
      return;
    }

    async function syncUser() {
      try {
        const res = await fetch('/api/user/me');
        if (res.ok) {
          const data = await res.json();
          setDbUserId(data.id);
        }
      } catch {
        // Ignore - user may not be synced yet
      }
    }

    syncUser();
  }, [user]);

  const fetchReviews = useCallback(async () => {
    try {
      const response = await fetch(`/api/reviews?companyId=${companyId}`);
      const data = await response.json();
      setReviews(data);

      // Find user's review if logged in
      if (dbUserId) {
        const existing = data.find((r: Review) => r.user_id === dbUserId);
        setUserReview(existing || null);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setIsLoading(false);
    }
  }, [companyId, dbUserId]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const handleSubmitReview = async (rating: number, comment: string) => {
    if (userReview) {
      const response = await fetch('/api/reviews', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewId: userReview.id,
          rating,
          comment,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update review');
      }

      setReviews((prev) =>
        prev.map((r) => (r.id === userReview.id ? { ...r, rating, comment } : r))
      );
      setUserReview((prev) => (prev ? { ...prev, rating, comment } : prev));
    } else {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          rating,
          comment,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create review');
      }

      const newReview = await response.json();
      setReviews((prev) => [newReview, ...prev]);
      setUserReview(newReview);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    const response = await fetch(`/api/reviews?reviewId=${reviewId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete review');
    }

    setReviews((prev) => prev.filter((r) => r.id !== reviewId));
    if (userReview?.id === reviewId) {
      setUserReview(null);
    }
  };

  const handleReply = async (reviewId: string, comment: string) => {
    const response = await fetch('/api/review-replies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviewId, comment }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create reply');
    }

    const reply: ReviewReply = await response.json();
    setReviews((prev) =>
      prev.map((r) => (r.id === reviewId ? { ...r, reply } : r))
    );
  };

  const handleEditReply = async (replyId: string, comment: string) => {
    const response = await fetch('/api/review-replies', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ replyId, comment }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update reply');
    }

    const updatedReply: ReviewReply = await response.json();
    setReviews((prev) =>
      prev.map((r) => (r.reply?.id === replyId ? { ...r, reply: updatedReply } : r))
    );
  };

  const handleDeleteReply = async (replyId: string) => {
    const response = await fetch(`/api/review-replies?replyId=${replyId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete reply');
    }

    setReviews((prev) =>
      prev.map((r) => (r.reply?.id === replyId ? { ...r, reply: null } : r))
    );
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-24 bg-gray-200 rounded-lg" />
        <div className="h-24 bg-gray-200 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Review Form */}
      <div className="border-b border-gray-200 pb-8">
        <h3 className="font-medium text-gray-900 mb-4">
          {userReview ? 'Update Your Review' : 'Write a Review'}
        </h3>
        <ReviewForm
          companyId={companyId}
          onSubmit={handleSubmitReview}
          existingReview={
            userReview
              ? {
                  id: userReview.id,
                  rating: userReview.rating,
                  comment: userReview.comment,
                }
              : undefined
          }
        />
      </div>

      {/* Reviews List */}
      <div>
        <h3 className="font-medium text-gray-900 mb-4">
          All Reviews ({reviews.length})
        </h3>
        <ReviewList
          reviews={reviews}
          currentUserId={dbUserId || undefined}
          companyName={companyName}
          isCompanyOwner={isOwner}
          onDelete={handleDeleteReview}
          onReply={handleReply}
          onEditReply={handleEditReply}
          onDeleteReply={handleDeleteReply}
        />
      </div>
    </div>
  );
}
