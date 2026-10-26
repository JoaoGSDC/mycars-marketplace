import { redirect } from 'next/navigation';

import { ToastProvider } from '@components/ui';
import { TeamAdminView } from '@features/admin';
import { requirePlatformAdmin } from '@server/auth/platform-admin';
import { listPlatformUsersAdmin } from '@server/admin/metrics-admin.service';

export default async function AdminTeamPage() {
  const admin = await requirePlatformAdmin();

  if (!admin.ok) {
    redirect('/entrar?next=/admin/equipe');
  }

  const users = await listPlatformUsersAdmin(admin.data.userId);

  if (!users.ok) {
    redirect('/admin');
  }

  return (
    <ToastProvider>
      <TeamAdminView userName={admin.data.session.user.name} admins={users.data} />
    </ToastProvider>
  );
}
