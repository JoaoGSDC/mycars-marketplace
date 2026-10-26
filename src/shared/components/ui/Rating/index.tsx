'use client';

import { Star } from 'lucide-react';

import { cn } from '@utils/cn';

export type RatingProps = {
  value: number;
  max?: number;
  onChange?: (value: number) => void;
  className?: string;
  label?: string;
};

export function Rating({ value, max = 5, onChange, className, label = 'Avaliação' }: RatingProps) {
  const interactive = Boolean(onChange);

  return (
    <div
      className={cn('inline-flex items-center gap-0.5', className)}
      role={interactive ? 'radiogroup' : 'img'}
      aria-label={interactive ? label : `${label}: ${value} de ${max}`}
    >
      {Array.from({ length: max }, (_, index) => {
        const starValue = index + 1;
        const filled = starValue <= Math.round(value);

        if (interactive) {
          return (
            <button
              key={starValue}
              type="button"
              role="radio"
              aria-checked={starValue === Math.round(value)}
              className="rounded-sm p-0.5 text-accent-button focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-strong"
              onClick={() => {
                onChange?.(starValue);
              }}
            >
              <Star className={cn('size-4', filled ? 'fill-accent-button' : 'fill-transparent')} strokeWidth={1.5} />
            </button>
          );
        }

        return (
          <Star
            key={starValue}
            className={cn('size-4', filled ? 'fill-accent-button text-accent-button' : 'text-border')}
            strokeWidth={1.5}
            aria-hidden
          />
        );
      })}
    </div>
  );
}
