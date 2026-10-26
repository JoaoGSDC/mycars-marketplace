import { redirect } from 'next/navigation';

import { CustomersListView } from '@features/crm';
import type { StoreRole } from '@app-types/membership';
import { membershipGrantsPermission, PERMISSIONS } from '@app-types/permissions';
import { requireStoreAccess } from '@server/auth/access';
import { searchCustomers } from '@server/crm/customers.service';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

export default async function ClientesPage({ searchParams }: { searchParams: SearchParams }) {
  const access = await requireStoreAccess({ permission: PERMISSIONS.CUSTOMERS_READ });

  if (!access.ok) {
    redirect('/painel');
  }

  const params = await searchParams;
  const page = Number(first(params.page) ?? '1') || 1;

  const result = await searchCustomers(
    {
      storeId: access.data.storeId,
      q: first(params.q),
      page,
      pageSize: 20,
    },
    access.data.userId
  );

  if (!result.ok) {
    redirect('/painel');
  }

  const canWrite = membershipGrantsPermission(
    access.data.membership.role as StoreRole,
    access.data.membership.permissionsJson,
    PERMISSIONS.CUSTOMERS_WRITE
  );

  return (
    <CustomersListView
      items={result.data.items}
      total={result.data.total}
      page={result.data.page}
      totalPages={result.data.totalPages}
      canWrite={canWrite}
      filters={{ q: first(params.q) }}
    />
  );
}
