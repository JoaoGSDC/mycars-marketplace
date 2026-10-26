import { redirect, notFound } from 'next/navigation';

import { CustomerDetailView } from '@features/crm';
import type { StoreRole } from '@app-types/membership';
import { membershipGrantsPermission, PERMISSIONS } from '@app-types/permissions';
import { requireStoreAccess } from '@server/auth/access';
import { getCustomerDetail } from '@server/crm/customers.service';

type Params = Promise<{ id: string }>;

export default async function ClienteDetailPage({ params }: { params: Params }) {
  const access = await requireStoreAccess({ permission: PERMISSIONS.CUSTOMERS_READ });

  if (!access.ok) {
    redirect('/painel');
  }

  const { id } = await params;
  const result = await getCustomerDetail(access.data.storeId, id, access.data.userId);

  if (!result.ok) {
    if (result.code === 'NOT_FOUND') {
      notFound();
    }

    redirect('/painel/clientes');
  }

  const canWrite = membershipGrantsPermission(
    access.data.membership.role as StoreRole,
    access.data.membership.permissionsJson,
    PERMISSIONS.CUSTOMERS_WRITE
  );

  return (
    <CustomerDetailView
      storeId={access.data.storeId}
      customer={result.data.customer}
      opportunities={result.data.opportunities}
      possibleDuplicates={result.data.possibleDuplicates}
      canWrite={canWrite}
    />
  );
}
