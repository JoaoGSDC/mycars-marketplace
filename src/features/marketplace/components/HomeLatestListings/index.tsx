'use client';

import Link from 'next/link';
import { useState } from 'react';

import { Button, EmptyState, SectionHeader, Tabs, TabsList, TabsTrigger } from '@components/ui';
import { VehicleCard } from '@components/marketplace';
import type { VehicleListing } from '@app-types/vehicle';
import type { VehicleSearchCondition } from '@utils/vehicle-search-params';

import { homeContent } from '../../marketplace.home.content';
import styles from './styles.module.css';

export type HomeLatestListingsProps = {
  byTab: Record<'all' | VehicleSearchCondition, VehicleListing[]>;
};

const TABS: { value: 'all' | VehicleSearchCondition; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'novo', label: 'Novos' },
  { value: 'seminovo', label: 'Seminovos' },
  { value: 'usado', label: 'Usados' },
];

export function HomeLatestListings({ byTab }: HomeLatestListingsProps) {
  const [tab, setTab] = useState<'all' | VehicleSearchCondition>('all');
  const vehicles = byTab[tab] ?? [];
  const copy = homeContent.latest;

  return (
    <section className={styles.homeLatest} aria-labelledby="home-latest-title">
      <SectionHeader
        eyebrow={copy.eyebrow}
        title={copy.title}
        actions={
          <Tabs
            value={tab}
            onValueChange={(value) => {
              if (value === 'all' || value === 'novo' || value === 'seminovo' || value === 'usado') {
                setTab(value);
              }
            }}
          >
            <TabsList variant="pills">
              {TABS.map((item) => (
                <TabsTrigger key={item.value} variant="pills" value={item.value}>
                  {item.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        }
      />

      {vehicles.length === 0 ? (
        <EmptyState title={copy.emptyTitle} description={copy.emptyDescription} />
      ) : (
        <div className={styles.homeLatest__grid}>
          {vehicles.map((vehicle) => (
            <VehicleCard key={vehicle.id} variant="grid" vehicle={vehicle} href={`/veiculos/${vehicle.slug}`} />
          ))}
        </div>
      )}

      <div className={styles.homeLatest__footer}>
        <Button variant="dark" withArrow asChild className={styles.homeLatest__seeAll}>
          <Link href={copy.seeAllHref}>{copy.seeAllLabel}</Link>
        </Button>
      </div>
    </section>
  );
}
