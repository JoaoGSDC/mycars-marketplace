import type { ReactNode } from 'react';

import { cn } from '@utils/cn';

export type EmptyStateProps = {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border bg-surface-sunken px-6 py-12 text-center',
        className
      )}
    >
      {icon ? <div className="text-text-muted">{icon}</div> : null}
      <div className="flex max-w-sm flex-col gap-2">
        <h3 className="text-base font-semibold text-text">{title}</h3>
        {description ? <p className="text-sm text-text-muted">{description}</p> : null}
      </div>
      {action ? <div>{action}</div> : null}
    </div>
  );
}
