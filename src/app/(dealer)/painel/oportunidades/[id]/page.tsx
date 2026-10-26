import { notFound, redirect } from 'next/navigation';

import { OpportunityDetailView } from '@features/crm';
import type { StoreRole } from '@app-types/membership';
import { membershipGrantsPermission, PERMISSIONS } from '@app-types/permissions';
import { VEHICLE_STATUS } from '@app-types/status';
import { requireStoreAccess } from '@server/auth/access';
import {
  getOpportunityDetail,
  listStoreAssignees,
} from '@server/crm/opportunities.service';
import { getActiveReservationForVehicle } from '@server/reservations/reservations.service';
import { getCompletedSaleForVehicle } from '@server/sales/sales.service';
import { getVehicleInStore } from '@server/vehicles/vehicles.service';

type Params = Promise<{ id: string }>;

export default async function OportunidadeDetailPage({ params }: { params: Params }) {
  const access = await requireStoreAccess({ permission: PERMISSIONS.OPPORTUNITIES_READ });

  if (!access.ok) {
    redirect('/painel');
  }

  const { id } = await params;
  const [detail, assignees] = await Promise.all([
    getOpportunityDetail(access.data.storeId, id, access.data.userId),
    listStoreAssignees(access.data.storeId, access.data.userId),
  ]);

  if (!detail.ok) {
    if (detail.code === 'NOT_FOUND') {
      notFound();
    }

    redirect('/painel/oportunidades');
  }

  if (!assignees.ok) {
    redirect('/painel/oportunidades');
  }

  const role = access.data.membership.role as StoreRole;
  const canWrite = membershipGrantsPermission(
    role,
    access.data.membership.permissionsJson,
    PERMISSIONS.OPPORTUNITIES_WRITE
  );
  const canReserve = membershipGrantsPermission(
    role,
    access.data.membership.permissionsJson,
    PERMISSIONS.RESERVATIONS_WRITE
  );
  const canSell = membershipGrantsPermission(
    role,
    access.data.membership.permissionsJson,
    PERMISSIONS.SALES_WRITE
  );

  let activeReservationId: string | null = null;
  let completedSaleId: string | null = null;
  let vehicleSellable = false;
  let vehicleAvailable = false;
  const vehicleId = detail.data.opportunity.vehicleId;

  if (vehicleId) {
    const [vehicle, active, sale] = await Promise.all([
      getVehicleInStore(access.data.storeId, vehicleId, access.data.userId),
      getActiveReservationForVehicle(access.data.storeId, vehicleId, access.data.userId),
      getCompletedSaleForVehicle(access.data.storeId, vehicleId, access.data.userId),
    ]);

    if (vehicle.ok) {
      vehicleAvailable = vehicle.data.status === VEHICLE_STATUS.AVAILABLE;
      vehicleSellable =
        vehicle.data.status === VEHICLE_STATUS.AVAILABLE ||
        vehicle.data.status === VEHICLE_STATUS.RESERVED;
    }

    if (active.ok && active.data) {
      activeReservationId = active.data.id;
    }

    if (sale.ok && sale.data) {
      completedSaleId = sale.data.id;
    }
  }

  return (
    <OpportunityDetailView
      storeId={access.data.storeId}
      opportunity={detail.data.opportunity}
      activities={detail.data.activities}
      tasks={detail.data.tasks}
      assignees={assignees.data}
      canWrite={canWrite}
      canReserve={canReserve && vehicleAvailable}
      activeReservationId={activeReservationId}
      canSell={canSell && vehicleSellable && !completedSaleId}
      completedSaleId={completedSaleId}
    />
  );
}
