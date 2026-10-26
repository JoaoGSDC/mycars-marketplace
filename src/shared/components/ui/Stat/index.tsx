import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from '@utils/cn';

export type StatProps = HTMLAttributes<HTMLDivElement> & {
  label: string;
  value: ReactNode;
  hint?: string;
};

export function Stat({ label, value, hint, className, ...props }: StatProps) {
  return (
    <div className={cn('flex flex-col gap-1', className)} {...props}>
      <span className="text-xs font-medium uppercase tracking-[0.06em] text-text-muted">{label}</span>
      <span className="text-2xl font-semibold tabular-nums text-text">{value}</span>
      {hint ? <span className="text-xs text-text-subtle">{hint}</span> : null}
    </div>
  );
}

export type StatGroupProps = HTMLAttributes<HTMLDivElement>;

export function StatGroup({ className, children, ...props }: StatGroupProps) {
  return (
    <div className={cn('grid gap-6 sm:grid-cols-2 lg:grid-cols-4', className)} {...props}>
      {children}
    </div>
  );
}
