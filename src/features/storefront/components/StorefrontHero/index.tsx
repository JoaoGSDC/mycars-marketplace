import Image from 'next/image';
import type { ReactNode } from 'react';

import type { PublicStorefront } from '@app-types/vehicle';
import { Eyebrow, ImagePlaceholder } from '@components/ui';
import { cn } from '@utils/cn';

import { storefrontContent } from '../../storefront.content';
import styles from './styles.module.css';

export type StorefrontHeroProps = {
  storefront: PublicStorefront;
  /** Painel de filtros (SearchPanel) — selects, sem autocomplete. */
  searchSlot?: ReactNode;
  /** Header overlay (StorefrontHeader behavior=overlay). */
  headerSlot?: ReactNode;
  className?: string;
};

function coverFocusClass(focus?: PublicStorefront['coverFocus']): string {
  if (focus === 'top') {
    return styles['storefrontHero__image--top'];
  }

  if (focus === 'bottom') {
    return styles['storefrontHero__image--bottom'];
  }

  return styles['storefrontHero__image--center'];
}

/**
 * Hero full-bleed no padrão da home: imagem do topo, navbar overlay e filtros na base.
 */
export function StorefrontHero({
  storefront,
  searchSlot,
  headerSlot,
  className,
}: StorefrontHeroProps) {
  const copy = storefrontContent;
  const hasCover = Boolean(storefront.coverImageUrl);
  const location = `${storefront.city}, ${storefront.state}`;
  const focusClass = coverFocusClass(storefront.coverFocus);

  return (
    <div className={cn(styles.storefrontHero__shell, className)}>
      <section
        className={styles.storefrontHero}
        aria-labelledby="storefront-hero-title"
      >
        <div
          id="storefront-hero-sentinel"
          className={styles.storefrontHero__media}
          aria-hidden
        >
          {hasCover ? (
            <Image
              src={storefront.coverImageUrl!}
              alt=""
              fill
              priority
              sizes="100vw"
              className={cn(styles.storefrontHero__image, focusClass)}
            />
          ) : (
            <ImagePlaceholder
              aspectRatio="16/9"
              className={styles.storefrontHero__placeholder}
            />
          )}
          <div className={styles.storefrontHero__overlay} />
        </div>

        {headerSlot}

        <div className={styles.storefrontHero__content}>
          <div className={styles.storefrontHero__copy}>
            <Eyebrow className="text-inverse/90">
              {copy.heroEyebrow ?? location}
            </Eyebrow>
            <h1 id="storefront-hero-title" className={styles.storefrontHero__title}>
              {storefront.name}
            </h1>
            <p className={styles.storefrontHero__subtitle}>
              {storefront.tagline ||
                `${location}${storefront.verified ? ` · ${copy.verifiedLabel}` : ''}`}
            </p>
            {storefront.tagline ? (
              <p className={styles.storefrontHero__meta}>
                {location}
                {storefront.verified ? ` · ${copy.verifiedLabel}` : ''}
              </p>
            ) : null}
          </div>

          {searchSlot ? (
            <div className={styles.storefrontHero__search}>{searchSlot}</div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
