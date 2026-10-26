import type { HTMLAttributes } from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@components/ui/Avatar';
import type { StoreSummary } from '@app-types/vehicle';
import { cn } from '@utils/cn';

import styles from './styles.module.css';

export type StoreBadgeProps = HTMLAttributes<HTMLDivElement> & {
  store: StoreSummary;
  logoUrl?: string | null;
  compact?: boolean;
};

export function StoreBadge({
  store,
  logoUrl,
  compact = false,
  className,
  ...props
}: StoreBadgeProps) {
  const initials = store.logoInitials ?? store.name.slice(0, 2).toUpperCase();
  const location = `${store.city}, ${store.state}`;

  return (
    <div className={cn(styles.storeBadge, compact && styles['storeBadge--compact'], className)} {...props}>
      <Avatar className={styles.storeBadge__avatar}>
        {logoUrl ? <AvatarImage src={logoUrl} alt="" /> : null}
        <AvatarFallback className={styles.storeBadge__initials}>{initials}</AvatarFallback>
      </Avatar>
      <div className={styles.storeBadge__text}>
        <span className={styles.storeBadge__name}>{store.name}</span>
        {!compact ? <span className={styles.storeBadge__city}>{location}</span> : null}
      </div>
    </div>
  );
}
