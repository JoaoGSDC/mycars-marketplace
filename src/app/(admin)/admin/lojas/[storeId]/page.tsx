import { redirect } from 'next/navigation';

import { ToastProvider } from '@components/ui';
import { StoreAdminDetailView } from '@features/admin';
import { requirePlatformAdmin } from '@server/auth/platform-admin';
import { listPlansAdmin } from '@server/admin/plans-admin.service';
import { getStoreAdminDetail } from '@server/admin/stores-admin.service';

export default async function AdminStoreDetailPage({
  params,
}: {
  params: Promise<{ storeId: string }>;
}) {
  const admin = await requirePlatformAdmin();

  if (!admin.ok) {
    redirect('/entrar?next=/admin/lojas');
  }

  const { storeId } = await params;
  const [detail, plans] = await Promise.all([
    getStoreAdminDetail(storeId, admin.data.userId),
    listPlansAdmin(admin.data.userId),
  ]);

  if (!detail.ok) {
    redirect('/admin/lojas');
  }

  return (
    <ToastProvider>
      <StoreAdminDetailView
        userName={admin.data.session.user.name}
        store={detail.data.store}
        planAccess={detail.data.planAccess}
        subscriptions={detail.data.subscriptions}
        plans={plans.ok ? plans.data.filter((plan) => plan.isActive === 'true') : []}
        audit={detail.data.audit}
      />
    </ToastProvider>
  );
}
