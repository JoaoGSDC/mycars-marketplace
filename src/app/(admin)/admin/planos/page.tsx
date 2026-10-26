import { redirect } from 'next/navigation';

import { ToastProvider } from '@components/ui';
import { PlansAdminView } from '@features/admin';
import { requirePlatformAdmin } from '@server/auth/platform-admin';
import { listPlansAdmin } from '@server/admin/plans-admin.service';

export default async function AdminPlansPage() {
  const admin = await requirePlatformAdmin();

  if (!admin.ok) {
    redirect('/entrar?next=/admin/planos');
  }

  const plans = await listPlansAdmin(admin.data.userId);

  if (!plans.ok) {
    redirect('/admin');
  }

  return (
    <ToastProvider>
      <PlansAdminView userName={admin.data.session.user.name} plans={plans.data} />
    </ToastProvider>
  );
}
