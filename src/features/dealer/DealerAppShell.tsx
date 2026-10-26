'use client';

import {
  CalendarCheck,
  Car,
  ClipboardList,
  Handshake,
  LayoutDashboard,
  LogOut,
  Settings,
  Store,
  Users,
  Wallet,
} from 'lucide-react';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

import {
  ConfirmDialog,
  DashboardShell,
  type DashboardNavGroup,
  type DashboardNavItem,
} from '@components/dashboard';
import { Breadcrumb, Button } from '@components/ui';
import { STORE_ROLE_LABELS, type StoreRole } from '@app-types/membership';
import { STORE_STATUS_LABELS, type StoreStatus } from '@app-types/status';
import { signOutAction } from '@server/auth/store-actions';

import {
  DEALER_NAV_GROUPS,
  filterDealerNav,
  findDealerNavByPathname,
  isDealerNavActive,
  type DealerNavId,
} from './dealer.nav';

const NAV_ICONS: Record<DealerNavId, ReactNode> = {
  overview: <LayoutDashboard strokeWidth={1.5} />,
  estoque: <Car strokeWidth={1.5} />,
  clientes: <Users strokeWidth={1.5} />,
  oportunidades: <Handshake strokeWidth={1.5} />,
  reservas: <CalendarCheck strokeWidth={1.5} />,
  vendas: <Wallet strokeWidth={1.5} />,
  equipe: <Users strokeWidth={1.5} />,
  vitrine: <Store strokeWidth={1.5} />,
  solicitacao: <ClipboardList strokeWidth={1.5} />,
  configuracoes: <Settings strokeWidth={1.5} />,
};

export type DealerAppShellProps = {
  children: ReactNode;
  userName: string;
  storeName: string;
  storeCity: string;
  storeState: string;
  storeStatus: string;
  role: StoreRole;
  permissionsJson: string;
};

export function DealerAppShell({
  children,
  userName,
  storeName,
  storeCity,
  storeState,
  storeStatus,
  role,
  permissionsJson,
}: DealerAppShellProps) {
  const pathname = usePathname() || '/painel';
  const allowed = filterDealerNav(role, permissionsJson);
  const current = findDealerNavByPathname(pathname);

  const navItems: DashboardNavItem[] = allowed.map((item) => ({
    href: item.href,
    label: item.label,
    icon: NAV_ICONS[item.id],
    active: isDealerNavActive(pathname, item.href),
    group: item.group,
  }));

  const navGroups: DashboardNavGroup[] = DEALER_NAV_GROUPS.map((group) => ({
    id: group.id,
    label: group.label,
  }));

  const roleLabel = STORE_ROLE_LABELS[role] ?? role;
  const statusLabel = STORE_STATUS_LABELS[storeStatus as StoreStatus] ?? storeStatus;
  const storeMeta = `${storeCity}/${storeState} · ${roleLabel} · ${statusLabel}`;

  const breadcrumbItems = [
    { label: 'Painel', href: '/painel' },
    ...(current && current.href !== '/painel'
      ? [{ label: current.breadcrumb }]
      : current
        ? []
        : [{ label: 'Página' }]),
  ];

  return (
    <DashboardShell
      fullViewport
      collapsible
      navItems={navItems}
      navGroups={navGroups}
      userName={userName}
      storeName={storeName}
      storeMeta={storeMeta}
      breadcrumb={<Breadcrumb items={breadcrumbItems} />}
      headerEnd={
        <ConfirmDialog
          tone="danger"
          title="Encerrar sessão?"
          description="Você sairá do painel da loja. Será necessário entrar novamente para continuar."
          confirmLabel="Sair"
          formAction={signOutAction}
          trigger={
            <Button type="button" variant="outline" size="sm" aria-label="Sair">
              <LogOut className="size-4" strokeWidth={1.5} />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          }
        />
      }
    >
      {children}
    </DashboardShell>
  );
}
