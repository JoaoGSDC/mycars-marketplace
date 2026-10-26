export { BigWordmark } from './BigWordmark';
export type { BigWordmarkProps } from './BigWordmark';

export { Logo, splitBrandName } from './Logo';
export type { LogoProps, LogoSize } from './Logo';

export { NewsletterForm } from './NewsletterForm';
export type { NewsletterFormProps } from './NewsletterForm';

export { PageShell } from './PageShell';
export type { PageShellProps } from './PageShell';

export { Section } from './Section';
export type { SectionProps, SectionSpacing, SectionTheme } from './Section';

export { SiteFooter } from './SiteFooter';
export type { SiteFooterColumn, SiteFooterLink, SiteFooterProps, SiteFooterVariant } from './SiteFooter';

export { SiteHeader } from './SiteHeader';
/** Nav canônica — módulo puro (sem `'use client'`) para Server Components poderem chamar. */
export { MARKETPLACE_NAV_ITEMS, buildMarketplaceNav } from './SiteHeader/marketplaceNav';
export { DEFAULT_HEADER_NAV } from './SiteHeader/siteHeader.constants';
export type {
  SiteHeaderCityOption,
  SiteHeaderNavItem,
  SiteHeaderProps,
  SiteHeaderVariant,
} from './SiteHeader/siteHeader.types';
