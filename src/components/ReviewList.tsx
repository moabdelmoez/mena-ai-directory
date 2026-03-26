'use client';

import { memo, useState } from 'react';
import Image from 'next/image';
import { Review } from '@/types';
import { StarRating } from './StarRating';
import { ReviewReplyDisplay } from './ReviewReplyDisplay';
import { ReviewReplyForm } from './ReviewReplyForm';
import { formatDate } from '@/lib/utils';
import { Button } from '@/components/ui';

interface ReviewListProps {
  reviews: Review[];
  currentUserId?: string;
  companyName?: string;
  isCompanyOwner?: boolean;
  onDelete?: (reviewId: string) => Promise<void>;
  onReply?: (reviewId: string, comment: string) => Promise<void>;
  onEditReply?: (replyId: string, comment: string) => Promise<void>;
  onDeleteReply?: (replyId: string) => Promise<void>;
}

export const ReviewList = memo(function ReviewList({
  reviews,
  currentUserId,
  companyName,
  isCompanyOwner: isOwner,
  onDelete,
  onReply,
  onEditReply,
  onDeleteReply,
}: ReviewListProps) {
  const [activeReplyReviewId, setActiveReplyReviewId] = useState<string | null>(null);

  if (reviews.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-zinc-500">No reviews yet. Be the first to review!</p>
      </div>
    );
  }

  const handleReplySubmit = async (reviewId: string, comment: string) => {
    if (!onReply) return;
    await onReply(reviewId, comment);
    setActiveReplyReviewId(null);
  };

  return (
    <div className="space-y-6">
      {reviews.map((review) => (
        <div key={review.id} className="border-b border-zinc-200 pb-6 last:border-0">
          <div className="flex items-start gap-3">
            {review.user?.avatar_url ? (
              <Image
                src={review.user.avatar_url}
                alt={review.user.name || 'User'}
                width={40}
                height={40}
                sizes="40px"
                className="rounded-full"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-zinc-200 flex items-center justify-center">
                <span className="text-zinc-600 font-medium">
                  {review.user?.name?.charAt(0).toUpperCase() || '?'}
                </span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-zinc-900">
                    {review.user?.name || 'Anonymous'}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <StarRating rating={review.rating} size="sm" />
                    <span className="text-sm text-zinc-500">
                      {formatDate(review.created_at)}
                    </span>
                  </div>
                </div>
                {currentUserId === review.user_id && onDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { onDelete(review.id).catch(console.error); }}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    Delete
                  </Button>
                )}
              </div>
              {review.comment && (
                <p className="mt-2 text-zinc-600">{review.comment}</p>
              )}
            </div>
          </div>

          {/* Reply display */}
          {review.reply && companyName && (
            <ReviewReplyDisplay
              reply={review.reply}
              companyName={companyName}
              isOwner={!!isOwner}
              onEdit={onEditReply}
              onDelete={onDeleteReply}
            />
          )}

          {/* Reply form (owner only, no existing reply) */}
          {isOwner && !review.reply && onReply && (
            activeReplyReviewId === review.id ? (
              <ReviewReplyForm
                onSubmit={(comment) => handleReplySubmit(review.id, comment)}
                onCancel={() => setActiveReplyReviewId(null)}
              />
            ) : (
              <div className="ml-[52px] mt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveReplyReviewId(review.id)}
                  className="text-blue-600 hover:text-blue-700"
                >
                  Reply
                </Button>
              </div>
            )
          )}
        </div>
      ))}
    </div>
  );
});
