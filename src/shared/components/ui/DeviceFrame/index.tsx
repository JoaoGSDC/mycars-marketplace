import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from '@utils/cn';

import styles from './styles.module.css';

export type DeviceFrameProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  ariaLabel?: string;
};

export function DeviceFrame({ children, className, ariaLabel = 'Pré-visualização em dispositivo móvel', ...props }: DeviceFrameProps) {
  return (
    <div className={cn(styles.deviceFrame, className)} role="img" aria-label={ariaLabel} {...props}>
      <div className={styles.deviceFrame__bezel}>
        <div className={styles.deviceFrame__notch} aria-hidden />
        <div className={styles.deviceFrame__statusBar} aria-hidden>
          <span className={styles.deviceFrame__statusTime}>9:41</span>
          <span className={styles.deviceFrame__statusIcons}>
            <span className={styles.deviceFrame__statusSignal} />
            <span className={styles.deviceFrame__statusBattery} />
          </span>
        </div>
        <div className={styles.deviceFrame__screen}>{children}</div>
        <div className={styles.deviceFrame__homeIndicator} aria-hidden />
      </div>
    </div>
  );
}
