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

  const baseContainerClasses = `flex-shrink-0 ${sizeClasses} rounded-xl border border-gray-200 shadow-sm`;
  const interactiveClasses = interactive
    ? 'hover:shadow-md hover:scale-[1.02] transition-all duration-200'
    : '';

  const logoBgClass = logo_bg === 'black' ? 'bg-black' : logo_bg === 'white' ? 'bg-white' : 'bg-gray-100';

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
    <div className={`${baseContainerClasses} ${interactiveClasses} bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center`}>
      <span className={`text-white font-bold ${textSizeClass}`}>
        {name.charAt(0).toUpperCase()}
      </span>
    </div>
  );
}
