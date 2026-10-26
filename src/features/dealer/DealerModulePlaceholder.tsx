import type { ReactNode } from 'react';

import { EmptyState } from '@components/ui';

import styles from './module.module.css';

export type DealerModulePlaceholderProps = {
  title: string;
  description: string;
  icon?: ReactNode;
  action?: ReactNode;
};

/** Estado informativo enquanto o módulo de domínio não está pronto — sem métricas inventadas. */
export function DealerModulePlaceholder({
  title,
  description,
  icon,
  action,
}: DealerModulePlaceholderProps) {
  return (
    <div className={styles.module}>
      <EmptyState icon={icon} title={title} description={description} action={action} />
    </div>
  );
}
