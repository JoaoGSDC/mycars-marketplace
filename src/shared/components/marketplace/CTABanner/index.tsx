'use client';

import Link from 'next/link';
import type { HTMLAttributes, ReactNode } from 'react';

import { Button } from '@components/ui/Button';
import { Eyebrow } from '@components/ui/Eyebrow';
import { Rating } from '@components/ui/Rating';
import { cn } from '@utils/cn';

import styles from './styles.module.css';

export type CTABannerProps = HTMLAttributes<HTMLElement> & {
  eyebrow?: string;
  title: string;
  description: string;
  rating?: number;
  ratingLabel?: string;
  actionLabel?: string;
  href?: string;
  onAction?: () => void;
  mediaSlot?: ReactNode;
};

export function CTABanner({
  eyebrow,
  title,
  description,
  rating,
  ratingLabel = 'Avaliação dos clientes',
  actionLabel = 'Começar agora',
  href,
  onAction,
  mediaSlot,
  className,
  ...props
}: CTABannerProps) {
  const actionButton = href ? (
    <Button variant="primary" withArrow asChild>
      <Link href={href}>{actionLabel}</Link>
    </Button>
  ) : (
    <Button variant="primary" withArrow onClick={onAction}>
      {actionLabel}
    </Button>
  );

  return (
    <section className={cn(styles.ctaBanner, className)} {...props}>
      {mediaSlot ? (
        <>
          <div className={styles.ctaBanner__media} aria-hidden>
            {mediaSlot}
          </div>
          <div className={styles.ctaBanner__overlay} aria-hidden />
        </>
      ) : null}
      <div className={styles.ctaBanner__content}>
        {eyebrow ? <Eyebrow className={styles.ctaBanner__eyebrow}>{eyebrow}</Eyebrow> : null}
        {rating !== undefined ? (
          <div className={styles.ctaBanner__rating}>
            <Rating value={rating} label={ratingLabel} />
          </div>
        ) : null}
        <h2 className={styles.ctaBanner__title}>{title}</h2>
        <p className={styles.ctaBanner__description}>{description}</p>
        {actionButton}
      </div>
    </section>
  );
}
