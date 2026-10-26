import { redirect } from 'next/navigation';

import { ToastProvider } from '@components/ui';
import { ReportsAdminView } from '@features/admin';
import { requirePlatformAdmin } from '@server/auth/platform-admin';
import { listListingReportsAdmin } from '@server/admin/listings-admin.service';

export default async function AdminReportsPage() {
  const admin = await requirePlatformAdmin();

  if (!admin.ok) {
    redirect('/entrar?next=/admin/denuncias');
  }

  const result = await listListingReportsAdmin({ page: 1, pageSize: 50 }, admin.data.userId);

  if (!result.ok) {
    redirect('/admin');
  }

  return (
    <ToastProvider>
      <ReportsAdminView
        userName={admin.data.session.user.name}
        items={result.data.items}
        total={result.data.total}
      />
    </ToastProvider>
  );
}
