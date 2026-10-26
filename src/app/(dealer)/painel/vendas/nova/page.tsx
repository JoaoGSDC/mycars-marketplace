import { redirect } from 'next/navigation';

import { CreateSaleView } from '@features/sales';
import type { StoreRole } from '@app-types/membership';
import { membershipGrantsPermission, PERMISSIONS } from '@app-types/permissions';
import { VEHICLE_STATUS } from '@app-types/status';
import { requireStoreAccess } from '@server/auth/access';
import { searchCustomers, getCustomerDetail } from '@server/crm/customers.service';
import { listStoreAssignees } from '@server/crm/opportunities.service';
import * as costsRepo from '@server/repositories/vehicle-costs.repository';
import * as listingsRepo from '@server/repositories/listings.repository';
import { getVehicleInStore, searchStoreVehicles } from '@server/vehicles/vehicles.service';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

async function mapVehicleOption(
  storeId: string,
  vehicle: {
    id: string;
    make: string;
    model: string;
    yearModel: number;
    plate: string | null;
    ownership: string;
    askingPriceCents: number | null;
    status: string;
  },
  canViewCosts: boolean
) {
  const listing = await listingsRepo.findListingByVehicleId(vehicle.id);

  if (!canViewCosts) {
    return {
      id: vehicle.id,
      label: `${vehicle.make} ${vehicle.model} ${vehicle.yearModel}${vehicle.plate ? ` · ${vehicle.plate}` : ''} · ${vehicle.status}`,
      ownership: vehicle.ownership,
      listedPriceCents: listing?.priceCents ?? vehicle.askingPriceCents,
      costsCents: null as number | null,
      costsIncomplete: false,
    };
  }

  const costs = await costsRepo.listCostsByVehicle(storeId, vehicle.id);
  const costsCents = await costsRepo.sumCostsByVehicle(storeId, vehicle.id);

  return {
    id: vehicle.id,
    label: `${vehicle.make} ${vehicle.model} ${vehicle.yearModel}${vehicle.plate ? ` · ${vehicle.plate}` : ''} · ${vehicle.status}`,
    ownership: vehicle.ownership,
    listedPriceCents: listing?.priceCents ?? vehicle.askingPriceCents,
    costsCents,
    costsIncomplete: vehicle.ownership === 'own' && costs.length === 0,
  };
}

export default async function NovaVendaPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const access = await requireStoreAccess({ permission: PERMISSIONS.SALES_WRITE });

  if (!access.ok) {
    redirect('/painel/vendas');
  }

  const params = await searchParams;
  const initialVehicleId = first(params.vehicleId);
  const initialCustomerId = first(params.customerId);
  const initialOpportunityId = first(params.opportunityId);

  const [customersResult, available, reserved, sellers] = await Promise.all([
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
    searchStoreVehicles(
      {
        storeId: access.data.storeId,
        status: VEHICLE_STATUS.RESERVED,
        page: 1,
        pageSize: 100,
        sort: 'entered_at',
        sortDir: 'desc',
      },
      access.data.userId
    ),
    listStoreAssignees(access.data.storeId, access.data.userId),
  ]);

  if (!customersResult.ok || !available.ok || !reserved.ok || !sellers.ok) {
    redirect('/painel/vendas');
  }

  const canViewCosts = membershipGrantsPermission(
    access.data.membership.role as StoreRole,
    access.data.membership.permissionsJson,
    PERMISSIONS.COSTS_READ
  );

  let customers = customersResult.data.items.map((c) => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
  }));

  if (initialCustomerId && !customers.some((c) => c.id === initialCustomerId)) {
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

  const vehicleRows = [...available.data.items, ...reserved.data.items];
  let vehicles = await Promise.all(
    vehicleRows.map((v) => mapVehicleOption(access.data.storeId, v, canViewCosts))
  );

  if (initialVehicleId && !vehicles.some((v) => v.id === initialVehicleId)) {
    const vehicle = await getVehicleInStore(
      access.data.storeId,
      initialVehicleId,
      access.data.userId
    );

    if (
      vehicle.ok &&
      (vehicle.data.status === VEHICLE_STATUS.AVAILABLE ||
        vehicle.data.status === VEHICLE_STATUS.RESERVED)
    ) {
      vehicles = [
        await mapVehicleOption(access.data.storeId, vehicle.data, canViewCosts),
        ...vehicles,
      ];
    }
  }

  return (
    <CreateSaleView
      storeId={access.data.storeId}
      customers={customers}
      vehicles={vehicles}
      sellers={sellers.data}
      initialVehicleId={initialVehicleId}
      initialCustomerId={initialCustomerId}
      initialOpportunityId={initialOpportunityId}
      defaultSellerUserId={access.data.userId}
      canViewCosts={canViewCosts}
    />
  );
}
