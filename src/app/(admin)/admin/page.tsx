import { redirect } from 'next/navigation';

import { ToastProvider } from '@components/ui';
import { AdminHomeView } from '@features/admin';
import { requirePlatformAdmin } from '@server/auth/platform-admin';
import { getPlatformMetricsAdmin } from '@server/admin/metrics-admin.service';
import { listPendingApplications } from '@server/onboarding/onboarding.service';

export default async function AdminHomePage() {
  const admin = await requirePlatformAdmin();

  if (!admin.ok) {
    redirect(admin.code === 'UNAUTHORIZED' ? '/entrar?next=/admin' : '/painel');
  }

  const [list, metrics] = await Promise.all([
    listPendingApplications(admin.data.userId),
    getPlatformMetricsAdmin({}, admin.data.userId),
  ]);

  if (!metrics.ok) {
    redirect('/painel');
  }

  const fromLabel = new Date(metrics.data.period.from).toLocaleDateString('pt-BR');
  const toLabel = new Date(metrics.data.period.to).toLocaleDateString('pt-BR');

  return (
    <ToastProvider>
      <AdminHomeView
        userName={admin.data.session.user.name}
        pendingCount={list.ok ? list.data.length : 0}
        metrics={metrics.data.metrics}
        periodLabel={`${fromLabel} – ${toLabel}`}
      />
    </ToastProvider>
  );
}
