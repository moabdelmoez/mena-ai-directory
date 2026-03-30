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

  const mediaBlock = imageSrc ? (
    <div className="rounded-2xl overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.08)] border border-zinc-200/60">
      <img
        src={imageSrc}
        alt={title}
        width={2504}
        height={1276}
        className="w-full h-auto block"
      />
    </div>
  ) : (
    <div className="rounded-2xl overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.08)] border border-zinc-200/60">
      <video
        ref={videoRef}
        autoPlay
        muted
        loop
        playsInline
        className="w-full h-auto block aspect-[2504/1276]"
      >
        <source src={webmSrc} type="video/webm" />
        <source src={videoSrc} type="video/mp4" />
      </video>
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
