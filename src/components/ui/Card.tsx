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
        'bg-white rounded-xl border border-gray-100 shadow-sm transition-shadow duration-200',
        interactive && 'hover:shadow-md cursor-pointer',
        paddings[padding],
        className
      )}
    >
      {children}
    </div>
  );
}
