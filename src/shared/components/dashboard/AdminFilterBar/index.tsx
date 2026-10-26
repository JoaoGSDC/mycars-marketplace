import type { FormEvent, ReactNode } from 'react';

import { cn } from '@utils/cn';

import styles from '../admin.module.css';

export type AdminFilterBarProps = {
  children: ReactNode;
  actions?: ReactNode;
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void;
  className?: string;
};

export function AdminFilterBar({ children, actions, onSubmit, className }: AdminFilterBarProps) {
  return (
    <form className={cn(styles.adminFilterBar, className)} onSubmit={onSubmit}>
      {children}
      {actions ? <div className={styles.adminFilterBar__actions}>{actions}</div> : null}
    </form>
  );
}
