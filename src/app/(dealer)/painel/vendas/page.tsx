import { redirect } from 'next/navigation';

import { SalesListView } from '@features/sales';
import type { StoreRole } from '@app-types/membership';
import { membershipGrantsPermission, PERMISSIONS } from '@app-types/permissions';
import type { SaleStatus } from '@app-types/status';
import { requireStoreAccess } from '@server/auth/access';
import { listStoreAssignees } from '@server/crm/opportunities.service';
import { searchSales } from '@server/sales/sales.service';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

export default async function VendasPage({ searchParams }: { searchParams: SearchParams }) {
  const access = await requireStoreAccess({ permission: PERMISSIONS.SALES_READ });

  if (!access.ok) {
    redirect('/painel');
  }

  const params = await searchParams;
  const page = Number(first(params.page) ?? '1') || 1;

  const [result, sellers] = await Promise.all([
    searchSales(
      {
        storeId: access.data.storeId,
        status: first(params.status) as SaleStatus | undefined,
        sellerUserId: first(params.sellerUserId),
        vehicleId: first(params.vehicleId),
        q: first(params.q),
        from: first(params.from),
        to: first(params.to),
        page,
        pageSize: 20,
      },
      access.data.userId
    ),
    listStoreAssignees(access.data.storeId, access.data.userId),
  ]);

  if (!result.ok || !sellers.ok) {
    redirect('/painel');
  }

  const canWrite = membershipGrantsPermission(
    access.data.membership.role as StoreRole,
    access.data.membership.permissionsJson,
    PERMISSIONS.SALES_WRITE
  );

  return (
    <SalesListView
      items={result.data.items}
      total={result.data.total}
      page={result.data.page}
      totalPages={result.data.totalPages}
      statusCounts={result.data.statusCounts}
      completedVolumeCents={result.data.completedVolumeCents}
      sellers={sellers.data}
      canWrite={canWrite}
      filters={{
        status: first(params.status),
        sellerUserId: first(params.sellerUserId),
        q: first(params.q),
        from: first(params.from),
        to: first(params.to),
      }}
    />
  );
}
