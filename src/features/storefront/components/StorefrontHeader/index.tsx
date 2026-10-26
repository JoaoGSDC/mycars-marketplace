'use client';

import { Menu } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import type { PublicStorefront } from '@app-types/vehicle';
import {
  Button,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  IconButton,
} from '@components/ui';
import { cn } from '@utils/cn';

import { storefrontContent } from '../../storefront.content';
import styles from './styles.module.css';

export type StorefrontNavItem = {
  href: string;
  label: string;
  active?: boolean;
};

export type StorefrontHeaderProps = {
  storefront: PublicStorefront;
  homeHref: string;
  navItems: StorefrontNavItem[];
  whatsappHref?: string;
  /** Link discreto para o painel (preview autenticado). */
  adminHref?: string;
  /**
   * `overlay`: no hero (floating) → sticky solid ao sair do sentinel (padrão home).
   * `static`: sticky sólido desde o topo (legado).
   */
  behavior?: 'overlay' | 'static';
  /** Elemento observado quando `behavior="overlay"`. */
  sentinelId?: string;
  className?: string;
};

export function StorefrontHeader({
  storefront,
  homeHref,
  navItems,
  whatsappHref,
  adminHref,
  behavior = 'overlay',
  sentinelId = 'storefront-hero-sentinel',
  className,
}: StorefrontHeaderProps) {
  const [open, setOpen] = useState(false);
  const [pastHero, setPastHero] = useState(behavior !== 'overlay');
  const copy = storefrontContent;
  const floating = behavior === 'overlay' && !pastHero;

  useEffect(() => {
    if (behavior !== 'overlay') {
      return;
    }

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
  }, [behavior, sentinelId]);

  const bar = (
    <header
      className={cn(
        styles.storefrontHeader,
        floating ? styles['storefrontHeader--floating'] : styles['storefrontHeader--solid'],
        className
      )}
    >
      <div className={styles.storefrontHeader__bar}>
        <Link
          href={homeHref}
          className={styles.storefrontHeader__brand}
          aria-label={storefront.name}
        >
          {storefront.logoUrl ? (
            <Image
              src={storefront.logoUrl}
              alt=""
              width={160}
              height={40}
              className={styles.storefrontHeader__logo}
              priority
            />
          ) : (
            <span className={styles.storefrontHeader__name}>{storefront.name}</span>
          )}
        </Link>

        <nav className={styles.storefrontHeader__nav} aria-label="Vitrine">
          <ul className={styles.storefrontHeader__navList}>
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    styles.storefrontHeader__navLink,
                    item.active && styles['storefrontHeader__navLink--active']
                  )}
                  aria-current={item.active ? 'page' : undefined}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className={styles.storefrontHeader__actions}>
          {adminHref ? (
            <Link href={adminHref} className={styles.storefrontHeader__admin}>
              {copy.adminLink}
            </Link>
          ) : null}
          {whatsappHref ? (
            <Button
              variant={floating ? 'dark' : 'outline'}
              size="sm"
              className={cn(
                styles.storefrontHeader__cta,
                styles.storefrontHeader__actionDesktop,
                !floating && styles['storefrontHeader__cta--solid']
              )}
              asChild
            >
              <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
                {copy.whatsappCta}
              </a>
            </Button>
          ) : null}
          <IconButton
            variant="square-outline"
            size="md"
            className={styles.storefrontHeader__menu}
            aria-label="Abrir menu"
            icon={<Menu className="size-5" strokeWidth={1.5} />}
            onClick={() => {
              setOpen(true);
            }}
          />
        </div>
      </div>
    </header>
  );

  return (
    <>
      {behavior === 'overlay' ? (
        <div
          className={
            pastHero ? styles.storefrontHeader__fixedWrap : styles.storefrontHeader__absoluteWrap
          }
        >
          {bar}
        </div>
      ) : (
        bar
      )}

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent side="right" className={styles.storefrontHeader__drawer}>
          <DrawerHeader className={styles.storefrontHeader__drawerHeader}>
            <DrawerTitle>Menu</DrawerTitle>
            <p className={styles.storefrontHeader__drawerLead}>{storefront.name}</p>
          </DrawerHeader>

          <DrawerBody className={styles.storefrontHeader__drawerBody}>
            <nav aria-label="Mobile">
              <ul className={styles.storefrontHeader__drawerList}>
                {navItems.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        styles.storefrontHeader__drawerLink,
                        item.active && styles['storefrontHeader__drawerLink--active']
                      )}
                      onClick={() => {
                        setOpen(false);
                      }}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            {adminHref ? (
              <Link
                href={adminHref}
                className={styles.storefrontHeader__drawerAdmin}
                onClick={() => {
                  setOpen(false);
                }}
              >
                {copy.adminLink}
              </Link>
            ) : null}
          </DrawerBody>

          {whatsappHref ? (
            <DrawerFooter className={styles.storefrontHeader__drawerFooter}>
              <Button variant="primary" className="w-full" asChild>
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    setOpen(false);
                  }}
                >
                  {copy.whatsappCta}
                </a>
              </Button>
            </DrawerFooter>
          ) : null}
        </DrawerContent>
      </Drawer>
    </>
  );
}
