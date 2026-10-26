import { redirect } from 'next/navigation';

import { InventoryListView } from '@features/inventory';
import type { StoreRole } from '@app-types/membership';
import { membershipGrantsPermission, PERMISSIONS } from '@app-types/permissions';
import { LISTING_STATUS, VEHICLE_STATUS } from '@app-types/status';
import { requireStoreAccess } from '@server/auth/access';
import * as listingsRepo from '@server/repositories/listings.repository';
import * as vehiclesRepo from '@server/repositories/vehicles.repository';
import { searchStoreVehicles } from '@server/vehicles/vehicles.service';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const PAGE_SIZE = 20;
const PUBLICATION_FILTERS = new Set(['none', 'issues', 'published']);

function first(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

export default async function EstoquePage({ searchParams }: { searchParams: SearchParams }) {
  const access = await requireStoreAccess({ permission: PERMISSIONS.VEHICLES_READ });

  if (!access.ok) {
    redirect('/painel');
  }

  const params = await searchParams;
  const page = Number(first(params.page) ?? '1') || 1;
  const yearFromRaw = first(params.yearFrom);
  const yearToRaw = first(params.yearTo);
  const publicationRaw = first(params.publicacao);
  const publication =
    publicationRaw && PUBLICATION_FILTERS.has(publicationRaw) ? publicationRaw : undefined;

  const storeListings = await listingsRepo.listListingsByStore(access.data.storeId);
  const listingsByVehicleId = Object.fromEntries(
    storeListings.map((listing) => [
      listing.vehicleId,
      {
        id: listing.id,
        status: listing.status,
        availabilityHold: listing.availabilityHold,
      },
    ])
  );

  const canWrite = membershipGrantsPermission(
    access.data.membership.role as StoreRole,
    access.data.membership.permissionsJson,
    PERMISSIONS.VEHICLES_WRITE
  );

  const baseFilters = {
    q: first(params.q),
    status: first(params.status),
    makeSlug: first(params.makeSlug),
    modelSlug: first(params.modelSlug),
    yearFrom: yearFromRaw,
    yearTo: yearToRaw,
    ownership: first(params.ownership),
    sort: first(params.sort),
    sortDir: first(params.sortDir),
    publicacao: publication,
  };

  /** Filtro de publicação exige join com listings — pagina em memória após a busca base. */
  if (publication) {
    const result = await searchStoreVehicles(
      {
        storeId: access.data.storeId,
        q: first(params.q),
        status: first(params.status) as never,
        makeSlug: first(params.makeSlug),
        modelSlug: first(params.modelSlug),
        yearFrom: yearFromRaw ? Number(yearFromRaw) : undefined,
        yearTo: yearToRaw ? Number(yearToRaw) : undefined,
        ownership: first(params.ownership) as never,
        sort: (first(params.sort) as never) ?? 'entered_at',
        sortDir: (first(params.sortDir) as never) ?? 'desc',
        page: 1,
        pageSize: 500,
      },
      access.data.userId
    );

    if (!result.ok) {
      redirect('/painel');
    }

    const filtered = result.data.items.filter((vehicle) => {
      const listing = listingsByVehicleId[vehicle.id];

      if (publication === 'none') {
        return (
          vehicle.isDraft === 'false' &&
          (vehicle.status === VEHICLE_STATUS.AVAILABLE ||
            vehicle.status === VEHICLE_STATUS.PREPARING) &&
          (!listing || listing.status !== LISTING_STATUS.PUBLISHED)
        );
      }

      if (publication === 'issues') {
        return Boolean(
          listing &&
            (listing.status === LISTING_STATUS.DRAFT ||
              listing.status === LISTING_STATUS.PAUSED ||
              listing.status === LISTING_STATUS.SUSPENDED)
        );
      }

      return listing?.status === LISTING_STATUS.PUBLISHED;
    });

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const safePage = Math.min(Math.max(page, 1), totalPages);
    const items = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
    const statusCounts = await vehiclesRepo.countVehiclesByStatus(access.data.storeId);

    return (
      <InventoryListView
        storeId={access.data.storeId}
        items={items}
        listingsByVehicleId={listingsByVehicleId}
        total={total}
        page={safePage}
        pageSize={PAGE_SIZE}
        totalPages={totalPages}
        statusCounts={statusCounts}
        canWrite={canWrite}
        filters={baseFilters}
      />
    );
  }

  const result = await searchStoreVehicles(
    {
      storeId: access.data.storeId,
      q: first(params.q),
      status: first(params.status) as never,
      makeSlug: first(params.makeSlug),
      modelSlug: first(params.modelSlug),
      yearFrom: yearFromRaw ? Number(yearFromRaw) : undefined,
      yearTo: yearToRaw ? Number(yearToRaw) : undefined,
      ownership: first(params.ownership) as never,
      sort: (first(params.sort) as never) ?? 'entered_at',
      sortDir: (first(params.sortDir) as never) ?? 'desc',
      page,
      pageSize: PAGE_SIZE,
    },
    access.data.userId
  );

  if (!result.ok) {
    redirect('/painel');
  }

  return (
    <InventoryListView
      storeId={access.data.storeId}
      items={result.data.items}
      listingsByVehicleId={listingsByVehicleId}
      total={result.data.total}
      page={result.data.page}
      pageSize={result.data.pageSize}
      totalPages={result.data.totalPages}
      statusCounts={result.data.statusCounts}
      canWrite={canWrite}
      filters={baseFilters}
    />
  );
}
