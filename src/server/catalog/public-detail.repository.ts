import { and, asc, desc, eq, ne, notInArray } from 'drizzle-orm';

import { LISTING_STATUS, STORE_STATUS, VEHICLE_STATUS } from '@app-types/status';
import {
  getDb,
  listings,
  stores,
  storefrontSettings,
  vehicles,
  type ListingRow,
  type StorefrontSettingsRow,
  type StoreRow,
  type VehicleRow,
} from '@lib/db';

import { publicEligibilitySql, type PublicListingJoinRow } from './public-search.repository';

export async function findListingBundleBySlug(
  slug: string
): Promise<PublicListingJoinRow | undefined> {
  const db = getDb();
  const rows = await db
    .select({
      listing: listings,
      vehicle: vehicles,
      store: stores,
    })
    .from(listings)
    .innerJoin(vehicles, eq(listings.vehicleId, vehicles.id))
    .innerJoin(stores, eq(listings.storeId, stores.id))
    .where(eq(listings.slug, slug))
    .limit(1);

  return rows[0];
}

export async function findStorefrontPublic(
  storeId: string
): Promise<StorefrontSettingsRow | undefined> {
  const db = getDb();
  const rows = await db
    .select()
    .from(storefrontSettings)
    .where(eq(storefrontSettings.storeId, storeId))
    .limit(1);

  return rows[0];
}

export async function selectSimilarPublicListings(
  current: { listingId: string; makeSlug: string; modelSlug: string; bodyType: string },
  limit = 6
): Promise<PublicListingJoinRow[]> {
  const db = getDb();

  const sameModel = await db
    .select({
      listing: listings,
      vehicle: vehicles,
      store: stores,
    })
    .from(listings)
    .innerJoin(vehicles, eq(listings.vehicleId, vehicles.id))
    .innerJoin(stores, eq(listings.storeId, stores.id))
    .where(
      and(
        publicEligibilitySql(),
        ne(listings.id, current.listingId),
        eq(vehicles.makeSlug, current.makeSlug),
        eq(vehicles.modelSlug, current.modelSlug)
      )
    )
    .orderBy(desc(listings.publishedAt), asc(listings.id))
    .limit(limit);

  if (sameModel.length >= limit) {
    return sameModel;
  }

  const remaining = limit - sameModel.length;
  const excludeIds = [current.listingId, ...sameModel.map((row) => row.listing.id)];

  const sameBody = await db
    .select({
      listing: listings,
      vehicle: vehicles,
      store: stores,
    })
    .from(listings)
    .innerJoin(vehicles, eq(listings.vehicleId, vehicles.id))
    .innerJoin(stores, eq(listings.storeId, stores.id))
    .where(
      and(
        publicEligibilitySql(),
        notInArray(listings.id, excludeIds),
        eq(vehicles.bodyType, current.bodyType)
      )
    )
    .orderBy(desc(listings.publishedAt), asc(listings.id))
    .limit(remaining);

  return [...sameModel, ...sameBody];
}

export type UnavailableReason =
  | 'sold'
  | 'paused'
  | 'suspended'
  | 'closed'
  | 'withdrawn'
  | 'preparing'
  | 'store_inactive'
  | 'draft';

export function resolveUnavailableReason(
  listing: ListingRow,
  vehicle: VehicleRow,
  store: StoreRow
): UnavailableReason | null {
  if (
    listing.status === LISTING_STATUS.PUBLISHED &&
    (vehicle.status === VEHICLE_STATUS.AVAILABLE || vehicle.status === VEHICLE_STATUS.RESERVED) &&
    store.status === STORE_STATUS.ACTIVE
  ) {
    return null;
  }

  if (store.status !== STORE_STATUS.ACTIVE) {
    return 'store_inactive';
  }

  if (vehicle.status === VEHICLE_STATUS.SOLD) {
    return 'sold';
  }

  if (vehicle.status === VEHICLE_STATUS.WITHDRAWN) {
    return 'withdrawn';
  }

  if (vehicle.status === VEHICLE_STATUS.PREPARING) {
    return 'preparing';
  }

  if (listing.status === LISTING_STATUS.PAUSED) {
    return 'paused';
  }

  if (listing.status === LISTING_STATUS.SUSPENDED) {
    return 'suspended';
  }

  if (listing.status === LISTING_STATUS.CLOSED) {
    return 'closed';
  }

  if (listing.status === LISTING_STATUS.DRAFT) {
    return 'draft';
  }

  return 'closed';
}
