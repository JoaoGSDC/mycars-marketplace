import type { HTMLAttributes } from 'react';

import { cn } from '@utils/cn';

export type ImagePlaceholderProps = HTMLAttributes<HTMLDivElement> & {
  aspectRatio?: '16/9' | '4/3' | '1/1' | '3/2';
};

const aspectClasses = {
  '16/9': 'aspect-video',
  '4/3': 'aspect-[4/3]',
  '1/1': 'aspect-square',
  '3/2': 'aspect-[3/2]',
} as const;

function CarSilhouette({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M8 32h8l6-12h36l8 8h22c2.2 0 4 1.8 4 4v4H8v-4z" className="fill-text-subtle/30" />
      <path
        d="M22 20l4-6h28l6 6"
        className="stroke-text-subtle/40"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="28" cy="36" r="5" className="fill-text-subtle/50" />
      <circle cx="88" cy="36" r="5" className="fill-text-subtle/50" />
      <rect x="38" y="22" width="14" height="8" rx="1" className="fill-text-subtle/25" />
      <rect x="56" y="22" width="14" height="8" rx="1" className="fill-text-subtle/25" />
    </svg>
  );
}

export function ImagePlaceholder({ aspectRatio = '16/9', className, ...props }: ImagePlaceholderProps) {
  return (
    <div
      className={cn(
        'flex w-full items-center justify-center overflow-hidden rounded-lg bg-surface-sunken',
        aspectClasses[aspectRatio],
        className
      )}
      role="img"
      aria-label="Imagem indisponível"
      {...props}
    >
      <CarSilhouette className="w-1/3 max-w-[160px] min-w-[80px]" />
    </div>
  );
}
