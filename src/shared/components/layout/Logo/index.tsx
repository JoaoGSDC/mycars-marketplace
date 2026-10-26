import type { HTMLAttributes } from 'react';

import { brand } from '@config/brand';
import { cn } from '@utils/cn';

import styles from './styles.module.css';

export type LogoSize = 'sm' | 'md' | 'lg';

export type LogoProps = HTMLAttributes<HTMLSpanElement> & {
  size?: LogoSize;
};

/** Última ocorrência da letra de destaque no nome da marca. */
export function splitBrandName(name: string, accentLetter: string) {
  const accentIndex = name.lastIndexOf(accentLetter);

  if (accentIndex === -1) {
    return {
      before: name,
      accent: '',
      after: '',
    };
  }

  return {
    before: name.slice(0, accentIndex),
    accent: name.charAt(accentIndex),
    after: name.slice(accentIndex + 1),
  };
}

export function Logo({ size = 'md', className, ...props }: LogoProps) {
  const parts = splitBrandName(brand.name, brand.accentLetter);

  return (
    <span className={cn(styles.logo, styles[`logo--${size}`], className)} aria-label={brand.name} {...props}>
      {parts.before}
      {parts.accent ? <span className={styles['logo__accent']}>{parts.accent}</span> : null}
      {parts.after}
    </span>
  );
}
