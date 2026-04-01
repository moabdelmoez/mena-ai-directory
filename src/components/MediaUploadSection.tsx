'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ConfirmDialog } from '@/components/ui';
import { CompanyMedia } from '@/types';

interface Props {
  companyId: string;
}

const ACCEPTED_TYPES = 'image/png,image/jpeg,image/webp,video/mp4,video/webm,application/pdf';

export function MediaUploadSection({ companyId }: Props) {
  const [media, setMedia] = useState<CompanyMedia[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<CompanyMedia | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchMedia = useCallback(async () => {
    try {
      const res = await fetch(`/api/media?company_id=${companyId}`);
      if (res.ok) {
        const data = await res.json();
        setMedia(data);
      }
    } catch {
      // Non-critical — media section just stays empty
    }
  }, [companyId]);

  useEffect(() => {
    fetchMedia();
  }, [fetchMedia]);

  const uploadFile = async (file: File) => {
    setError('');
    setIsUploading(true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('company_id', companyId);

    try {
      const res = await fetch('/api/media', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Upload failed');
        return;
      }

      const newMedia = await res.json();
      setMedia((prev) => [...prev, newMedia]);
    } catch {
      setError('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      const res = await fetch(`/api/media/${deleteTarget.id}`, { method: 'DELETE' });
      if (res.ok) {
        setMedia((prev) => prev.filter((m) => m.id !== deleteTarget.id));
      } else {
        const data = await res.json();
        setError(data.error || 'Delete failed');
      }
    } catch {
      setError('Delete failed. Please try again.');
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleMoveUp = async (index: number) => {
    if (index === 0) return;
    const newOrder = [...media];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    setMedia(newOrder);

    await fetch('/api/media/reorder', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        company_id: companyId,
        media_ids: newOrder.map((m) => m.id),
      }),
    });
  };

  const handleMoveDown = async (index: number) => {
    if (index === media.length - 1) return;
    const newOrder = [...media];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    setMedia(newOrder);

    await fetch('/api/media/reorder', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        company_id: companyId,
        media_ids: newOrder.map((m) => m.id),
      }),
    });
  };

  return (
    <div>
      {/* Upload zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-zinc-300 hover:border-zinc-400'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES}
          onChange={handleFileSelect}
          className="hidden"
        />
        <svg className="w-8 h-8 mx-auto text-zinc-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
        </svg>
        {isUploading ? (
          <p className="text-sm text-blue-600 font-medium">Uploading...</p>
        ) : (
          <>
            <p className="text-sm text-zinc-600 font-medium">Drop a file here or click to browse</p>
            <p className="text-xs text-zinc-400 mt-1">PNG, JPEG, WebP (5MB) &middot; MP4, WebM (50MB) &middot; PDF (10MB)</p>
          </>
        )}
      </div>

      {/* Error */}
      {error && (
        <p className="text-sm text-red-600 mt-2" role="alert">{error}</p>
      )}

      {/* Media grid */}
      {media.length > 0 && (
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 mt-4">
          {media.map((item, index) => (
            <div key={item.id} className="relative group rounded-xl border border-zinc-200 overflow-hidden bg-zinc-50">
              {/* Thumbnail */}
              <div className="aspect-video flex items-center justify-center">
                {item.file_type === 'image' && (
                  <img
                    src={item.file_url}
                    alt={item.original_filename}
                    className="w-full h-full object-cover"
                  />
                )}
                {item.file_type === 'video' && (
                  <div className="relative w-full h-full">
                    <video src={item.file_url} className="w-full h-full object-cover" muted preload="metadata" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-black/60 flex items-center justify-center">
                        <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                )}
                {item.file_type === 'document' && (
                  <div className="flex flex-col items-center gap-1 p-3">
                    <svg className="w-10 h-10 text-red-500" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
                      <path d="M14 2v6h6" />
                    </svg>
                    <span className="text-xs text-zinc-500 truncate max-w-full">{item.original_filename}</span>
                  </div>
                )}
              </div>

              {/* File type badge */}
              <span className="absolute top-1.5 left-1.5 text-[10px] font-semibold uppercase tracking-wider bg-white/90 text-zinc-600 px-1.5 py-0.5 rounded">
                {item.file_type === 'document' ? 'PDF' : item.file_type}
              </span>

              {/* Actions (hover) */}
              <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {index > 0 && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleMoveUp(index); }}
                    className="w-7 h-7 rounded-lg bg-white/90 border border-zinc-200 flex items-center justify-center text-zinc-600 hover:bg-zinc-100"
                    title="Move up"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  </button>
                )}
                {index < media.length - 1 && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleMoveDown(index); }}
                    className="w-7 h-7 rounded-lg bg-white/90 border border-zinc-200 flex items-center justify-center text-zinc-600 hover:bg-zinc-100"
                    title="Move down"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                )}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setDeleteTarget(item); }}
                  className="w-7 h-7 rounded-lg bg-white/90 border border-zinc-200 flex items-center justify-center text-red-500 hover:bg-red-50"
                  title="Delete"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirm dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        title="Delete Media"
        message={`Delete "${deleteTarget?.original_filename}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}
