import type { ReactNode } from 'react';

import { cn } from '@utils/cn';

import styles from '../admin.module.css';

export type AdminFormLayoutProps = {
  children: ReactNode;
  /** Resumo lateral (desktop) / colapsável no mobile. */
  summary?: ReactNode;
  /** Largura máxima do conteúdo. `full` = largura útil do painel. */
  width?: 'sm' | 'form' | 'wide' | 'full';
  /** Envolve a coluna principal em card (borda/fundo/padding). */
  card?: boolean;
  /** Estica o card principal até o fim da viewport útil. */
  fill?: boolean;
  className?: string;
};

export function AdminFormLayout({
  children,
  summary,
  width = 'form',
  card = false,
  fill = false,
  className,
}: AdminFormLayoutProps) {
  const hasSummary = Boolean(summary);

  return (
    <div
      className={cn(
        styles.adminFormLayout,
        hasSummary && styles['adminFormLayout--withSummary'],
        width === 'sm' && styles['adminFormLayout--sm'],
        width === 'wide' && styles['adminFormLayout--wide'],
        width === 'full' && styles['adminFormLayout--full'],
        fill && styles['adminFormLayout--fill'],
        className
      )}
    >
      <div
        className={cn(
          styles.adminFormLayout__main,
          card && styles['adminFormLayout__main--card'],
          fill && styles['adminFormLayout__main--fill']
        )}
      >
        {children}
      </div>
      {hasSummary ? (
        <aside className={styles.adminFormLayout__summary}>{summary}</aside>
      ) : null}
    </div>
  );
}
