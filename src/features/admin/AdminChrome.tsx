'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

import { DashboardShell } from '@components/dashboard';

import { buildAdminNav } from './admin.nav';

export type AdminChromeProps = {
  userName: string;
  title: string;
  children: ReactNode;
};

export function AdminChrome({ userName, title, children }: AdminChromeProps) {
  const pathname = usePathname() || '/admin';

  return (
    <DashboardShell navItems={buildAdminNav(pathname)} title={title} userName={userName}>
      {children}
    </DashboardShell>
  );
}
