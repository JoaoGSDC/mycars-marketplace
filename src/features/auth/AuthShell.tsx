import type { ReactNode } from 'react';

import { Logo } from '@components/layout';
import { brand } from '@config/brand';

import styles from './styles.module.css';

export type AuthShellProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <div className={styles.authShell}>
      <div className={styles.authShell__card}>
        <div className={styles.authShell__brand}>
          <Logo size="md" />
          <h1 className={styles.authShell__title}>{title}</h1>
          {subtitle ? <p className={styles.authShell__subtitle}>{subtitle}</p> : null}
          <p className="sr-only">{brand.name}</p>
        </div>
        {children}
        {footer ? <div className={styles.authShell__footer}>{footer}</div> : null}
      </div>
    </div>
  );
}
