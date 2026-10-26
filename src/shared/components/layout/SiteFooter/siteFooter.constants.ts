import type { SiteFooterColumn, SiteFooterLink } from './siteFooter.types';

export const DEFAULT_FOOTER_COLUMNS: SiteFooterColumn[] = [
  {
    title: 'Comprar',
    links: [
      { href: '/veiculos', label: 'Veículos' },
      { href: '/lojas', label: 'Lojas' },
      { href: '/veiculos?carroceria=suv', label: 'SUVs' },
      { href: '/veiculos?carroceria=sedan', label: 'Sedãs' },
    ],
  },
  {
    title: 'Vender',
    links: [
      { href: '/para-lojistas', label: 'Para lojistas' },
      { href: '/painel', label: 'Área do lojista' },
      { href: '/vitrine', label: 'Vitrine da loja' },
    ],
  },
  {
    title: 'Empresa',
    links: [
      { href: '/sobre', label: 'Sobre' },
      { href: '/contato', label: 'Contato' },
    ],
  },
  {
    title: 'Ajuda',
    links: [
      { href: '/termos', label: 'Termos' },
      { href: '/privacidade', label: 'Privacidade' },
    ],
  },
];

export const DEFAULT_LEGAL_LINKS: SiteFooterLink[] = [
  { href: '/privacidade', label: 'Política de privacidade' },
  { href: '/termos', label: 'Termos de uso' },
];
