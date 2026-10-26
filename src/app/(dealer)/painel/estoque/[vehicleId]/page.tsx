import { notFound, redirect } from 'next/navigation';

import { VehicleDetailView } from '@features/inventory';
import type { StoreRole } from '@app-types/membership';
import { membershipGrantsPermission, PERMISSIONS } from '@app-types/permissions';
import type { AuditEventRow, ListingRow, VehicleCostRow } from '@lib/db';
import { requireStoreAccess } from '@server/auth/access';
import { getStoreListingDetail } from '@server/listings/listings.service';
import * as listingsRepo from '@server/repositories/listings.repository';
import { getActiveReservationForVehicle } from '@server/reservations/reservations.service';
import { getCompletedSaleForVehicle } from '@server/sales/sales.service';
import {
  getPrivateVehicleCostTotal,
  getVehicleInStore,
  listPrivateVehicleCosts,
  listVehicleMedia,
  listVehicleOperationalHistory,
} from '@server/vehicles/vehicles.service';

type Params = Promise<{ vehicleId: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

export default async function VeiculoDetailPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const access = await requireStoreAccess({ permission: PERMISSIONS.VEHICLES_READ });

  if (!access.ok) {
    redirect('/painel');
  }

  const { vehicleId } = await params;
  const query = await searchParams;
  const initialEditing = first(query.editar) === '1';
  const initialTab = first(query.aba);
  const initialPublish = first(query.publicar) === '1';
  const vehicle = await getVehicleInStore(access.data.storeId, vehicleId, access.data.userId);

  if (!vehicle.ok) {
    notFound();
  }

  const role = access.data.membership.role as StoreRole;
  const canWrite = membershipGrantsPermission(
    role,
    access.data.membership.permissionsJson,
    PERMISSIONS.VEHICLES_WRITE
  );
  const canReadCosts = membershipGrantsPermission(
    role,
    access.data.membership.permissionsJson,
    PERMISSIONS.COSTS_READ
  );
  const canWriteCosts = membershipGrantsPermission(
    role,
    access.data.membership.permissionsJson,
    PERMISSIONS.COSTS_WRITE
  );
  const canCreateListing = membershipGrantsPermission(
    role,
    access.data.membership.permissionsJson,
    PERMISSIONS.LISTINGS_WRITE
  );
  const canPublishListing = membershipGrantsPermission(
    role,
    access.data.membership.permissionsJson,
    PERMISSIONS.LISTINGS_PUBLISH
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

  const [activeReservation, completedSale, historyResult] = await Promise.all([
    getActiveReservationForVehicle(access.data.storeId, vehicleId, access.data.userId),
    getCompletedSaleForVehicle(access.data.storeId, vehicleId, access.data.userId),
    listVehicleOperationalHistory(access.data.storeId, vehicleId, access.data.userId),
  ]);

  const media = await listVehicleMedia(access.data.storeId, vehicleId, access.data.userId);
  const listingRow = await listingsRepo.findListingByVehicleId(vehicleId);

  let listing: Pick<
    ListingRow,
    'id' | 'status' | 'priceCents' | 'publishedAt' | 'slug' | 'availabilityHold' | 'title'
  > | null = null;
  let listingEditor: {
    listing: ListingRow;
    mediaIds: string[];
    history: AuditEventRow[];
  } | null = null;

  if (listingRow) {
    listing = {
      id: listingRow.id,
      status: listingRow.status,
      priceCents: listingRow.priceCents,
      publishedAt: listingRow.publishedAt,
      slug: listingRow.slug,
      availabilityHold: listingRow.availabilityHold,
      title: listingRow.title,
    };

    const detail = await getStoreListingDetail(
      access.data.storeId,
      listingRow.id,
      access.data.userId
    );

    if (detail.ok) {
      listingEditor = {
        listing: detail.data.listing,
        mediaIds: detail.data.mediaIds,
        history: detail.data.history,
      };
    }
  }

  let costRows: VehicleCostRow[] = [];
  let costTotalCents: number | null = null;
  let history: AuditEventRow[] = [];

  if (canReadCosts) {
    const listed = await listPrivateVehicleCosts(
      access.data.storeId,
      vehicleId,
      access.data.userId
    );
    const total = await getPrivateVehicleCostTotal(
      access.data.storeId,
      vehicleId,
      access.data.userId
    );

    if (listed.ok) {
      costRows = listed.data;
    }

    if (total.ok) {
      costTotalCents = total.data.totalCents;
    }
  }

  if (historyResult.ok) {
    history = historyResult.data;
  }

  return (
    <VehicleDetailView
      storeId={access.data.storeId}
      vehicle={vehicle.data}
      costs={costRows}
      costTotalCents={costTotalCents}
      media={media.ok ? media.data : []}
      history={history}
      listing={listing}
      listingEditor={listingEditor}
      canWrite={canWrite}
      canReadCosts={canReadCosts}
      canWriteCosts={canWriteCosts}
      initialEditing={initialEditing}
      initialTab={initialTab}
      initialPublish={initialPublish}
      canCreateListing={canCreateListing}
      canPublishListing={canPublishListing}
      canReserve={canReserve}
      activeReservationId={
        activeReservation.ok && activeReservation.data ? activeReservation.data.id : null
      }
      canSell={canSell}
      completedSaleId={
        completedSale.ok && completedSale.data ? completedSale.data.id : null
      }
    />
  );
}
