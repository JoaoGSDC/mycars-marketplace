'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { SiteHeader, buildMarketplaceNav } from '@components/layout';
import { Button } from '@components/ui';

import styles from './styles.module.css';

export type HomeStickyHeaderProps = {
  /** Elemento observado (hero) — quando sai da viewport, header vira solid+fixed. */
  sentinelId?: string;
};

export function HomeStickyHeader({ sentinelId = 'home-hero-sentinel' }: HomeStickyHeaderProps) {
  const [pastHero, setPastHero] = useState(false);
  const navItems = buildMarketplaceNav('/');

  useEffect(() => {
    const sentinel = document.getElementById(sentinelId);

    if (!sentinel) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setPastHero(!entry.isIntersecting);
      },
      { root: null, threshold: 0 }
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [sentinelId]);

  return (
    <div className={pastHero ? styles.homeStickyHeader__fixedWrap : styles.homeStickyHeader__absoluteWrap}>
      <SiteHeader
        variant={pastHero ? 'solid' : 'floating'}
        overlayPosition={pastHero ? 'fixed' : 'absolute'}
        navItems={navItems}
        showMessages={false}
        showUser={false}
        cta={
          <Button variant={pastHero ? 'primary' : 'dark'} size="sm" withArrow asChild>
            <Link href="/veiculos">Ver veículos</Link>
          </Button>
        }
      />
    </div>
  );
}
