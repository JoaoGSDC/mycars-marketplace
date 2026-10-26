import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from '@utils/cn';

import styles from './styles.module.css';

export type FilterCardVariant = 'card' | 'section';

export type FilterCardProps = HTMLAttributes<HTMLElement> & {
  title: string;
  onClear?: () => void;
  clearLabel?: string;
  /** `section` — bloco com divisor, para sidebars unificadas. */
  variant?: FilterCardVariant;
  children: ReactNode;
};

export function FilterCard({
  title,
  onClear,
  clearLabel = 'Limpar',
  variant = 'card',
  children,
  className,
  ...props
}: FilterCardProps) {
  return (
    <section
      className={cn(
        styles.filterCard,
        variant === 'section' && styles['filterCard--section'],
        className
      )}
      {...props}
    >
      <header className={styles.filterCard__header}>
        <h3 className={styles.filterCard__title}>{title}</h3>
        {onClear ? (
          <button type="button" className={styles.filterCard__clear} onClick={onClear}>
            {clearLabel}
          </button>
        ) : null}
      </header>
      <div className={styles.filterCard__body}>{children}</div>
    </section>
  );
}
