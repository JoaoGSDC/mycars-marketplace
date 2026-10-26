export type AdminNavId =
  | 'inicio'
  | 'solicitacoes'
  | 'lojas'
  | 'anuncios'
  | 'denuncias'
  | 'planos'
  | 'auditoria'
  | 'equipe';

export type AdminNavItem = {
  id: AdminNavId;
  href: string;
  label: string;
};

export const ADMIN_NAV: AdminNavItem[] = [
  { id: 'inicio', href: '/admin', label: 'Início' },
  { id: 'solicitacoes', href: '/admin/solicitacoes', label: 'Solicitações' },
  { id: 'lojas', href: '/admin/lojas', label: 'Lojas' },
  { id: 'anuncios', href: '/admin/anuncios', label: 'Anúncios' },
  { id: 'denuncias', href: '/admin/denuncias', label: 'Denúncias' },
  { id: 'planos', href: '/admin/planos', label: 'Planos' },
  { id: 'auditoria', href: '/admin/auditoria', label: 'Auditoria' },
  { id: 'equipe', href: '/admin/equipe', label: 'Equipe' },
];

export function isAdminNavActive(pathname: string, href: string): boolean {
  if (href === '/admin') {
    return pathname === '/admin';
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function buildAdminNav(pathname: string) {
  return ADMIN_NAV.map((item) => ({
    href: item.href,
    label: item.label,
    active: isAdminNavActive(pathname, item.href),
  }));
}
