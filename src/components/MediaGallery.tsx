'use client';

import { useState } from 'react';
import Image from 'next/image';
import { CompanyMedia } from '@/types';

interface Props {
  media: CompanyMedia[];
}

export function MediaGallery({ media }: Props) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  if (media.length === 0) return null;

  const selected = media[selectedIndex];

  return (
    <div className="flex flex-col md:flex-row gap-4">
      {/* Large preview */}
      <div className="md:w-[60%] aspect-video rounded-xl overflow-hidden bg-zinc-100 border border-zinc-200/60 relative">
        {selected.file_type === 'image' && (
          <Image
            src={selected.file_url}
            alt={selected.original_filename}
            fill
            className="object-contain"
            sizes="(max-width: 768px) 100vw, 60vw"
          />
        )}
        {selected.file_type === 'video' && (
          <video
            key={selected.id}
            src={selected.file_url}
            controls
            preload="metadata"
            className="w-full h-full object-contain"
          />
        )}
        {selected.file_type === 'document' && (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <svg className="w-16 h-16 text-red-500" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
              <path d="M14 2v6h6" />
            </svg>
            <p className="text-sm text-zinc-600 font-medium">{selected.original_filename}</p>
            <a
              href={selected.file_url}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 active:scale-[0.98] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download
            </a>
          </div>
        )}
      </div>

      {/* Thumbnail grid */}
      <div className="md:w-[40%]">
        <div className="grid grid-cols-3 gap-2">
          {media.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelectedIndex(index)}
              className={`aspect-video rounded-lg overflow-hidden border-2 transition-colors ${
                index === selectedIndex
                  ? 'border-blue-600 ring-2 ring-blue-600/20'
                  : 'border-zinc-200 hover:border-zinc-300'
              }`}
            >
              {item.file_type === 'image' && (
                <img
                  src={item.file_url}
                  alt={item.original_filename}
                  className="w-full h-full object-cover"
                />
              )}
              {item.file_type === 'video' && (
                <div className="relative w-full h-full bg-zinc-100">
                  <video src={item.file_url} className="w-full h-full object-cover" muted preload="metadata" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-6 h-6 rounded-full bg-black/60 flex items-center justify-center">
                      <svg className="w-3 h-3 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                </div>
              )}
              {item.file_type === 'document' && (
                <div className="flex flex-col items-center justify-center h-full bg-zinc-50">
                  <svg className="w-6 h-6 text-red-500" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
                    <path d="M14 2v6h6" />
                  </svg>
                  <span className="text-[10px] text-zinc-500 mt-0.5 truncate max-w-full px-1">PDF</span>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
