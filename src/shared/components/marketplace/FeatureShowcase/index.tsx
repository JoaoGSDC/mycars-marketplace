'use client';

import { useCallback, useRef, useState } from 'react';

import { Button } from '@components/ui/Button';
import { CarouselControls } from '@components/ui/CarouselControls';
import { Eyebrow } from '@components/ui/Eyebrow';
import { Heading } from '@components/ui/Heading';
import { ImagePlaceholder } from '@components/ui/ImagePlaceholder';
import { ProgressBars } from '@components/ui/ProgressBars';
import { Stat } from '@components/ui/Stat';
import { cn } from '@utils/cn';

import styles from './styles.module.css';

export type FeatureShowcaseStat = {
  label: string;
  value: string;
  hint?: string;
};

export type FeatureShowcaseGalleryItem = {
  id: string;
  imageUrl?: string;
  alt?: string;
};

export type FeatureShowcaseProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  stats: FeatureShowcaseStat[];
  gallery: FeatureShowcaseGalleryItem[];
  className?: string;
};

export function FeatureShowcase({
  eyebrow = 'Diferenciais',
  title,
  description,
  actionLabel = 'Saiba mais',
  onAction,
  stats,
  gallery,
  className,
}: FeatureShowcaseProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(gallery.length > 1);

  const syncCarousel = useCallback(() => {
    const el = trackRef.current;

    if (!el || gallery.length === 0) {
      return;
    }

    const slideWidth = el.clientWidth;
    const index = slideWidth > 0 ? Math.round(el.scrollLeft / slideWidth) : 0;

    setActiveIndex(Math.min(index, gallery.length - 1));
    setCanPrev(el.scrollLeft > 8);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  }, [gallery.length]);

  const scrollToIndex = (direction: -1 | 1) => {
    const el = trackRef.current;

    if (!el) {
      return;
    }

    el.scrollBy({ left: el.clientWidth * direction, behavior: 'smooth' });
    window.setTimeout(syncCarousel, 320);
  };

  return (
    <section className={cn(styles.featureShowcase, className)} data-theme="dark">
      <div className={styles.featureShowcase__inner}>
        <div className={styles.featureShowcase__card}>
          <Eyebrow>{eyebrow}</Eyebrow>
          <Heading as="h2" className={styles.featureShowcase__title}>
            {title}
          </Heading>
          {description ? <p className={styles.featureShowcase__description}>{description}</p> : null}
          <Button variant="primary" withArrow onClick={onAction}>
            {actionLabel}
          </Button>
          <div className={styles.featureShowcase__stats}>
            {stats.slice(0, 3).map((item) => (
              <Stat key={item.label} label={item.label} value={item.value} hint={item.hint} />
            ))}
          </div>
        </div>

        <div className={styles.featureShowcase__gallery}>
          <div className={styles.featureShowcase__galleryHead}>
            <CarouselControls
              onPrevious={() => {
                scrollToIndex(-1);
              }}
              onNext={() => {
                scrollToIndex(1);
              }}
              previousDisabled={!canPrev}
              nextDisabled={!canNext}
            />
          </div>
          <div ref={trackRef} className={styles.featureShowcase__track} onScroll={syncCarousel}>
            {gallery.map((item) => (
              <div key={item.id} className={styles.featureShowcase__slide}>
                {item.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.imageUrl} alt={item.alt ?? ''} className={styles.featureShowcase__image} />
                ) : (
                  <ImagePlaceholder aspectRatio="16/9" className={styles.featureShowcase__placeholder} />
                )}
              </div>
            ))}
          </div>
          <ProgressBars count={gallery.length} activeIndex={activeIndex} />
        </div>
      </div>
    </section>
  );
}
