'use client';

import { useCallback, useRef, useState, type ReactNode } from 'react';

import { CarouselControls } from '@components/ui/CarouselControls';
import { cn } from '@utils/cn';

import { CategoryCard, type CategoryCardProps } from '../CategoryCard';
import styles from './styles.module.css';

export type CategoryCarouselItem = Pick<
  CategoryCardProps,
  'label' | 'availableCount' | 'imageUrl' | 'imageAlt' | 'href'
> & {
  id: string;
};

export type CategoryCarouselProps = {
  items: CategoryCarouselItem[];
  className?: string;
  /** Título do cabeçalho embutido. Padrão: "Categorias". */
  title?: string;
  ariaLabel?: string;
  /** Exibe cabeçalho com título + controles. Padrão: true. */
  showBuiltInHeader?: boolean;
  /** Substitui o cabeçalho embutido; recebe os controles do carrossel. */
  renderHeader?: (controls: ReactNode) => ReactNode;
};

export function CategoryCarousel({
  items,
  className,
  title = 'Categorias',
  ariaLabel,
  showBuiltInHeader = true,
  renderHeader,
}: CategoryCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(items.length > 1);

  const syncControls = useCallback(() => {
    const el = trackRef.current;

    if (!el) {
      return;
    }

    setCanPrev(el.scrollLeft > 8);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  }, []);

  const scrollByPage = (direction: -1 | 1) => {
    const el = trackRef.current;

    if (!el) {
      return;
    }

    const amount = el.clientWidth * 0.85 * direction;

    el.scrollBy({ left: amount, behavior: 'smooth' });
    window.setTimeout(syncControls, 320);
  };

  const controls = (
    <CarouselControls
      onPrevious={() => {
        scrollByPage(-1);
      }}
      onNext={() => {
        scrollByPage(1);
      }}
      previousDisabled={!canPrev}
      nextDisabled={!canNext}
    />
  );

  const sectionLabel = ariaLabel ?? title;

  let header: ReactNode = null;

  if (renderHeader) {
    header = renderHeader(controls);
  } else if (showBuiltInHeader) {
    header = (
      <div className={styles.categoryCarousel__header}>
        <h2 className={styles.categoryCarousel__title}>{title}</h2>
        {controls}
      </div>
    );
  }

  return (
    <section className={cn(styles.categoryCarousel, className)} aria-label={sectionLabel}>
      {header}
      <div ref={trackRef} className={styles.categoryCarousel__track} onScroll={syncControls}>
        {items.map((item) => (
          <CategoryCard
            key={item.id}
            label={item.label}
            availableCount={item.availableCount}
            imageUrl={item.imageUrl}
            imageAlt={item.imageAlt}
            href={item.href}
            className={styles.categoryCarousel__card}
          />
        ))}
      </div>
    </section>
  );
}
