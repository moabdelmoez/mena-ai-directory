'use client';

import { classNames } from '@/lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  interactive?: boolean;
}

export function Card({ children, className, padding = 'md', interactive = false }: CardProps) {
  const paddings = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  return (
    <div
      className={classNames(
        'bg-white rounded-2xl border border-zinc-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all duration-200',
        interactive && 'hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] cursor-pointer',
        paddings[padding],
        className
      )}
    >
      {children}
    </div>
  );
}
