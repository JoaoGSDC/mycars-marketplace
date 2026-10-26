import { and, asc, eq, inArray, isNotNull, lte, or, sql } from 'drizzle-orm';

import {
  DEFAULT_CONFIRMATION_GRACE_DAYS,
  DEFAULT_CONFIRMATION_INTERVAL_DAYS,
} from '@app-types/integrity';
import { LISTING_STATUS, VEHICLE_STATUS } from '@app-types/status';
import {
  createId,
  getDb,
  listings,
  nowIso,
  storeIntegrityPolicies,
  vehicleAvailabilityConfirmations,
  vehicles,
  type NewStoreIntegrityPolicyRow,
  type NewVehicleAvailabilityConfirmationRow,
  type StoreIntegrityPolicyRow,
  type VehicleAvailabilityConfirmationRow,
  type VehicleRow,
} from '@lib/db';

export async function getOrCreateIntegrityPolicy(
  storeId: string
): Promise<StoreIntegrityPolicyRow> {
  const db = getDb();
  const existing = await db
    .select()
    .from(storeIntegrityPolicies)
    .where(eq(storeIntegrityPolicies.storeId, storeId))
    .limit(1);

  if (existing[0]) {
    return existing[0];
  }

  const stamp = nowIso();
  const row: NewStoreIntegrityPolicyRow = {
    storeId,
    confirmationIntervalDays: DEFAULT_CONFIRMATION_INTERVAL_DAYS,
    graceDays: DEFAULT_CONFIRMATION_GRACE_DAYS,
    autoPausePublished: 'true',
    enabled: 'true',
    createdAt: stamp,
    updatedAt: stamp,
  };

  await db.insert(storeIntegrityPolicies).values(row);

  return (await db
    .select()
    .from(storeIntegrityPolicies)
    .where(eq(storeIntegrityPolicies.storeId, storeId))
    .limit(1))[0]!;
}

export async function updateIntegrityPolicy(
  storeId: string,
  patch: Partial<
    Pick<
      StoreIntegrityPolicyRow,
      | 'confirmationIntervalDays'
      | 'graceDays'
      | 'autoPausePublished'
      | 'enabled'
    >
  >
): Promise<StoreIntegrityPolicyRow> {
  await getOrCreateIntegrityPolicy(storeId);
  const db = getDb();

  await db
    .update(storeIntegrityPolicies)
    .set({ ...patch, updatedAt: nowIso() })
    .where(eq(storeIntegrityPolicies.storeId, storeId));

  return getOrCreateIntegrityPolicy(storeId);
}

export async function insertAvailabilityConfirmation(
  input: Omit<NewVehicleAvailabilityConfirmationRow, 'id' | 'createdAt' | 'updatedAt'> & {
    id?: string;
  }
): Promise<VehicleAvailabilityConfirmationRow> {
  const db = getDb();
  const id = input.id ?? createId();
  const stamp = nowIso();

  await db.insert(vehicleAvailabilityConfirmations).values({
    ...input,
    id,
    createdAt: stamp,
    updatedAt: stamp,
  });

  const rows = await db
    .select()
    .from(vehicleAvailabilityConfirmations)
    .where(eq(vehicleAvailabilityConfirmations.id, id))
    .limit(1);

  if (!rows[0]) {
    throw new Error('Falha ao registrar confirmação');
  }

  return rows[0];
}

export async function listConfirmationsByVehicle(
  storeId: string,
  vehicleId: string,
  limit = 30
): Promise<VehicleAvailabilityConfirmationRow[]> {
  const db = getDb();

  return db
    .select()
    .from(vehicleAvailabilityConfirmations)
    .where(
      and(
        eq(vehicleAvailabilityConfirmations.storeId, storeId),
        eq(vehicleAvailabilityConfirmations.vehicleId, vehicleId)
      )
    )
    .orderBy(sql`${vehicleAvailabilityConfirmations.confirmedAt} desc`)
    .limit(limit);
}

export async function updateVehicleAvailabilityTimestamps(
  vehicleId: string,
  confirmedAt: string,
  dueAt: string
): Promise<void> {
  const db = getDb();

  await db
    .update(vehicles)
    .set({
      availabilityConfirmedAt: confirmedAt,
      availabilityDueAt: dueAt,
      updatedAt: nowIso(),
    })
    .where(eq(vehicles.id, vehicleId));
}

/** Veículos elegíveis a confirmação: available/preparing (nunca sold/reserved). */
export async function listConfirmableVehicles(
  storeId: string,
  vehicleIds?: string[]
): Promise<VehicleRow[]> {
  const db = getDb();
  const conditions = [
    eq(vehicles.storeId, storeId),
    eq(vehicles.isDraft, 'false'),
    inArray(vehicles.status, [VEHICLE_STATUS.AVAILABLE, VEHICLE_STATUS.PREPARING]),
  ];

  if (vehicleIds && vehicleIds.length > 0) {
    conditions.push(inArray(vehicles.id, vehicleIds));
  }

  return db
    .select()
    .from(vehicles)
    .where(and(...conditions))
    .orderBy(asc(vehicles.availabilityDueAt));
}

export type OverduePublishedCandidate = {
  vehicle: VehicleRow;
  listingId: string;
  listingStatus: string;
  availabilityHold: string;
};

export async function listOverduePublishedForEnforcement(params: {
  storeId?: string;
  graceCutoffIso: string;
  limit?: number;
}): Promise<OverduePublishedCandidate[]> {
  const db = getDb();
  const conditions = [
    eq(listings.status, LISTING_STATUS.PUBLISHED),
    eq(listings.availabilityHold, 'false'),
    inArray(vehicles.status, [VEHICLE_STATUS.AVAILABLE, VEHICLE_STATUS.PREPARING]),
    isNotNull(vehicles.availabilityDueAt),
    lte(vehicles.availabilityDueAt, params.graceCutoffIso),
  ];

  if (params.storeId) {
    conditions.push(eq(listings.storeId, params.storeId));
  }

  const rows = await db
    .select({
      vehicle: vehicles,
      listingId: listings.id,
      listingStatus: listings.status,
      availabilityHold: listings.availabilityHold,
    })
    .from(listings)
    .innerJoin(vehicles, eq(listings.vehicleId, vehicles.id))
    .where(and(...conditions))
    .limit(params.limit ?? 200);

  return rows.map((row) => ({
    vehicle: row.vehicle,
    listingId: row.listingId,
    listingStatus: row.listingStatus,
    availabilityHold: row.availabilityHold,
  }));
}

export async function listReviewQueue(storeId: string) {
  const db = getDb();

  return db
    .select({
      vehicle: vehicles,
      listingId: listings.id,
      listingStatus: listings.status,
      availabilityHold: listings.availabilityHold,
    })
    .from(vehicles)
    .leftJoin(listings, eq(listings.vehicleId, vehicles.id))
    .where(
      and(
        eq(vehicles.storeId, storeId),
        eq(vehicles.isDraft, 'false'),
        inArray(vehicles.status, [VEHICLE_STATUS.AVAILABLE, VEHICLE_STATUS.PREPARING]),
        or(
          isNotNull(vehicles.availabilityDueAt),
          eq(listings.status, LISTING_STATUS.PUBLISHED)
        )!
      )
    )
    .orderBy(asc(vehicles.availabilityDueAt));
}
