import { redirect } from 'next/navigation';

import { ReservationsListView } from '@features/reservations';
import type { StoreRole } from '@app-types/membership';
import { membershipGrantsPermission, PERMISSIONS } from '@app-types/permissions';
import type { ReservationStatus } from '@app-types/status';
import { requireStoreAccess } from '@server/auth/access';
import { searchReservations } from '@server/reservations/reservations.service';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

export default async function ReservasPage({ searchParams }: { searchParams: SearchParams }) {
  const access = await requireStoreAccess({ permission: PERMISSIONS.RESERVATIONS_READ });

  if (!access.ok) {
    redirect('/painel');
  }

  const params = await searchParams;
  const page = Number(first(params.page) ?? '1') || 1;
  const status = first(params.status) as ReservationStatus | undefined;

  const result = await searchReservations(
    {
      storeId: access.data.storeId,
      status,
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
    PERMISSIONS.RESERVATIONS_WRITE
  );

  return (
    <ReservationsListView
      items={result.data.items}
      total={result.data.total}
      page={result.data.page}
      totalPages={result.data.totalPages}
      statusCounts={result.data.statusCounts}
      canWrite={canWrite}
      filters={{ status, q: first(params.q) }}
    />
  );
}
