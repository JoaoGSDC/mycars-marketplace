import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from '@utils/cn';

import styles from './styles.module.css';

export type StatCardProps = HTMLAttributes<HTMLElement> & {
  label: string;
  value: ReactNode;
  hint?: string;
};

export function StatCard({ label, value, hint, className, ...props }: StatCardProps) {
  return (
    <article className={cn(styles.statCard, className)} {...props}>
      <span className={styles.statCard__label}>{label}</span>
      <span className={styles.statCard__value}>{value}</span>
      {hint ? <span className={styles.statCard__hint}>{hint}</span> : null}
    </article>
  );
}
