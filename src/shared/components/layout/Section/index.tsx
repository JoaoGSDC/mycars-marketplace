import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from '@utils/cn';

import styles from './styles.module.css';

export type SectionTheme = 'light' | 'dark';
export type SectionSpacing = 'default' | 'compact';

export type SectionProps = HTMLAttributes<HTMLElement> & {
  theme?: SectionTheme;
  container?: boolean;
  spacing?: SectionSpacing;
  children: ReactNode;
};

export function Section({
  theme = 'light',
  container = false,
  spacing = 'default',
  className,
  children,
  ...props
}: SectionProps) {
  return (
    <section
      data-theme={theme}
      className={cn(
        styles.section,
        spacing === 'compact' ? styles['section--spacingCompact'] : styles['section--spacingDefault'],
        className
      )}
      {...props}
    >
      {container ? <div className={styles['section__container']}>{children}</div> : children}
    </section>
  );
}
