import { redirect } from 'next/navigation';

import { ToastProvider } from '@components/ui';
import { AuditAdminView } from '@features/admin';
import { requirePlatformAdmin } from '@server/auth/platform-admin';
import { searchAuditAdmin } from '@server/admin/metrics-admin.service';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const admin = await requirePlatformAdmin();

  if (!admin.ok) {
    redirect('/entrar?next=/admin/auditoria');
  }

  const params = await searchParams;
  const result = await searchAuditAdmin(
    {
      q: first(params.q),
      actionPrefix: first(params.actionPrefix),
      page: 1,
      pageSize: 50,
    },
    admin.data.userId
  );

  if (!result.ok) {
    redirect('/admin');
  }

  return (
    <ToastProvider>
      <AuditAdminView
        userName={admin.data.session.user.name}
        items={result.data.items}
        total={result.data.total}
        filters={{ q: first(params.q), actionPrefix: first(params.actionPrefix) }}
      />
    </ToastProvider>
  );
}
