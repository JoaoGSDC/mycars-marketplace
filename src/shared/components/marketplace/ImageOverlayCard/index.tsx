import type { HTMLAttributes, ReactNode } from 'react';

import { ImagePlaceholder } from '@components/ui/ImagePlaceholder';
import { cn } from '@utils/cn';

import styles from './styles.module.css';

export type ImageOverlayCardProps = HTMLAttributes<HTMLElement> & {
  title: string;
  subtitle?: string;
  imageUrl?: string;
  imageAlt?: string;
  footer?: ReactNode;
};

export function ImageOverlayCard({
  title,
  subtitle,
  imageUrl,
  imageAlt,
  footer,
  className,
  ...props
}: ImageOverlayCardProps) {
  return (
    <article className={cn(styles.imageOverlayCard, className)} {...props}>
      <div className={styles.imageOverlayCard__media}>
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt={imageAlt ?? title} className={styles.imageOverlayCard__image} />
        ) : (
          <ImagePlaceholder aspectRatio="16/9" className={styles.imageOverlayCard__placeholder} />
        )}
        <div className={styles.imageOverlayCard__overlay} />
      </div>
      <div className={styles.imageOverlayCard__content}>
        <h3 className={styles.imageOverlayCard__title}>{title}</h3>
        {subtitle ? <p className={styles.imageOverlayCard__subtitle}>{subtitle}</p> : null}
        {footer ? <div className={styles.imageOverlayCard__footer}>{footer}</div> : null}
      </div>
    </article>
  );
}
