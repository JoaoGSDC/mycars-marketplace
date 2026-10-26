import type { ReactNode } from 'react';

import { cn } from '@utils/cn';

import styles from '../admin.module.css';

export type AdminPageHeaderProps = {
  title: string;
  description?: ReactNode;
  /** Ação principal (direita). */
  primaryAction?: ReactNode;
  /** Ações secundárias (antes da primary). */
  secondaryActions?: ReactNode;
  className?: string;
  /** Tag do título. Default: h1. */
  titleAs?: 'h1' | 'h2';
};

export function AdminPageHeader({
  title,
  description,
  primaryAction,
  secondaryActions,
  className,
  titleAs: TitleTag = 'h1',
}: AdminPageHeaderProps) {
  const hasActions = Boolean(primaryAction || secondaryActions);

  return (
    <header className={cn(styles.adminPageHeader, className)}>
      <div className={styles.adminPageHeader__copy}>
        <TitleTag className={styles.adminPageHeader__title}>{title}</TitleTag>
        {description ? (
          <div className={styles.adminPageHeader__description}>{description}</div>
        ) : null}
      </div>
      {hasActions ? (
        <div className={styles.adminPageHeader__actions}>
          {secondaryActions}
          {primaryAction}
        </div>
      ) : null}
    </header>
  );
}
