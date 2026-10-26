import type { ReactNode } from 'react';

export type SiteHeaderVariant = 'floating' | 'solid' | 'storefront';

export type SiteHeaderNavItem = {
  href: string;
  label: string;
  active?: boolean;
};

export type SiteHeaderOverlayPosition = 'absolute' | 'fixed';

export type SiteHeaderCityOption = {
  value: string;
  label: string;
};

export type SiteHeaderProps = {
  variant?: SiteHeaderVariant;
  navItems?: SiteHeaderNavItem[];
  cta?: ReactNode;
  /** Label de localização (solid). Por enquanto fixo em Limeira-SP — seletor desativado. */
  city?: string;
  /** @deprecated Seletor de cidade temporariamente desativado. */
  cityOptions?: SiteHeaderCityOption[];
  /** @deprecated Seletor de cidade temporariamente desativado. */
  onCityChange?: (value: string) => void;
  storeName?: string;
  userName?: string;
  messageCount?: number;
  /** Contagem de favoritos (badge no coração). */
  favoritesCount?: number;
  /**
   * Nota do sheet informativo de favoritos (localStorage, sem API de lista).
   * Default explica o armazenamento local.
   */
  favoritesNote?: string;
  /** Exibir ícone de mensagens — default true; false no marketplace consumidor. */
  showMessages?: boolean;
  /** Exibir chip de usuário — default true quando userName; false no marketplace. */
  showUser?: boolean;
  overlayPosition?: SiteHeaderOverlayPosition;
  className?: string;
  onMenu?: () => void;
  /** Se omitido, abre sheet informativo interno. */
  onFavoritesClick?: () => void;
};
