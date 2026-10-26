import { redirect } from 'next/navigation';

import { CreateReservationView } from '@features/reservations';
import { PERMISSIONS } from '@app-types/permissions';
import { VEHICLE_STATUS } from '@app-types/status';
import { requireStoreAccess } from '@server/auth/access';
import { searchCustomers } from '@server/crm/customers.service';
import { listStoreAssignees } from '@server/crm/opportunities.service';
import { expireDueReservations } from '@server/reservations/reservations.service';
import { searchStoreVehicles } from '@server/vehicles/vehicles.service';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

export default async function NovaReservaPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const access = await requireStoreAccess({ permission: PERMISSIONS.RESERVATIONS_WRITE });

  if (!access.ok) {
    redirect('/painel/reservas');
  }

  const params = await searchParams;
  await expireDueReservations({
    storeId: access.data.storeId,
    vehicleId: first(params.vehicleId),
    actorUserId: access.data.userId,
  });

  const [customersResult, vehiclesResult, assigneesResult] = await Promise.all([
    searchCustomers(
      { storeId: access.data.storeId, page: 1, pageSize: 100 },
      access.data.userId
    ),
    searchStoreVehicles(
      {
        storeId: access.data.storeId,
        status: VEHICLE_STATUS.AVAILABLE,
        page: 1,
        pageSize: 100,
        sort: 'entered_at',
        sortDir: 'desc',
      },
      access.data.userId
    ),
    listStoreAssignees(access.data.storeId, access.data.userId),
  ]);

  if (!customersResult.ok || !vehiclesResult.ok || !assigneesResult.ok) {
    redirect('/painel/reservas');
  }

  const initialCustomerId = first(params.customerId);
  const initialVehicleId = first(params.vehicleId);
  const initialOpportunityId = first(params.opportunityId);

  let customers = customersResult.data.items.map((c) => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
  }));

  if (initialCustomerId && !customers.some((c) => c.id === initialCustomerId)) {
    const { getCustomerDetail } = await import('@server/crm/customers.service');
    const detail = await getCustomerDetail(
      access.data.storeId,
      initialCustomerId,
      access.data.userId
    );

    if (detail.ok) {
      customers = [
        {
          id: detail.data.customer.id,
          name: detail.data.customer.name,
          phone: detail.data.customer.phone,
        },
        ...customers,
      ];
    }
  }

  let vehicles = vehiclesResult.data.items.map((v) => ({
    id: v.id,
    label: `${v.make} ${v.model} ${v.yearModel}${v.plate ? ` · ${v.plate}` : ''}`,
  }));

  if (initialVehicleId && !vehicles.some((v) => v.id === initialVehicleId)) {
    const { getVehicleInStore } = await import('@server/vehicles/vehicles.service');
    const vehicle = await getVehicleInStore(
      access.data.storeId,
      initialVehicleId,
      access.data.userId
    );

    if (vehicle.ok && vehicle.data.status === VEHICLE_STATUS.AVAILABLE) {
      vehicles = [
        {
          id: vehicle.data.id,
          label: `${vehicle.data.make} ${vehicle.data.model} ${vehicle.data.yearModel}`,
        },
        ...vehicles,
      ];
    }
  }

  return (
    <CreateReservationView
      storeId={access.data.storeId}
      customers={customers}
      vehicles={vehicles}
      assignees={assigneesResult.data}
      initialVehicleId={initialVehicleId}
      initialCustomerId={initialCustomerId}
      initialOpportunityId={initialOpportunityId}
    />
  );
}
