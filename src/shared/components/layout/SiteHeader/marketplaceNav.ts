import type { SiteHeaderNavItem } from './siteHeader.types';

/**
 * Navegação canônica do marketplace (consumidor).
 * Um único conjunto em todas as telas públicas — rótulos e hrefs estáveis.
 * Páginas institucionais (Sobre, Contato, Termos) ficam no rodapé.
 */
export const MARKETPLACE_NAV_ITEMS: ReadonlyArray<Omit<SiteHeaderNavItem, 'active'>> = [
  { href: '/', label: 'Início' },
  { href: '/veiculos', label: 'Veículos' },
  { href: '/lojas', label: 'Lojas' },
  { href: '/para-lojistas', label: 'Para lojistas' },
] as const;

/** Marca o item ativo conforme o pathname atual. */
export function buildMarketplaceNav(pathname = '/'): SiteHeaderNavItem[] {
  const path = pathname.split('?')[0] || '/';

  return MARKETPLACE_NAV_ITEMS.map((item) => {
    const active =
      item.href === '/'
        ? path === '/'
        : path === item.href || path.startsWith(`${item.href}/`);

    return { href: item.href, label: item.label, active };
  });
}
