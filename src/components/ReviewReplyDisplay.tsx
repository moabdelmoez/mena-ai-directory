'use client';

import { useState } from 'react';
import { ReviewReply } from '@/types';
import { formatDate } from '@/lib/utils';
import { Button, ConfirmDialog } from '@/components/ui';

interface ReviewReplyDisplayProps {
  reply: ReviewReply;
  companyName: string;
  isOwner: boolean;
  onEdit?: (replyId: string, comment: string) => Promise<void>;
  onDelete?: (replyId: string) => Promise<void>;
}

export function ReviewReplyDisplay({ reply, companyName, isOwner, onEdit, onDelete }: ReviewReplyDisplayProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editComment, setEditComment] = useState(reply.comment);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isEdited = reply.updated_at !== reply.created_at;

  const handleSave = async () => {
    if (!editComment.trim() || !onEdit) return;
    setIsSubmitting(true);
    try {
      await onEdit(reply.id, editComment.trim());
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to edit reply:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setIsSubmitting(true);
    try {
      await onDelete(reply.id);
    } catch (error) {
      console.error('Failed to delete reply:', error);
    } finally {
      setIsSubmitting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="ml-[52px] mt-3 bg-zinc-50 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <span className="text-sm font-medium text-gray-900">{companyName}</span>
          <span className="text-xs text-blue-600 font-medium bg-blue-50 px-1.5 py-0.5 rounded">Company Response</span>
        </div>
        {isOwner && !isEditing && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setIsEditing(true); setEditComment(reply.comment); }}
              className="text-gray-500 hover:text-gray-700"
            >
              Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              Delete
            </Button>
          </div>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-2">
          <textarea
            value={editComment}
            onChange={(e) => setEditComment(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-blue-600/20 focus:border-blue-600 outline-none resize-none"
            rows={3}
          />
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleSave} disabled={isSubmitting || !editComment.trim()}>
              {isSubmitting ? 'Saving...' : 'Save'}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)} disabled={isSubmitting}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-700">{reply.comment}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-gray-500">{formatDate(reply.created_at)}</span>
            {isEdited && <span className="text-xs text-gray-400">(edited)</span>}
          </div>
        </>
      )}

      <ConfirmDialog
        open={showDeleteConfirm}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        title="Delete Reply"
        message="Are you sure you want to delete this reply? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}
