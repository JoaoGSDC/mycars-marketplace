import type { HTMLAttributes } from 'react';

import { cn } from '@utils/cn';

export type EyebrowProps = HTMLAttributes<HTMLParagraphElement>;

export function Eyebrow({ className, children, ...props }: EyebrowProps) {
  return (
    <p
      className={cn(
        'text-xs font-semibold uppercase tracking-[0.06em] text-accent-strong',
        '[[data-theme=dark]_&]:text-text-muted',
        className
      )}
      {...props}
    >
      {'// '}
      {children}
    </p>
  );
}
