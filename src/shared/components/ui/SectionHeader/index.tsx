import type { ReactNode } from 'react';

import { Eyebrow } from '@components/ui/Eyebrow';
import { Heading } from '@components/ui/Heading';
import { cn } from '@utils/cn';

export type SectionHeaderProps = {
  eyebrow?: string;
  title: string;
  titleSecondary?: string;
  description?: string;
  actions?: ReactNode;
  align?: 'start' | 'center';
  className?: string;
};

export function SectionHeader({
  eyebrow,
  title,
  titleSecondary,
  description,
  actions,
  align = 'start',
  className,
}: SectionHeaderProps) {
  const isCenter = align === 'center';

  return (
    <div
      className={cn(
        'flex flex-col gap-6',
        isCenter ? 'items-center text-center' : 'lg:flex-row lg:items-end lg:justify-between',
        className
      )}
    >
      <div className={cn('flex flex-col gap-3', isCenter ? 'max-w-2xl items-center' : 'max-w-2xl')}>
        {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
        <Heading as="h2" secondary={titleSecondary}>
          {title}
        </Heading>
      </div>
      {description || actions ? (
        <div
          className={cn(
            'flex flex-col gap-4',
            isCenter ? 'max-w-xl items-center' : 'lg:max-w-md lg:text-right'
          )}
        >
          {description ? <p className="text-sm text-text-muted">{description}</p> : null}
          {actions ? (
            <div className={cn('flex flex-wrap gap-2', !isCenter && 'lg:justify-end')}>{actions}</div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
