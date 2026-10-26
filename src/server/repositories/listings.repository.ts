import { and, asc, count, desc, eq, inArray, like, or, type SQL } from 'drizzle-orm';

import {
  createId,
  getDb,
  listings,
  nowIso,
  stores,
  vehicleMedia,
  vehicles,
  type ListingRow,
  type NewListingRow,
  type StoreRow,
  type VehicleMediaRow,
  type VehicleRow,
} from '@lib/db';
import { LISTING_STATUS } from '@app-types/status';

export async function insertListing(
  input: Omit<NewListingRow, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
): Promise<ListingRow> {
  const db = getDb();
  const id = input.id ?? createId();
  const stamp = nowIso();

  await db.insert(listings).values({
    ...input,
    id,
    createdAt: stamp,
    updatedAt: stamp,
  });

  const row = await findListingById(id);

  if (!row) {
    throw new Error('Falha ao inserir anúncio');
  }

  return row;
}

export async function findListingById(id: string): Promise<ListingRow | undefined> {
  const db = getDb();
  const rows = await db.select().from(listings).where(eq(listings.id, id)).limit(1);

  return rows[0];
}

export async function findListingBySlug(slug: string): Promise<ListingRow | undefined> {
  const db = getDb();
  const rows = await db.select().from(listings).where(eq(listings.slug, slug)).limit(1);

  return rows[0];
}

export async function findListingByVehicleId(vehicleId: string): Promise<ListingRow | undefined> {
  const db = getDb();
  const rows = await db.select().from(listings).where(eq(listings.vehicleId, vehicleId)).limit(1);

  return rows[0];
}

export async function findListingInStore(
  storeId: string,
  listingId: string
): Promise<ListingRow | undefined> {
  const db = getDb();
  const rows = await db
    .select()
    .from(listings)
    .where(and(eq(listings.storeId, storeId), eq(listings.id, listingId)))
    .limit(1);

  return rows[0];
}

export async function listListingsByStore(storeId: string, status?: string): Promise<ListingRow[]> {
  const db = getDb();

  if (!status) {
    return db
      .select()
      .from(listings)
      .where(eq(listings.storeId, storeId))
      .orderBy(desc(listings.updatedAt));
  }

  return db
    .select()
    .from(listings)
    .where(and(eq(listings.storeId, storeId), eq(listings.status, status)))
    .orderBy(desc(listings.updatedAt));
}

export async function updateListingRow(
  listingId: string,
  patch: Partial<Omit<NewListingRow, 'id' | 'storeId' | 'vehicleId' | 'createdAt'>>
): Promise<ListingRow> {
  const db = getDb();
  await db
    .update(listings)
    .set({ ...patch, updatedAt: nowIso() })
    .where(eq(listings.id, listingId));

  const row = await findListingById(listingId);

  if (!row) {
    throw new Error('Anúncio não encontrado após update');
  }

  return row;
}

export type ListingBundle = {
  listing: ListingRow;
  vehicle: VehicleRow;
  store: StoreRow;
  media: VehicleMediaRow[];
};

export async function findListingBundleById(listingId: string): Promise<ListingBundle | undefined> {
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
    .where(eq(listings.id, listingId))
    .limit(1);

  const row = rows[0];

  if (!row) {
    return undefined;
  }

  const media = await loadListingMedia(row.listing);

  return { ...row, media };
}

export async function findListingBundleBySlug(slug: string): Promise<ListingBundle | undefined> {
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

  const row = rows[0];

  if (!row) {
    return undefined;
  }

  const media = await loadListingMedia(row.listing);

  return { ...row, media };
}

export async function listPublishedListingBundles(limit = 100): Promise<ListingBundle[]> {
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
    .where(eq(listings.status, LISTING_STATUS.PUBLISHED))
    .orderBy(desc(listings.publishedAt))
    .limit(limit);

  const bundles: ListingBundle[] = [];

  for (const row of rows) {
    const media = await loadListingMedia(row.listing);
    bundles.push({ ...row, media });
  }

  return bundles;
}

export async function listStoreListingBundles(storeId: string): Promise<ListingBundle[]> {
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
    .where(eq(listings.storeId, storeId))
    .orderBy(desc(listings.updatedAt));

  const bundles: ListingBundle[] = [];

  for (const row of rows) {
    const media = await loadListingMedia(row.listing);
    bundles.push({ ...row, media });
  }

  return bundles;
}

async function loadListingMedia(listing: ListingRow): Promise<VehicleMediaRow[]> {
  const db = getDb();
  let ids: string[] = [];

  try {
    ids = JSON.parse(listing.mediaIdsJson || '[]') as string[];
  } catch {
    ids = [];
  }

  if (ids.length > 0) {
    const rows = await db.select().from(vehicleMedia).where(inArray(vehicleMedia.id, ids));
    const byId = new Map(rows.map((row) => [row.id, row]));

    return ids.map((id) => byId.get(id)).filter((row): row is VehicleMediaRow => Boolean(row));
  }

  return db
    .select()
    .from(vehicleMedia)
    .where(eq(vehicleMedia.vehicleId, listing.vehicleId))
    .orderBy(asc(vehicleMedia.sortOrder));
}

export async function closePublishedListingsForVehicle(vehicleId: string): Promise<ListingRow[]> {
  const existing = await findListingByVehicleId(vehicleId);

  if (!existing) {
    return [];
  }

  if (
    existing.status !== LISTING_STATUS.PUBLISHED &&
    existing.status !== LISTING_STATUS.PAUSED &&
    existing.status !== LISTING_STATUS.DRAFT
  ) {
    return [];
  }

  const updated = await updateListingRow(existing.id, {
    status: LISTING_STATUS.CLOSED,
    closedAt: nowIso(),
  });

  return [updated];
}

export async function suspendActiveListingsForStore(storeId: string): Promise<number> {
  const db = getDb();
  const active = await db
    .select()
    .from(listings)
    .where(
      and(
        eq(listings.storeId, storeId),
        inArray(listings.status, [
          LISTING_STATUS.PUBLISHED,
          LISTING_STATUS.PAUSED,
          LISTING_STATUS.DRAFT,
        ])
      )
    );

  let suspendedCount = 0;

  for (const row of active) {
    await updateListingRow(row.id, { status: LISTING_STATUS.SUSPENDED });
    suspendedCount += 1;
  }

  return suspendedCount;
}

export async function countPublishedListingsByStore(storeId: string): Promise<number> {
  const db = getDb();
  const [row] = await db
    .select({ value: count() })
    .from(listings)
    .where(
      and(eq(listings.storeId, storeId), eq(listings.status, LISTING_STATUS.PUBLISHED))
    );

  return Number(row?.value ?? 0);
}

export type AdminListingListItem = {
  listing: ListingRow;
  storeName: string;
  storeSlug: string;
  vehicleLabel: string;
};

export async function searchAdminListings(params: {
  status?: string;
  storeId?: string;
  q?: string;
  page: number;
  pageSize: number;
}): Promise<{ items: AdminListingListItem[]; total: number }> {
  const db = getDb();
  const conditions: SQL[] = [];

  if (params.status) {
    conditions.push(eq(listings.status, params.status));
  }

  if (params.storeId) {
    conditions.push(eq(listings.storeId, params.storeId));
  }

  const q = params.q?.trim();

  if (q) {
    const pattern = `%${q}%`;
    conditions.push(
      or(
        like(listings.title, pattern),
        like(listings.slug, pattern),
        like(stores.publicName, pattern),
        like(vehicles.make, pattern),
        like(vehicles.model, pattern),
        like(vehicles.plate, pattern)
      )!
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [totalRow] = await db
    .select({ value: count() })
    .from(listings)
    .innerJoin(stores, eq(listings.storeId, stores.id))
    .innerJoin(vehicles, eq(listings.vehicleId, vehicles.id))
    .where(where);

  const rows = await db
    .select({
      listing: listings,
      storeName: stores.publicName,
      storeSlug: stores.slug,
      vehicleMake: vehicles.make,
      vehicleModel: vehicles.model,
      vehicleYear: vehicles.yearModel,
    })
    .from(listings)
    .innerJoin(stores, eq(listings.storeId, stores.id))
    .innerJoin(vehicles, eq(listings.vehicleId, vehicles.id))
    .where(where)
    .orderBy(desc(listings.updatedAt))
    .limit(params.pageSize)
    .offset((params.page - 1) * params.pageSize);

  return {
    total: Number(totalRow?.value ?? 0),
    items: rows.map((row) => ({
      listing: row.listing,
      storeName: row.storeName,
      storeSlug: row.storeSlug,
      vehicleLabel: `${row.vehicleMake} ${row.vehicleModel} ${row.vehicleYear}`,
    })),
  };
}
