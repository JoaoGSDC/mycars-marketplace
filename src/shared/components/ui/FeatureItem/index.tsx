import type { ReactNode } from 'react';

import { cn } from '@utils/cn';

export type FeatureItemProps = {
  icon: ReactNode;
  title: string;
  description?: string;
  className?: string;
};

export function FeatureItem({ icon, title, description, className }: FeatureItemProps) {
  return (
    <div className={cn('flex gap-4', className)}>
      <div className="flex size-11 shrink-0 items-center justify-center rounded-md bg-accent-soft text-accent-strong">
        {icon}
      </div>
      <div className="flex flex-col gap-1">
        <h3 className="text-base font-semibold text-text">{title}</h3>
        {description ? <p className="text-sm text-text-muted">{description}</p> : null}
      </div>
    </div>
  );
}
