import type { ReactNode } from 'react';

import { cn } from '@utils/cn';

import styles from '../admin.module.css';

export type AdminSectionProps = {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Estica o corpo da seção (ex.: galeria de fotos). */
  fill?: boolean;
  titleAs?: 'h2' | 'h3';
};

export function AdminSection({
  title,
  description,
  children,
  className,
  fill = false,
  titleAs: TitleTag = 'h2',
}: AdminSectionProps) {
  return (
    <section
      className={cn(styles.adminSection, fill && styles['adminSection--fill'], className)}
    >
      <TitleTag className={styles.adminSection__title}>{title}</TitleTag>
      {description ? <div className={styles.adminSection__description}>{description}</div> : null}
      <div
        className={cn(styles.adminSection__body, fill && styles['adminSection__body--fill'])}
      >
        {children}
      </div>
    </section>
  );
}
