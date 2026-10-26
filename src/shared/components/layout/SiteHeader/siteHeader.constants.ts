import { buildMarketplaceNav } from './marketplaceNav';
import type { SiteHeaderNavItem } from './siteHeader.types';

/** Default do SiteHeader — mesma nav canônica da Home / listagem / detalhe. */
export const DEFAULT_HEADER_NAV: SiteHeaderNavItem[] = buildMarketplaceNav('/');
