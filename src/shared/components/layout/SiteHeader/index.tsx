'use client';

import { Heart, MapPin, Menu, MessageCircle, User } from 'lucide-react';
import Link from 'next/link';
import { useState, type ReactNode } from 'react';

import {
  Badge,
  BottomSheet,
  BottomSheetBody,
  BottomSheetContent,
  BottomSheetFooter,
  BottomSheetHeader,
  BottomSheetTitle,
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

import { Logo } from '../Logo';
import { DEFAULT_HEADER_NAV } from './siteHeader.constants';
import type { SiteHeaderNavItem, SiteHeaderProps } from './siteHeader.types';
import styles from './styles.module.css';

export type { SiteHeaderCityOption, SiteHeaderNavItem, SiteHeaderProps, SiteHeaderVariant } from './siteHeader.types';

/** Localização fixa no marketplace até o filtro de cidade estar disponível. */
const LOCKED_CITY_LABEL = 'Limeira-SP';

const DEFAULT_FAVORITES_NOTE =
  'Favoritos são salvos só neste navegador (localStorage) até existir conta de consumidor.';

function HeaderNav({
  items,
  className,
  linkClassName,
  activeClassName,
}: {
  items: SiteHeaderNavItem[];
  className?: string;
  linkClassName: string;
  activeClassName: string;
}) {
  return (
    <nav className={className} aria-label="Principal">
      <ul className={styles['siteHeader__navList']}>
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className={cn(linkClassName, item.active && activeClassName)}
              aria-current={item.active ? 'page' : undefined}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function wrapCtaFullWidth(cta: ReactNode) {
  return <div className={styles['siteHeader__drawerCtaInner']}>{cta}</div>;
}

export function SiteHeader({
  variant = 'floating',
  navItems = DEFAULT_HEADER_NAV,
  cta,
  city = LOCKED_CITY_LABEL,
  storeName,
  userName,
  messageCount = 0,
  favoritesCount = 0,
  favoritesNote = DEFAULT_FAVORITES_NOTE,
  showMessages = true,
  showUser = true,
  overlayPosition = 'absolute',
  className,
  onMenu,
  onFavoritesClick,
}: SiteHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [favoritesOpen, setFavoritesOpen] = useState(false);

  function openMenu() {
    onMenu?.();
    setMenuOpen(true);
  }

  function openFavorites() {
    if (onFavoritesClick) {
      onFavoritesClick();
      return;
    }

    setFavoritesOpen(true);
  }

  const dealerCta =
    cta ??
    (variant === 'solid' ? (
      <Button variant="dark" size="sm" asChild>
        <Link href="/para-lojistas">Sou lojista</Link>
      </Button>
    ) : variant === 'floating' ? (
      <Button variant="dark" size="sm" withArrow asChild>
        <Link href="/veiculos">Ver veículos</Link>
      </Button>
    ) : null);

  const rootClass = cn(
    styles.siteHeader,
    variant === 'floating' && styles['siteHeader--floating'],
    variant === 'floating' && overlayPosition === 'fixed' && styles['siteHeader--fixed'],
    variant === 'solid' && styles['siteHeader--solid'],
    variant === 'storefront' && styles['siteHeader--storefront'],
    className
  );

  const cityLabel = city || LOCKED_CITY_LABEL;
  const favoritesLabel = favoritesCount > 0 ? `Favoritos (${favoritesCount})` : 'Favoritos';
  const showFavoritesAction = variant === 'solid';
  const showAccountAction = showUser;

  return (
    <>
      <header className={rootClass}>
        <div className={styles['siteHeader__bar']}>
          <div className={styles['siteHeader__start']}>
            {variant === 'storefront' ? (
              <div className={styles['siteHeader__store']}>
                <Logo size="md" />
                {storeName ? <span className={styles['siteHeader__storeName']}>{storeName}</span> : null}
              </div>
            ) : (
              <Link href="/" className={styles['siteHeader__logoLink']}>
                <Logo size={variant === 'floating' ? 'md' : 'lg'} />
              </Link>
            )}

            {variant === 'solid' ? (
              <div className={styles['siteHeader__cityWrap']}>
                <span className={styles['siteHeader__city']} aria-label={`Localização: ${cityLabel}`}>
                  <MapPin className="size-4 shrink-0 text-accent-strong" strokeWidth={1.5} aria-hidden />
                  <span>{cityLabel}</span>
                </span>
              </div>
            ) : null}
          </div>

          {variant !== 'storefront' ? (
            <HeaderNav
              items={navItems}
              className={styles['siteHeader__navDesktop']}
              linkClassName={
                variant === 'solid' ? styles['siteHeader__navLinkSolid'] : styles['siteHeader__navLinkFloating']
              }
              activeClassName={
                variant === 'solid'
                  ? styles['siteHeader__navLinkSolid--active']
                  : styles['siteHeader__navLinkFloating--active']
              }
            />
          ) : null}

          {/* Desktop actions — mobile: só o menu (CTA / conta / favoritos ficam no drawer) */}
          <div className={styles['siteHeader__actions']}>
            {variant === 'solid' ? (
              <>
                {showMessages ? (
                  <div className={cn(styles['siteHeader__iconWrap'], styles['siteHeader__actionDesktop'])}>
                    <IconButton
                      variant="square-outline"
                      size="sm"
                      aria-label="Mensagens"
                      icon={<MessageCircle className="size-5" strokeWidth={1.5} />}
                    />
                    {messageCount > 0 ? (
                      <Badge variant="count" className={styles['siteHeader__badge']}>
                        {messageCount > 99 ? '99+' : messageCount}
                      </Badge>
                    ) : null}
                  </div>
                ) : null}
                {showFavoritesAction ? (
                  <div className={cn(styles['siteHeader__iconWrap'], styles['siteHeader__actionDesktop'])}>
                    <IconButton
                      variant="square-outline"
                      size="sm"
                      aria-label={favoritesLabel}
                      onClick={openFavorites}
                      icon={<Heart className="size-5" strokeWidth={1.5} />}
                    />
                    {favoritesCount > 0 ? (
                      <Badge variant="count" className={styles['siteHeader__badge']}>
                        {favoritesCount > 99 ? '99+' : favoritesCount}
                      </Badge>
                    ) : null}
                  </div>
                ) : null}
                {showUser && userName ? (
                  <button type="button" className={styles['siteHeader__userChip']} aria-label={`Conta de ${userName}`}>
                    <span className={styles['siteHeader__userAvatar']} aria-hidden>
                      {userName.charAt(0).toUpperCase()}
                    </span>
                    <span className={styles['siteHeader__userName']}>{userName}</span>
                  </button>
                ) : null}
                {dealerCta ? <div className={styles['siteHeader__actionDesktop']}>{dealerCta}</div> : null}
              </>
            ) : (
              <>
                {dealerCta ? <div className={styles['siteHeader__actionDesktop']}>{dealerCta}</div> : null}
                {showAccountAction ? (
                  <IconButton
                    variant="square-accent"
                    size="md"
                    className={styles['siteHeader__actionDesktop']}
                    aria-label="Minha conta"
                    icon={<User className="size-5" strokeWidth={1.5} />}
                  />
                ) : null}
              </>
            )}

            <IconButton
              variant="square-outline"
              size="md"
              className={styles['siteHeader__menuButton']}
              aria-label="Abrir menu"
              icon={<Menu className="size-5" strokeWidth={1.5} />}
              onClick={openMenu}
            />
          </div>
        </div>
      </header>

      <Drawer open={menuOpen} onOpenChange={setMenuOpen}>
        <DrawerContent side="right" className={styles['siteHeader__drawer']}>
          <DrawerHeader className={styles['siteHeader__drawerHeader']}>
            <DrawerTitle>Menu</DrawerTitle>
            <p className={styles['siteHeader__drawerLead']}>Navegue pelo marketplace</p>
          </DrawerHeader>

          <DrawerBody className={styles['siteHeader__drawerBody']}>
            <nav aria-label="Mobile">
              <ul className={styles['siteHeader__drawerList']}>
                {navItems.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        styles['siteHeader__drawerLink'],
                        item.active && styles['siteHeader__drawerLink--active']
                      )}
                      onClick={() => {
                        setMenuOpen(false);
                      }}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </DrawerBody>

          <DrawerFooter className={styles['siteHeader__drawerFooter']}>
            {showFavoritesAction ? (
              <button
                type="button"
                className={styles['siteHeader__drawerAction']}
                onClick={() => {
                  setMenuOpen(false);
                  openFavorites();
                }}
              >
                <Heart className="size-5 shrink-0" strokeWidth={1.5} aria-hidden />
                <span className={styles['siteHeader__drawerActionLabel']}>
                  {favoritesLabel}
                  {favoritesCount > 0 ? (
                    <Badge variant="count" className={styles['siteHeader__drawerActionBadge']}>
                      {favoritesCount > 99 ? '99+' : favoritesCount}
                    </Badge>
                  ) : null}
                </span>
              </button>
            ) : null}

            {showAccountAction ? (
              <button type="button" className={styles['siteHeader__drawerAction']} aria-label="Minha conta">
                <User className="size-5 shrink-0" strokeWidth={1.5} aria-hidden />
                <span className={styles['siteHeader__drawerActionLabel']}>
                  {userName ? `Olá, ${userName}` : 'Minha conta'}
                </span>
              </button>
            ) : null}

            {dealerCta ? wrapCtaFullWidth(dealerCta) : null}
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <BottomSheet open={favoritesOpen} onOpenChange={setFavoritesOpen}>
        <BottomSheetContent height="content">
          <BottomSheetHeader>
            <BottomSheetTitle>Favoritos</BottomSheetTitle>
          </BottomSheetHeader>
          <BottomSheetBody>
            <div className={styles['siteHeader__favoritesSheet']}>
              <p className={styles['siteHeader__favoritesCount']}>
                {favoritesCount === 0
                  ? 'Nenhum veículo favoritado ainda'
                  : favoritesCount === 1
                    ? '1 veículo salvo neste aparelho'
                    : `${favoritesCount} veículos salvos neste aparelho`}
              </p>
              <p>{favoritesNote}</p>
            </div>
          </BottomSheetBody>
          <BottomSheetFooter>
            <Button variant="primary" className="w-full" asChild>
              <Link
                href="/veiculos"
                onClick={() => {
                  setFavoritesOpen(false);
                }}
              >
                Ver veículos
              </Link>
            </Button>
          </BottomSheetFooter>
        </BottomSheetContent>
      </BottomSheet>
    </>
  );
}
