import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from '@utils/cn';

import styles from './styles.module.css';

export type BentoGridProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

export function BentoGrid({ children, className, ...props }: BentoGridProps) {
  return (
    <div className={cn(styles.bentoGrid, className)} {...props}>
      {children}
    </div>
  );
}
