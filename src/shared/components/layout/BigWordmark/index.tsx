import type { HTMLAttributes } from 'react';

import { brand } from '@config/brand';
import { cn } from '@utils/cn';

import { splitBrandName } from '../Logo';
import styles from './styles.module.css';

export type BigWordmarkProps = HTMLAttributes<HTMLDivElement>;

export function BigWordmark({ className, ...props }: BigWordmarkProps) {
  const parts = splitBrandName(brand.name, brand.accentLetter);

  return (
    <div className={cn(styles.bigWordmark, className)} aria-hidden {...props}>
      <p className={styles['bigWordmark__text']}>
        {parts.before}
        {parts.accent ? <span className={styles['bigWordmark__accent']}>{parts.accent}</span> : null}
        {parts.after}
      </p>
    </div>
  );
}
