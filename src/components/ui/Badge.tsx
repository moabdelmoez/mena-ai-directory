'use client';

import { classNames } from '@/lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md';
  className?: string;
}

export function Badge({ children, variant = 'default', size = 'sm', className }: BadgeProps) {
  const variants = {
    default: 'bg-zinc-100 text-zinc-700 ring-1 ring-inset ring-zinc-200',
    primary: 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200',
    success: 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-200',
    warning: 'bg-yellow-50 text-yellow-800 ring-1 ring-inset ring-yellow-300',
    danger: 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-200',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
  };

  return (
    <span
      className={classNames(
        'inline-flex items-center font-medium rounded-full whitespace-nowrap',
        variants[variant],
        sizes[size],
        className
      )}
    >
      {children}
    </span>
  );
}
