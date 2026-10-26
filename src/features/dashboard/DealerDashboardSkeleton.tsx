import { Skeleton } from '@components/ui';

import styles from './dashboard.module.css';

export function DealerDashboardSkeleton() {
  return (
    <div className={styles.dashboard} aria-busy="true" aria-label="Carregando dashboard">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-4 w-full max-w-lg" />
      <div className={styles.dashboard__statGrid}>
        {Array.from({ length: 9 }, (_, index) => (
          <Skeleton key={index} className="h-28 w-full rounded-lg" />
        ))}
      </div>
      <div className={styles.dashboard__kpiGrid}>
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-36 w-full rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-48 w-full rounded-lg" />
    </div>
  );
}
