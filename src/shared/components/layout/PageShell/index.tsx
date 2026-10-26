import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from '@utils/cn';

import styles from './styles.module.css';

export type PageShellProps = HTMLAttributes<HTMLDivElement> & {
  roundedShell?: boolean;
  children: ReactNode;
};

export function PageShell({ roundedShell = false, className, children, ...props }: PageShellProps) {
  if (roundedShell) {
    return (
      <div className={cn(styles.pageShell, styles['pageShell--roundedOuter'], className)} {...props}>
        <div className={styles['pageShell__inner']}>{children}</div>
      </div>
    );
  }

  return (
    <div className={cn(styles.pageShell, className)} {...props}>
      {children}
    </div>
  );
}
