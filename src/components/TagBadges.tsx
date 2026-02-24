'use client';

import { memo } from 'react';
import { Badge } from '@/components/ui';

interface TagBadgesProps {
  tags: string[];
  variant?: 'default' | 'primary';
  className?: string;
}

export const TagBadges = memo(function TagBadges({ tags, variant = 'primary', className = '' }: TagBadgesProps) {
  if (tags.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {tags.map((tag) => (
        <Badge key={tag} variant={variant} size="sm">
          {tag}
        </Badge>
      ))}
    </div>
  );
});
