'use client';

import { useState } from 'react';
import Image from 'next/image';

interface CompanyLogoProps {
  logo: string | null;
  name: string;
  size?: 'sm' | 'lg';
  interactive?: boolean;
  logo_bg?: 'white' | 'black' | null;
}

export function CompanyLogo({ logo, name, size = 'sm', interactive = false, logo_bg }: CompanyLogoProps) {
  const [imageError, setImageError] = useState(false);

  const sizeClasses = size === 'lg'
    ? 'w-24 h-24'
    : 'w-16 h-16';

  const textSizeClass = size === 'lg' ? 'text-3xl' : 'text-xl';

  const baseContainerClasses = `flex-shrink-0 ${sizeClasses} rounded-xl border border-zinc-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]`;
  const interactiveClasses = interactive
    ? 'hover:shadow-md hover:scale-[1.02] transition-all duration-200'
    : '';

  const logoBgClass = logo_bg === 'black' ? 'bg-black' : logo_bg === 'white' ? 'bg-white' : 'bg-zinc-100';

  if (logo && !imageError) {
    return (
      <div className={`${baseContainerClasses} ${interactiveClasses} relative overflow-hidden ${logoBgClass}`}>
        <Image
          src={logo}
          alt={`${name} logo`}
          fill
          sizes={size === 'lg' ? '96px' : '64px'}
          className="object-contain"
          onError={() => setImageError(true)}
        />
      </div>
    );
  }

  return (
    <div className={`${baseContainerClasses} ${interactiveClasses} bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center`}>
      <span className={`text-white font-semibold ${textSizeClass}`}>
        {name.charAt(0).toUpperCase()}
      </span>
    </div>
  );
}
