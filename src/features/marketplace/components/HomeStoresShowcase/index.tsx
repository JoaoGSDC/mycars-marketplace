'use client';

import Link from 'next/link';
import { useCallback, useRef, useState } from 'react';

import {
  Button,
  CarouselControls,
  EmptyState,
  Eyebrow,
  Heading,
  ProgressBars,
  Stat,
  StatGroup,
} from '@components/ui';
import { StoreCard } from '@components/marketplace';
import type { StoreProfile } from '@app-types/vehicle';
import type { FixtureMarketStats } from '@fixtures/market-stats';
import { formatCount } from '@utils/format';

import { homeContent } from '../../marketplace.home.content';
import styles from './styles.module.css';

export type HomeStoresShowcaseProps = {
  stores: StoreProfile[];
  stats: FixtureMarketStats;
};

export function HomeStoresShowcase({ stores, stats }: HomeStoresShowcaseProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const copy = homeContent.stores;

  const syncIndex = useCallback(() => {
    const el = trackRef.current;

    if (!el || stores.length === 0) {
      return;
    }

    const cardWidth = el.scrollWidth / stores.length;
    const next = Math.round(el.scrollLeft / Math.max(cardWidth, 1));

    setIndex(Math.min(Math.max(next, 0), stores.length - 1));
  }, [stores.length]);

  const scrollBy = (direction: -1 | 1) => {
    const el = trackRef.current;

    if (!el) {
      return;
    }

    el.scrollBy({ left: el.clientWidth * 0.8 * direction, behavior: 'smooth' });
    window.setTimeout(syncIndex, 320);
  };

  return (
    <section className={styles.homeStores} data-theme="dark" aria-labelledby="home-stores-title">
      <h2 id="home-stores-title" className={styles.homeStores__sectionTitle}>
        {copy.sectionTitle}
      </h2>

      <div className={styles.homeStores__panel}>
        <div className={styles.homeStores__panelHead}>
          <div className={styles.homeStores__copy}>
            <Eyebrow>{copy.eyebrow}</Eyebrow>
            <Heading as="h3">{copy.title}</Heading>
            <Button variant="primary" withArrow asChild>
              <Link href={copy.actionHref}>{copy.actionLabel}</Link>
            </Button>
          </div>
          <StatGroup className={styles.homeStores__stats}>
            <Stat label={copy.stats.stores} value={formatCount(stats.verifiedStores)} />
            <Stat label={copy.stats.vehicles} value={formatCount(stats.listedVehicles)} />
            <Stat label={copy.stats.cities} value={formatCount(stats.cities)} />
          </StatGroup>
        </div>

        <div className={styles.homeStores__carousel}>
          {stores.length === 0 ? (
            <EmptyState title={copy.emptyTitle} description={copy.emptyDescription} />
          ) : (
            <>
              <div
                ref={trackRef}
                className={styles.homeStores__track}
                onScroll={syncIndex}
                tabIndex={0}
                role="region"
                aria-label="Lojas parceiras"
              >
                {stores.map((store) => (
                  <StoreCard
                    key={store.id}
                    store={store}
                    href={`/lojas/${store.slug}`}
                    className={styles.homeStores__card}
                  />
                ))}
              </div>
              <div className={styles.homeStores__controls}>
                <ProgressBars count={stores.length} activeIndex={index} />
                <CarouselControls
                  onPrevious={() => {
                    scrollBy(-1);
                  }}
                  onNext={() => {
                    scrollBy(1);
                  }}
                  previousDisabled={index <= 0}
                  nextDisabled={index >= stores.length - 1}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
