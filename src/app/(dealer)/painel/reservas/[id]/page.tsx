import { notFound, redirect } from 'next/navigation';

import { ReservationDetailView } from '@features/reservations';
import type { StoreRole } from '@app-types/membership';
import { membershipGrantsPermission, PERMISSIONS } from '@app-types/permissions';
import { requireStoreAccess } from '@server/auth/access';
import { getReservationDetail } from '@server/reservations/reservations.service';

type Params = Promise<{ id: string }>;

export default async function ReservaDetailPage({ params }: { params: Params }) {
  const access = await requireStoreAccess({ permission: PERMISSIONS.RESERVATIONS_READ });

  if (!access.ok) {
    redirect('/painel');
  }

  const { id } = await params;
  const detail = await getReservationDetail(access.data.storeId, id, access.data.userId);

  if (!detail.ok) {
    if (detail.code === 'NOT_FOUND') {
      notFound();
    }

    redirect('/painel/reservas');
  }

  const canWrite = membershipGrantsPermission(
    access.data.membership.role as StoreRole,
    access.data.membership.permissionsJson,
    PERMISSIONS.RESERVATIONS_WRITE
  );

  return (
    <ReservationDetailView
      storeId={access.data.storeId}
      reservation={detail.data.reservation}
      events={detail.data.events}
      canWrite={canWrite}
    />
  );
}
