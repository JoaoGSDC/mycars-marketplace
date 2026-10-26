import type { ReactNode } from 'react';

import { cn } from '@utils/cn';

import styles from '../admin.module.css';

export type AdminStatChipItem = {
  id: string;
  label: string;
  count: number | string;
  active?: boolean;
  onClick?: () => void;
};

export type AdminStatChipsProps = {
  items: AdminStatChipItem[];
  className?: string;
  'aria-label'?: string;
};

export function AdminStatChips({
  items,
  className,
  'aria-label': ariaLabel = 'Resumo',
}: AdminStatChipsProps) {
  return (
    <div className={cn(styles.adminStatChips, className)} role="list" aria-label={ariaLabel}>
      {items.map((item) => {
        const content: ReactNode = (
          <>
            {item.label}
            <span className={styles.adminStatChipStrong}>{item.count}</span>
          </>
        );

        if (item.onClick) {
          return (
            <button
              key={item.id}
              type="button"
              role="listitem"
              className={cn(styles.adminStatChip, item.active && styles.adminStatChipActive)}
              onClick={item.onClick}
            >
              {content}
            </button>
          );
        }

        return (
          <span
            key={item.id}
            role="listitem"
            className={cn(styles.adminStatChip, item.active && styles.adminStatChipActive)}
          >
            {content}
          </span>
        );
      })}
    </div>
  );
}
