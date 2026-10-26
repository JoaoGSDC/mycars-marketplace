import Link from 'next/link';
import type { HTMLAttributes } from 'react';

import { ImagePlaceholder } from '@components/ui/ImagePlaceholder';
import { formatCount } from '@utils/format';
import { cn } from '@utils/cn';

import styles from './styles.module.css';

export type CategoryCardProps = Omit<HTMLAttributes<HTMLElement>, 'children'> & {
  label: string;
  availableCount: number;
  imageUrl?: string;
  imageAlt?: string;
  href?: string;
};

export function CategoryCard({
  label,
  availableCount,
  imageUrl,
  imageAlt,
  href,
  className,
  ...props
}: CategoryCardProps) {
  const article = (
    <article className={cn(styles.categoryCard, className)} {...props}>
      <div className={styles.categoryCard__media}>
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- URL externa opcional do consumidor
          <img src={imageUrl} alt={imageAlt ?? label} className={styles.categoryCard__image} />
        ) : (
          <ImagePlaceholder aspectRatio="3/2" className={styles.categoryCard__placeholder} />
        )}
      </div>
      <div className={styles.categoryCard__body}>
        <h3 className={styles.categoryCard__label}>{label}</h3>
        <p className={styles.categoryCard__count}>{formatCount(availableCount)} disponíveis</p>
      </div>
    </article>
  );

  if (href) {
    return (
      <Link href={href} className={styles.categoryCard__link}>
        {article}
      </Link>
    );
  }

  return article;
}
