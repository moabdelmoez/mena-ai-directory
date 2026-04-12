'use client';

import { useRef, useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface FeatureShowcaseProps {
  title: string;
  description: string;
  videoSrc?: string;
  webmSrc?: string;
  imageSrc?: string;
  reverse?: boolean;
}

export function FeatureShowcase({
  title,
  description,
  videoSrc,
  webmSrc,
  imageSrc,
  reverse = false,
}: FeatureShowcaseProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (imageSrc) return;
    const video = videoRef.current;
    if (!video) return;

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    if (prefersReducedMotion) {
      video.pause();
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { threshold: 0.25 }
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, [imageSrc]);

  const mediaElement = imageSrc ? (
    <img src={imageSrc} alt={title} className="w-full h-auto block" />
  ) : (
    <video
      ref={videoRef}
      autoPlay
      muted
      loop
      playsInline
      className="w-full h-auto block"
    >
      <source src={webmSrc} type="video/webm" />
      <source src={videoSrc} type="video/mp4" />
    </video>
  );

  const mediaBlock = (
    <div className="rounded-xl overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.08)] border border-zinc-200/60 bg-[#E8E8E8]">
      {/* Title bar with traffic lights */}
      <div className="flex items-center gap-2 px-3 pt-2.5 pb-0">
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F56]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#27C93F]" />
        </div>
        <div className="ml-2 px-4 py-1 bg-[#F5F5F5] rounded-t-md text-[11px] text-zinc-400 leading-none border-t border-x border-zinc-300/40 relative top-[1px]">
          BayanBase
        </div>
      </div>

      {/* Navigation bar */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-[#F5F5F5] border-t border-zinc-300/30">
        <div className="flex items-center gap-1 text-zinc-400">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
        </div>
        <svg className="w-3.5 h-3.5 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M23 4v6h-6" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
        </svg>
        <div className="flex-1 bg-white rounded-md px-3 py-1 text-[11px] text-zinc-400 border border-zinc-200/80 truncate">
          bayanbase.com
        </div>
        <svg className="w-3.5 h-3.5 text-zinc-400 shrink-0" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
        </svg>
      </div>

      {/* Media content */}
      <div className="bg-white">
        {mediaElement}
      </div>
    </div>
  );

  const textBlock = (
    <div className="flex flex-col justify-center">
      <h2 className="text-fluid-title font-semibold tracking-tight text-zinc-800">
        {title}
      </h2>
      <p className="mt-4 text-zinc-600 text-lg leading-relaxed">
        {description}
      </p>
    </div>
  );

  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return (
      <div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          <div>{mediaBlock}</div>
          <div className={reverse ? '' : 'lg:order-first'}>{textBlock}</div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
        {/* Video is always first on mobile. On desktop, text comes first when not reversed. */}
        <div>{mediaBlock}</div>
        <div className={reverse ? '' : 'lg:order-first'}>{textBlock}</div>
      </div>
    </motion.div>
  );
}
