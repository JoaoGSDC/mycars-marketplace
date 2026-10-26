import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from '@utils/cn';

import styles from './styles.module.css';

export type BrandCardProps = HTMLAttributes<HTMLElement> & {
  name: string;
  initials?: string;
  /** Selo pequeno (ex.: "Lojas verificadas"). */
  badge?: string;
  description?: string;
  vehicleCount?: number;
  footer?: ReactNode;
};

export function BrandCard({
  name,
  initials,
  badge,
  description,
  vehicleCount,
  footer,
  className,
  ...props
}: BrandCardProps) {
  const mark = initials ?? name.slice(0, 2).toUpperCase();

  return (
    <article className={cn(styles.brandCard, className)} {...props}>
      <div className={styles.brandCard__top}>
        <span className={styles.brandCard__initials} aria-hidden>
          {mark}
        </span>
        {badge ? <span className={styles.brandCard__badge}>{badge}</span> : null}
      </div>
      <div className={styles.brandCard__body}>
        <h3 className={styles.brandCard__name}>{name}</h3>
        {description ? <p className={styles.brandCard__description}>{description}</p> : null}
        {vehicleCount !== undefined ? <p className={styles.brandCard__count}>{vehicleCount} veículos</p> : null}
        {footer}
      </div>
    </article>
  );
}
