import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { listUserStoreMemberships, requireSession } from '@server/auth/access';

export const metadata: Metadata = {
  title: 'Painel do lojista',
  robots: { index: false, follow: false },
};

/**
 * Auth + membership — o chrome visual fica em `/painel/layout` (DealerAppShell).
 * Cookie de loja ativa só via Server Action (`store-actions` / onboarding), nunca no render.
 */
export default async function DealerLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();

  if (!session.ok) {
    redirect('/entrar?next=/painel');
  }

  const memberships = await listUserStoreMemberships(session.data.userId);

  if (memberships.length === 0) {
    redirect('/para-lojistas/cadastro');
  }

  return children;
}
