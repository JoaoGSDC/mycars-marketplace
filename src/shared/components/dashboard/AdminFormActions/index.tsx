import type { ReactNode } from 'react';

import { cn } from '@utils/cn';

import styles from '../admin.module.css';

export type AdminFormActionsProps = {
  children: ReactNode;
  /** Fixa a barra no rodapé da área de scroll. */
  sticky?: boolean;
  className?: string;
};

export function AdminFormActions({ children, sticky = false, className }: AdminFormActionsProps) {
  return (
    <div
      className={cn(
        styles.adminFormActions,
        sticky && styles['adminFormActions--sticky'],
        className
      )}
    >
      {children}
    </div>
  );
}

export function AdminFormActionsSpacer() {
  return <div className={styles.adminFormActions__spacer} aria-hidden />;
}
