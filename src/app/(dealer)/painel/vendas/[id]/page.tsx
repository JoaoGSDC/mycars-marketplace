import { notFound, redirect } from 'next/navigation';

import { SaleDetailView } from '@features/sales';
import type { StoreRole } from '@app-types/membership';
import { membershipGrantsPermission, PERMISSIONS } from '@app-types/permissions';
import { requireStoreAccess } from '@server/auth/access';
import { getSaleDetail } from '@server/sales/sales.service';

type Params = Promise<{ id: string }>;

export default async function VendaDetailPage({ params }: { params: Params }) {
  const access = await requireStoreAccess({ permission: PERMISSIONS.SALES_READ });

  if (!access.ok) {
    redirect('/painel');
  }

  const { id } = await params;
  const detail = await getSaleDetail(access.data.storeId, id, access.data.userId);

  if (!detail.ok) {
    if (detail.code === 'NOT_FOUND') {
      notFound();
    }

    redirect('/painel/vendas');
  }

  const canWrite = membershipGrantsPermission(
    access.data.membership.role as StoreRole,
    access.data.membership.permissionsJson,
    PERMISSIONS.SALES_WRITE
  );

  return (
    <SaleDetailView
      storeId={access.data.storeId}
      sale={detail.data.sale}
      events={detail.data.events}
      canWrite={canWrite}
      canViewCosts={detail.data.canViewCosts}
    />
  );
}
