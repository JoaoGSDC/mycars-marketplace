import { redirect } from 'next/navigation';

import { ToastProvider } from '@components/ui';
import { ApplicationsAdminView } from '@features/admin';
import { requirePlatformAdmin } from '@server/auth/platform-admin';
import { listPendingApplications } from '@server/onboarding/onboarding.service';

export default async function AdminApplicationsPage() {
  const admin = await requirePlatformAdmin();

  if (!admin.ok) {
    redirect(admin.code === 'UNAUTHORIZED' ? '/entrar?next=/admin/solicitacoes' : '/painel');
  }

  const list = await listPendingApplications(admin.data.userId);

  return (
    <ToastProvider>
      <ApplicationsAdminView
        userName={admin.data.session.user.name}
        applications={list.ok ? list.data : []}
      />
    </ToastProvider>
  );
}
