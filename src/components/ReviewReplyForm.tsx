'use client';

import { useState } from 'react';
import { Button, Textarea } from '@/components/ui';

interface ReviewReplyFormProps {
  onSubmit: (comment: string) => Promise<void>;
  onCancel: () => void;
}

export function ReviewReplyForm({ onSubmit, onCancel }: ReviewReplyFormProps) {
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setIsSubmitting(true);
    try {
      await onSubmit(comment.trim());
    } catch {
      // Error handled by caller
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="ml-[52px] mt-3 bg-zinc-50 rounded-xl p-4 space-y-3">
      <Textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Write a response..."
        rows={3}
      />
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={isSubmitting || !comment.trim()}>
          {isSubmitting ? 'Submitting...' : 'Submit Reply'}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
