import {
  AVAILABILITY_CONFIRMATION_SOURCES,
  type AvailabilityReviewItem,
} from '@app-types/integrity';
import { PERMISSIONS } from '@app-types/permissions';
import { LISTING_STATUS, VEHICLE_STATUS } from '@app-types/status';
import { getDb, listings, nowIso, type VehicleRow } from '@lib/db';
import { eq } from 'drizzle-orm';
import { authorizeStoreAction } from '@server/auth/access';
import * as auditRepo from '@server/repositories/audit-events.repository';
import * as integrityRepo from '@server/repositories/integrity.repository';
import * as listingsRepo from '@server/repositories/listings.repository';
import * as vehiclesRepo from '@server/repositories/vehicles.repository';
import { serviceError, serviceSuccess, type ServiceResult } from '@server/shared/service-result';

import {
  confirmAvailabilityBatchSchema,
  confirmAvailabilitySchema,
  updateIntegrityPolicySchema,
  type ConfirmAvailabilityBatchInput,
  type ConfirmAvailabilityInput,
  type UpdateIntegrityPolicyInput,
} from './integrity.validators';

function addDays(iso: string, days: number): string {
  return new Date(new Date(iso).getTime() + days * 24 * 60 * 60 * 1000).toISOString();
}

function boolText(value: boolean): string {
  return value ? 'true' : 'false';
}

function vehicleLabel(vehicle: VehicleRow): string {
  return `${vehicle.make} ${vehicle.model} ${vehicle.yearModel}`;
}

/**
 * Confirma disponibilidade.
 * Não altera status reserved/sold/withdrawn e não marca como vendido.
 */
async function confirmOneVehicle(params: {
  storeId: string;
  vehicle: VehicleRow;
  actorUserId: string;
  source: string;
  notes?: string | null;
  intervalDays: number;
}): Promise<ServiceResult<{ vehicleId: string; resumedListing: boolean }>> {
  if (
    params.vehicle.status !== VEHICLE_STATUS.AVAILABLE &&
    params.vehicle.status !== VEHICLE_STATUS.PREPARING
  ) {
    return serviceError(
      'CONFLICT',
      'Confirmação não se aplica a veículos reservados, vendidos ou retirados'
    );
  }

  const confirmedAt = nowIso();
  const dueAt = addDays(confirmedAt, params.intervalDays);

  await integrityRepo.insertAvailabilityConfirmation({
    storeId: params.storeId,
    vehicleId: params.vehicle.id,
    confirmedAt,
    dueAt,
    source: params.source,
    actorUserId: params.actorUserId,
    notes: params.notes ?? null,
  });

  await integrityRepo.updateVehicleAvailabilityTimestamps(
    params.vehicle.id,
    confirmedAt,
    dueAt
  );

  let resumedListing = false;
  const listing = await listingsRepo.findListingByVehicleId(params.vehicle.id);

  if (
    listing &&
    listing.storeId === params.storeId &&
    listing.status === LISTING_STATUS.PAUSED &&
    listing.availabilityHold === 'true' &&
    params.vehicle.status === VEHICLE_STATUS.AVAILABLE
  ) {
    await listingsRepo.updateListingRow(listing.id, {
      status: LISTING_STATUS.PUBLISHED,
      availabilityHold: 'false',
      publishedAt: listing.publishedAt ?? confirmedAt,
      closedAt: null,
    });
    resumedListing = true;

    await auditRepo.insertAuditEvent({
      storeId: params.storeId,
      actorUserId: params.actorUserId,
      action: 'listing.availability_resumed',
      entityType: 'listing',
      entityId: listing.id,
      payload: { vehicleId: params.vehicle.id, source: params.source },
    });
  }

  await auditRepo.insertAuditEvent({
    storeId: params.storeId,
    actorUserId: params.actorUserId,
    action: 'vehicle.availability_confirmed',
    entityType: 'vehicle',
    entityId: params.vehicle.id,
    payload: {
      source: params.source,
      confirmedAt,
      dueAt,
      resumedListing,
    },
  });

  return serviceSuccess({ vehicleId: params.vehicle.id, resumedListing });
}

export async function confirmVehicleAvailability(
  raw: ConfirmAvailabilityInput,
  actorUserId: string
) {
  const parsed = confirmAvailabilitySchema.safeParse(raw);

  if (!parsed.success) {
    return serviceError('VALIDATION', parsed.error.issues[0]?.message ?? 'Dados inválidos');
  }

  const access = await authorizeStoreAction(
    actorUserId,
    parsed.data.storeId,
    PERMISSIONS.VEHICLES_WRITE
  );

  if (!access.ok) {
    return access;
  }

  const vehicle = await vehiclesRepo.findVehicleInStore(
    parsed.data.storeId,
    parsed.data.vehicleId
  );

  if (!vehicle) {
    return serviceError('NOT_FOUND', 'Veículo não encontrado nesta loja');
  }

  const policy = await integrityRepo.getOrCreateIntegrityPolicy(parsed.data.storeId);

  return confirmOneVehicle({
    storeId: parsed.data.storeId,
    vehicle,
    actorUserId,
    source: AVAILABILITY_CONFIRMATION_SOURCES.MANUAL,
    notes: parsed.data.notes,
    intervalDays: policy.confirmationIntervalDays,
  });
}

export async function confirmVehicleAvailabilityBatch(
  raw: ConfirmAvailabilityBatchInput,
  actorUserId: string
) {
  const parsed = confirmAvailabilityBatchSchema.safeParse(raw);

  if (!parsed.success) {
    return serviceError('VALIDATION', parsed.error.issues[0]?.message ?? 'Dados inválidos');
  }

  const access = await authorizeStoreAction(
    actorUserId,
    parsed.data.storeId,
    PERMISSIONS.VEHICLES_WRITE
  );

  if (!access.ok) {
    return access;
  }

  const policy = await integrityRepo.getOrCreateIntegrityPolicy(parsed.data.storeId);
  const vehicles = await integrityRepo.listConfirmableVehicles(
    parsed.data.storeId,
    parsed.data.vehicleIds
  );

  const confirmed: string[] = [];
  const skipped: Array<{ vehicleId: string; reason: string }> = [];
  const requested = new Set(parsed.data.vehicleIds);

  for (const vehicleId of requested) {
    const vehicle = vehicles.find((row) => row.id === vehicleId);

    if (!vehicle) {
      skipped.push({
        vehicleId,
        reason: 'Indisponível para confirmação (reservado, vendido ou inexistente)',
      });
      continue;
    }

    const result = await confirmOneVehicle({
      storeId: parsed.data.storeId,
      vehicle,
      actorUserId,
      source: AVAILABILITY_CONFIRMATION_SOURCES.BATCH,
      notes: parsed.data.notes,
      intervalDays: policy.confirmationIntervalDays,
    });

    if (result.ok) {
      confirmed.push(vehicleId);
    } else {
      skipped.push({ vehicleId, reason: result.message });
    }
  }

  await auditRepo.insertAuditEvent({
    storeId: parsed.data.storeId,
    actorUserId,
    action: 'vehicle.availability_batch_confirmed',
    entityType: 'store',
    entityId: parsed.data.storeId,
    payload: { confirmedCount: confirmed.length, skippedCount: skipped.length },
  });

  return serviceSuccess({ confirmed, skipped });
}

export async function getAvailabilityReviewQueue(
  storeId: string,
  actorUserId: string
): Promise<ServiceResult<{ items: AvailabilityReviewItem[]; overdueCount: number }>> {
  const access = await authorizeStoreAction(actorUserId, storeId, PERMISSIONS.VEHICLES_READ);

  if (!access.ok) {
    return access;
  }

  const now = nowIso();
  const soon = addDays(now, 3);
  const rows = await integrityRepo.listReviewQueue(storeId);
  const items: AvailabilityReviewItem[] = rows.map((row) => {
    const dueAt = row.vehicle.availabilityDueAt;
    let reviewState: AvailabilityReviewItem['reviewState'] = 'ok';

    if (!dueAt || dueAt <= now) {
      reviewState = 'overdue';
    } else if (dueAt <= soon) {
      reviewState = 'due_soon';
    }

    return {
      vehicleId: row.vehicle.id,
      label: vehicleLabel(row.vehicle),
      status: row.vehicle.status,
      availabilityConfirmedAt: row.vehicle.availabilityConfirmedAt,
      availabilityDueAt: dueAt,
      reviewState,
      listingId: row.listingId,
      listingStatus: row.listingStatus,
      availabilityHold: row.availabilityHold === 'true',
    };
  });

  const overdueCount = items.filter((item) => item.reviewState === 'overdue').length;

  return serviceSuccess({ items, overdueCount });
}

export async function getIntegrityPolicy(storeId: string, actorUserId: string) {
  const access = await authorizeStoreAction(actorUserId, storeId, PERMISSIONS.STORE_READ);

  if (!access.ok) {
    return access;
  }

  const policy = await integrityRepo.getOrCreateIntegrityPolicy(storeId);

  return serviceSuccess({
    storeId: policy.storeId,
    confirmationIntervalDays: policy.confirmationIntervalDays,
    graceDays: policy.graceDays,
    autoPausePublished: policy.autoPausePublished === 'true',
    enabled: policy.enabled === 'true',
  });
}

export async function updateIntegrityPolicy(
  raw: UpdateIntegrityPolicyInput,
  actorUserId: string
) {
  const parsed = updateIntegrityPolicySchema.safeParse(raw);

  if (!parsed.success) {
    return serviceError('VALIDATION', parsed.error.issues[0]?.message ?? 'Dados inválidos');
  }

  const access = await authorizeStoreAction(
    actorUserId,
    parsed.data.storeId,
    PERMISSIONS.STORE_WRITE
  );

  if (!access.ok) {
    return access;
  }

  const policy = await integrityRepo.updateIntegrityPolicy(parsed.data.storeId, {
    confirmationIntervalDays: parsed.data.confirmationIntervalDays,
    graceDays: parsed.data.graceDays,
    autoPausePublished: boolText(parsed.data.autoPausePublished),
    enabled: boolText(parsed.data.enabled),
  });

  await auditRepo.insertAuditEvent({
    storeId: parsed.data.storeId,
    actorUserId,
    action: 'store.integrity_policy_updated',
    entityType: 'store_integrity_policy',
    entityId: parsed.data.storeId,
    payload: {
      confirmationIntervalDays: policy.confirmationIntervalDays,
      graceDays: policy.graceDays,
      autoPausePublished: policy.autoPausePublished,
      enabled: policy.enabled,
    },
  });

  return serviceSuccess({
    storeId: policy.storeId,
    confirmationIntervalDays: policy.confirmationIntervalDays,
    graceDays: policy.graceDays,
    autoPausePublished: policy.autoPausePublished === 'true',
    enabled: policy.enabled === 'true',
  });
}

export async function listVehicleConfirmationHistory(
  storeId: string,
  vehicleId: string,
  actorUserId: string
) {
  const access = await authorizeStoreAction(actorUserId, storeId, PERMISSIONS.AUDIT_READ);

  if (!access.ok) {
    return access;
  }

  const vehicle = await vehiclesRepo.findVehicleInStore(storeId, vehicleId);

  if (!vehicle) {
    return serviceError('NOT_FOUND', 'Veículo não encontrado nesta loja');
  }

  const history = await integrityRepo.listConfirmationsByVehicle(storeId, vehicleId);

  return serviceSuccess(history);
}

/**
 * Ao publicar: inicia ciclo de confirmação se ainda não houver dueAt.
 */
export async function ensureAvailabilityCycleOnPublish(
  storeId: string,
  vehicleId: string,
  actorUserId: string | null
): Promise<void> {
  const vehicle = await vehiclesRepo.findVehicleInStore(storeId, vehicleId);

  if (!vehicle) {
    return;
  }

  if (vehicle.availabilityDueAt) {
    return;
  }

  const policy = await integrityRepo.getOrCreateIntegrityPolicy(storeId);

  if (policy.enabled !== 'true') {
    return;
  }

  const confirmedAt = nowIso();
  const dueAt = addDays(confirmedAt, policy.confirmationIntervalDays);

  await integrityRepo.updateVehicleAvailabilityTimestamps(vehicleId, confirmedAt, dueAt);
  await integrityRepo.insertAvailabilityConfirmation({
    storeId,
    vehicleId,
    confirmedAt,
    dueAt,
    source: AVAILABILITY_CONFIRMATION_SOURCES.SYSTEM,
    actorUserId,
    notes: 'Ciclo iniciado na publicação do anúncio',
  });
}

/**
 * Enforcement idempotente: pausa anúncios publicados com confirmação vencida + tolerância.
 * Nunca marca veículo como vendido; ignora reserved/sold e suspensão admin.
 */
export async function enforceAvailabilityHolds(options: {
  storeId?: string;
  actorUserId?: string | null;
  limit?: number;
} = {}): Promise<{ pausedListingIds: string[]; skipped: number }> {
  const now = nowIso();
  const policiesByStore = new Map<string, Awaited<ReturnType<typeof integrityRepo.getOrCreateIntegrityPolicy>>>();
  const pausedListingIds: string[] = [];
  let skipped = 0;

  async function policyFor(storeId: string) {
    let policy = policiesByStore.get(storeId);

    if (!policy) {
      policy = await integrityRepo.getOrCreateIntegrityPolicy(storeId);
      policiesByStore.set(storeId, policy);
    }

    return policy;
  }

  /** graceCutoff = now - graceDays (dueAt must be older than this). */
  const candidates = await integrityRepo.listOverduePublishedForEnforcement({
    storeId: options.storeId,
    graceCutoffIso: now,
    limit: options.limit ?? 200,
  });

  for (const candidate of candidates) {
    const policy = await policyFor(candidate.vehicle.storeId);

    if (policy.enabled !== 'true' || policy.autoPausePublished !== 'true') {
      skipped += 1;
      continue;
    }

    const dueAt = candidate.vehicle.availabilityDueAt;

    if (!dueAt) {
      skipped += 1;
      continue;
    }

    const expireAt = addDays(dueAt, policy.graceDays);

    if (expireAt > now) {
      skipped += 1;
      continue;
    }

    if (
      candidate.vehicle.status === VEHICLE_STATUS.RESERVED ||
      candidate.vehicle.status === VEHICLE_STATUS.SOLD ||
      candidate.vehicle.status === VEHICLE_STATUS.WITHDRAWN
    ) {
      skipped += 1;
      continue;
    }

    const listing = await listingsRepo.findListingById(candidate.listingId);

    if (!listing || listing.status !== LISTING_STATUS.PUBLISHED) {
      skipped += 1;
      continue;
    }

    if (listing.status === LISTING_STATUS.SUSPENDED) {
      skipped += 1;
      continue;
    }

    await getDb()
      .update(listings)
      .set({
        status: LISTING_STATUS.PAUSED,
        availabilityHold: 'true',
        updatedAt: nowIso(),
      })
      .where(eq(listings.id, listing.id));

    await auditRepo.insertAuditEvent({
      storeId: listing.storeId,
      actorUserId: options.actorUserId ?? null,
      action: 'listing.availability_hold',
      entityType: 'listing',
      entityId: listing.id,
      payload: {
        vehicleId: candidate.vehicle.id,
        dueAt,
        graceDays: policy.graceDays,
        process: 'availability_enforcement',
      },
    });

    pausedListingIds.push(listing.id);
  }

  return { pausedListingIds, skipped };
}
