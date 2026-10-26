'use client';

import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

import { cn } from '@utils/cn';

import styles from '../admin.module.css';

export type AdminEntitySummaryItem = {
  label: string;
  value: ReactNode;
};

export type AdminEntitySummaryProps = {
  title: string;
  subtitle?: string;
  imageUrl?: string | null;
  imageAlt?: string;
  badge?: ReactNode;
  items?: AdminEntitySummaryItem[];
  pending?: string[];
  /** No mobile, começa recolhido. Default true. */
  collapsibleOnMobile?: boolean;
  className?: string;
};

export function AdminEntitySummary({
  title,
  subtitle,
  imageUrl,
  imageAlt = '',
  badge,
  items = [],
  pending = [],
  collapsibleOnMobile = true,
  className,
}: AdminEntitySummaryProps) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className={cn(
        styles.adminEntitySummary,
        collapsibleOnMobile && styles['adminEntitySummary--collapsible'],
        open && styles['adminEntitySummary--open'],
        className
      )}
    >
      {collapsibleOnMobile ? (
        <button
          type="button"
          className={styles.adminEntitySummary__toggle}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span className={styles.adminEntitySummary__toggleLabel}>Resumo</span>
          <ChevronDown className={styles.adminEntitySummary__chevron} strokeWidth={1.5} />
        </button>
      ) : null}

      <div className={styles.adminEntitySummary__body}>
        <div className={styles.adminEntitySummary__header}>
          {imageUrl ? (
            <div className={styles.adminEntitySummary__media}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl} alt={imageAlt} className={styles.adminEntitySummary__image} />
            </div>
          ) : (
            <div className={styles.adminEntitySummary__mediaPlaceholder} aria-hidden />
          )}
          <div className={styles.adminEntitySummary__identity}>
            <p className={styles.adminEntitySummary__title}>{title}</p>
            {subtitle ? (
              <p className={styles.adminEntitySummary__subtitle}>{subtitle}</p>
            ) : null}
            {badge ? <div className={styles.adminEntitySummary__badge}>{badge}</div> : null}
          </div>
        </div>

        {items.length > 0 ? (
          <dl className={styles.adminEntitySummary__list}>
            {items.map((item) => (
              <div key={item.label} className={styles.adminEntitySummary__row}>
                <dt>{item.label}</dt>
                <dd>{item.value || '—'}</dd>
              </div>
            ))}
          </dl>
        ) : null}

        {pending.length > 0 ? (
          <div className={styles.adminEntitySummary__pending}>
            <p className={styles.adminEntitySummary__pendingTitle}>Pendências</p>
            <ul>
              {pending.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
