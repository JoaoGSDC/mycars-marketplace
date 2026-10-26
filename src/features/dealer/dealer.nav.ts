import type { Permission } from '@app-types/permissions';
import { PERMISSIONS } from '@app-types/permissions';
import { membershipGrantsPermission } from '@app-types/permissions';
import type { StoreRole } from '@app-types/membership';

export type DealerNavId =
  | 'overview'
  | 'estoque'
  | 'clientes'
  | 'oportunidades'
  | 'reservas'
  | 'vendas'
  | 'equipe'
  | 'vitrine'
  | 'solicitacao'
  | 'configuracoes';

export type DealerNavGroupId = 'visao' | 'veiculos' | 'comercial' | 'administracao';

export type DealerNavDefinition = {
  id: DealerNavId;
  href: string;
  label: string;
  /** Permissão mínima; omitido = qualquer membro ativo. */
  permission?: Permission;
  breadcrumb: string;
  group: DealerNavGroupId;
};

export const DEALER_NAV_GROUPS: readonly { id: DealerNavGroupId; label: string }[] = [
  { id: 'visao', label: 'Visão geral' },
  { id: 'veiculos', label: 'Veículos' },
  { id: 'comercial', label: 'Comercial' },
  { id: 'administracao', label: 'Administração' },
] as const;

/** Navegação canônica do painel — filtrada por permissões no servidor/cliente. */
export const DEALER_NAV: readonly DealerNavDefinition[] = [
  {
    id: 'overview',
    href: '/painel',
    label: 'Dashboard',
    breadcrumb: 'Dashboard',
    group: 'visao',
  },
  {
    id: 'estoque',
    href: '/painel/estoque',
    label: 'Estoque',
    permission: PERMISSIONS.VEHICLES_READ,
    breadcrumb: 'Estoque',
    group: 'veiculos',
  },
  {
    id: 'vitrine',
    href: '/painel/vitrine',
    label: 'Vitrine',
    permission: PERMISSIONS.STOREFRONT_WRITE,
    breadcrumb: 'Vitrine',
    group: 'veiculos',
  },
  {
    id: 'clientes',
    href: '/painel/clientes',
    label: 'Clientes',
    permission: PERMISSIONS.CUSTOMERS_READ,
    breadcrumb: 'Clientes',
    group: 'comercial',
  },
  {
    id: 'oportunidades',
    href: '/painel/oportunidades',
    label: 'Oportunidades',
    permission: PERMISSIONS.OPPORTUNITIES_READ,
    breadcrumb: 'Oportunidades',
    group: 'comercial',
  },
  {
    id: 'reservas',
    href: '/painel/reservas',
    label: 'Reservas',
    permission: PERMISSIONS.RESERVATIONS_READ,
    breadcrumb: 'Reservas',
    group: 'comercial',
  },
  {
    id: 'vendas',
    href: '/painel/vendas',
    label: 'Vendas',
    permission: PERMISSIONS.SALES_READ,
    breadcrumb: 'Vendas',
    group: 'comercial',
  },
  {
    id: 'equipe',
    href: '/painel/equipe',
    label: 'Equipe',
    permission: PERMISSIONS.MEMBERS_MANAGE,
    breadcrumb: 'Equipe',
    group: 'administracao',
  },
  {
    id: 'solicitacao',
    href: '/painel/solicitacao',
    label: 'Solicitação',
    permission: PERMISSIONS.STORE_READ,
    breadcrumb: 'Solicitação',
    group: 'administracao',
  },
  {
    id: 'configuracoes',
    href: '/painel/configuracoes',
    label: 'Configurações',
    permission: PERMISSIONS.STORE_WRITE,
    breadcrumb: 'Configurações',
    group: 'administracao',
  },
] as const;

export function filterDealerNav(
  role: StoreRole,
  permissionsJson: string
): DealerNavDefinition[] {
  return DEALER_NAV.filter((item) => {
    if (!item.permission) {
      return true;
    }

    return membershipGrantsPermission(role, permissionsJson, item.permission);
  });
}

export function findDealerNavByPathname(pathname: string): DealerNavDefinition | undefined {
  const exact = DEALER_NAV.find((item) => item.href === pathname);

  if (exact) {
    return exact;
  }

  return DEALER_NAV.filter((item) => item.href !== '/painel')
    .filter((item) => pathname.startsWith(item.href))
    .sort((a, b) => b.href.length - a.href.length)[0];
}

export function isDealerNavActive(pathname: string, href: string): boolean {
  if (href === '/painel') {
    return pathname === '/painel';
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}
