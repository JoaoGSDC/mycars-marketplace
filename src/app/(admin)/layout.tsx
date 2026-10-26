import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { AdminShell } from '@features/admin';
import { requirePlatformAdmin } from '@server/auth/platform-admin';

export const metadata: Metadata = {
  title: 'Administração',
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requirePlatformAdmin();

  if (!admin.ok) {
    redirect(admin.code === 'UNAUTHORIZED' ? '/entrar?next=/admin' : '/painel');
  }

  return <AdminShell>{children}</AdminShell>;
}
