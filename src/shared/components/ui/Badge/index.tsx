import { cva, type VariantProps } from 'class-variance-authority';
import { Flame } from 'lucide-react';
import type { HTMLAttributes } from 'react';

import { cn } from '@utils/cn';

const badgeVariants = cva('inline-flex items-center gap-1 font-medium', {
  variants: {
    variant: {
      neutral: 'rounded-full border border-border bg-surface px-2.5 py-0.5 text-xs text-text-muted',
      soft: 'rounded-full bg-surface-sunken px-2.5 py-0.5 text-xs text-text',
      count: 'min-w-5 justify-center rounded-full bg-accent-button px-1.5 py-0.5 text-xs text-inverse',
      offer:
        'rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-semibold uppercase tracking-[0.06em] text-accent-strong',
      dot: 'gap-1.5 text-xs text-text-muted before:size-1.5 before:shrink-0 before:rounded-full before:bg-accent before:content-[""]',
    },
  },
  defaultVariants: {
    variant: 'neutral',
  },
});

export type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>;

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {variant === 'offer' ? <Flame className="size-3.5" strokeWidth={1.5} aria-hidden /> : null}
      {children}
    </span>
  );
}
