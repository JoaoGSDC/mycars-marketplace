import { redirect } from 'next/navigation';

import { ToastProvider } from '@components/ui';
import { StoresAdminView } from '@features/admin';
import { requirePlatformAdmin } from '@server/auth/platform-admin';
import { searchStoresForAdmin } from '@server/admin/stores-admin.service';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminStoresPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const admin = await requirePlatformAdmin();

  if (!admin.ok) {
    redirect('/entrar?next=/admin/lojas');
  }

  const params = await searchParams;
  const result = await searchStoresForAdmin(
    {
      status: first(params.status) as never,
      q: first(params.q),
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
      <StoresAdminView
        userName={admin.data.session.user.name}
        items={result.data.items}
        total={result.data.total}
        filters={{ status: first(params.status), q: first(params.q) }}
      />
    </ToastProvider>
  );
}
