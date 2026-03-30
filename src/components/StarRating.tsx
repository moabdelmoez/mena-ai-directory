'use client';

const SIZES = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
} as const;

interface StarRatingProps {
  rating: number;
  maxRating?: number;
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  onChange?: (rating: number) => void;
}

export function StarRating({
  rating,
  maxRating = 5,
  size = 'md',
  interactive = false,
  onChange,
}: StarRatingProps) {

  const handleClick = (index: number) => {
    if (interactive && onChange) {
      onChange(index + 1);
    }
  };

  const starIcon = (filled: boolean, half: boolean) => (
    <svg
      className={`${SIZES[size]} ${
        filled ? 'text-yellow-400' : half ? 'text-yellow-400' : 'text-zinc-300'
      }`}
      fill={filled || half ? 'currentColor' : 'none'}
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
      />
    </svg>
  );

  if (!interactive) {
    return (
      <div className="flex items-center gap-0.5" role="img" aria-label={`Rating: ${rating} out of ${maxRating}`}>
        {Array.from({ length: maxRating }, (_, index) => {
          const filled = index < Math.floor(rating);
          const half = index === Math.floor(rating) && rating % 1 >= 0.5;
          return (
            <span key={index} className="cursor-default" aria-hidden="true">
              {starIcon(filled, half)}
            </span>
          );
        })}
        <span className="sr-only">Rating: {rating} out of {maxRating}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-0.5" role="radiogroup" aria-label={`Rating: select 1 to ${maxRating}`}>
      {Array.from({ length: maxRating }, (_, index) => {
        const filled = index < Math.floor(rating);
        const half = index === Math.floor(rating) && rating % 1 >= 0.5;

        return (
          <button
            key={index}
            type="button"
            onClick={() => handleClick(index)}
            aria-label={`Rate ${index + 1} out of ${maxRating}`}
            className="cursor-pointer hover:scale-110 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/20 rounded"
          >
            {starIcon(filled, half)}
          </button>
        );
      })}
    </div>
  );
}
