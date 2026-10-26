import type { HTMLAttributes } from 'react';

import { cn } from '@utils/cn';

type HeadingLevel = 'h1' | 'h2' | 'h3' | 'h4';

const headingStyles: Record<HeadingLevel, string> = {
  h1: 'text-[length:var(--text-h1)] font-semibold leading-tight tracking-tight',
  h2: 'text-[length:var(--text-h2)] font-semibold leading-tight tracking-tight',
  h3: 'text-[length:var(--text-h3)] font-semibold leading-snug',
  h4: 'text-[length:var(--text-h4)] font-semibold leading-snug',
};

export type HeadingProps = HTMLAttributes<HTMLHeadingElement> & {
  as?: HeadingLevel;
  secondary?: string;
};

export function Heading({ as: Tag = 'h2', secondary, className, children, ...props }: HeadingProps) {
  return (
    <Tag className={cn(headingStyles[Tag], 'text-text', className)} {...props}>
      {children}
      {secondary ? <span className="text-text-muted"> {secondary}</span> : null}
    </Tag>
  );
}
