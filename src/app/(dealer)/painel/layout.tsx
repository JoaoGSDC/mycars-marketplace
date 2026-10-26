import { redirect } from 'next/navigation';

import { ToastProvider } from '@components/ui';
import { DealerAppShell } from '@features/dealer';
import { requireSession, requireStoreAccess } from '@server/auth/access';
import { PERMISSIONS } from '@app-types/permissions';
import type { StoreRole } from '@app-types/membership';

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();

  if (!session.ok) {
    redirect('/entrar?next=/painel');
  }

  const access = await requireStoreAccess({ permission: PERMISSIONS.STORE_READ });

  if (!access.ok) {
    redirect('/para-lojistas/cadastro');
  }

  return (
    <ToastProvider>
      <DealerAppShell
        userName={session.data.session.user.name}
        storeName={access.data.store.publicName}
        storeCity={access.data.store.city}
        storeState={access.data.store.state}
        storeStatus={access.data.store.status}
        role={access.data.role as StoreRole}
        permissionsJson={access.data.membership.permissionsJson}
      >
        {children}
      </DealerAppShell>
    </ToastProvider>
  );
}
