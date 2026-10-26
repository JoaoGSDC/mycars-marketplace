import type { VehicleStatusCounts } from '@app-types/inventory';
import { VEHICLE_OWNERSHIP } from '@app-types/membership';
import { PERMISSIONS } from '@app-types/permissions';
import { VEHICLE_STATUS } from '@app-types/status';
import type { AuditEventRow, VehicleCostRow, VehicleMediaRow, VehicleRow } from '@lib/db';
import { authorizeStoreAction } from '@server/auth/access';
import * as auditRepo from '@server/repositories/audit-events.repository';
import * as listingsRepo from '@server/repositories/listings.repository';
import * as costsRepo from '@server/repositories/vehicle-costs.repository';
import * as mediaRepo from '@server/repositories/vehicle-media.repository';
import * as vehiclesRepo from '@server/repositories/vehicles.repository';
import { serviceError, serviceSuccess, type ServiceResult } from '@server/shared/service-result';

import { canTransitionVehicleStatus, isVehicleEditable } from './vehicle-status';
import {
  createVehicleCostSchema,
  createVehicleSchema,
  replaceVehicleMediaSchema,
  transitionVehicleStatusSchema,
  updateVehicleSchema,
  vehicleListQuerySchema,
  type CreateVehicleCostInput,
  type CreateVehicleInput,
  type ReplaceVehicleMediaInput,
  type TransitionVehicleStatusInput,
  type UpdateVehicleInput,
  type VehicleListQueryInput,
} from './vehicles.validators';

const AUDIT_FIELDS = [
  'make',
  'model',
  'version',
  'status',
  'ownership',
  'plate',
  'internalCode',
  'askingPriceCents',
  'mileageKm',
  'condition',
] as const;

function boolToFlag(value: boolean | undefined, fallback = 'false'): string {
  if (value == null) {
    return fallback;
  }

  return value ? 'true' : 'false';
}

function pickAuditDiff(before: VehicleRow, after: VehicleRow): Record<string, { from: unknown; to: unknown }> {
  const diff: Record<string, { from: unknown; to: unknown }> = {};

  for (const key of AUDIT_FIELDS) {
    if (before[key] !== after[key]) {
      diff[key] = { from: before[key], to: after[key] };
    }
  }

  return diff;
}

async function assertUniqueIdentifiers(
  storeId: string,
  plate: string | null | undefined,
  internalCode: string | null | undefined,
  vin: string | null | undefined,
  excludeId?: string
): Promise<ServiceResult<null>> {
  if (plate) {
    const dupPlate = await vehiclesRepo.findVehicleByPlateInStore(storeId, plate, excludeId);

    if (dupPlate) {
      return serviceError('CONFLICT', 'Já existe veículo com esta placa nesta loja');
    }
  }

  if (internalCode) {
    const dupCode = await vehiclesRepo.findVehicleByInternalCodeInStore(
      storeId,
      internalCode,
      excludeId
    );

    if (dupCode) {
      return serviceError('CONFLICT', 'Já existe veículo com este código interno nesta loja');
    }
  }

  if (vin) {
    const dupVin = await vehiclesRepo.findVehicleByVinInStore(storeId, vin, excludeId);

    if (dupVin) {
      return serviceError('CONFLICT', 'Já existe veículo com este chassi/VIN nesta loja');
    }
  }

  return serviceSuccess(null);
}

export async function createVehicle(
  raw: CreateVehicleInput,
  actorUserId: string
): Promise<ServiceResult<VehicleRow>> {
  const parsed = createVehicleSchema.safeParse(raw);

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

  const unique = await assertUniqueIdentifiers(
    parsed.data.storeId,
    parsed.data.plate,
    parsed.data.internalCode,
    parsed.data.vin
  );

  if (!unique.ok) {
    return unique;
  }

  const isDraft = parsed.data.isDraft;
  const status = isDraft ? VEHICLE_STATUS.PREPARING : parsed.data.status;

  const vehicle = await vehiclesRepo.insertVehicle({
    storeId: parsed.data.storeId,
    internalCode: parsed.data.internalCode ?? null,
    make: parsed.data.make,
    makeSlug: parsed.data.makeSlug,
    model: parsed.data.model,
    modelSlug: parsed.data.modelSlug,
    version: parsed.data.version,
    condition: parsed.data.condition,
    status,
    ownership: parsed.data.ownership,
    enteredAt: parsed.data.enteredAt,
    mileageKm: parsed.data.mileageKm,
    fuel: parsed.data.fuel,
    transmission: parsed.data.transmission,
    yearManufacture: parsed.data.yearManufacture,
    yearModel: parsed.data.yearModel,
    bodyType: parsed.data.bodyType,
    color: parsed.data.color ?? null,
    powerKw: parsed.data.powerKw ?? null,
    drivetrain: parsed.data.drivetrain ?? null,
    vin: parsed.data.vin ?? null,
    plate: parsed.data.plate ?? null,
    askingPriceCents: parsed.data.askingPriceCents ?? null,
    consignorName:
      parsed.data.ownership === VEHICLE_OWNERSHIP.CONSIGNED
        ? (parsed.data.consignorName ?? null)
        : null,
    consignorPhone:
      parsed.data.ownership === VEHICLE_OWNERSHIP.CONSIGNED
        ? (parsed.data.consignorPhone ?? null)
        : null,
    consignorDocument:
      parsed.data.ownership === VEHICLE_OWNERSHIP.CONSIGNED
        ? (parsed.data.consignorDocument ?? null)
        : null,
    isDraft: boolToFlag(isDraft),
    notesInternal: parsed.data.notesInternal ?? null,
    notesCommercial: parsed.data.notesCommercial ?? null,
  });

  await auditRepo.insertAuditEvent({
    storeId: vehicle.storeId,
    actorUserId,
    action: isDraft ? 'vehicle.draft_created' : 'vehicle.created',
    entityType: 'vehicle',
    entityId: vehicle.id,
    payloadJson: JSON.stringify({
      make: vehicle.make,
      model: vehicle.model,
      ownership: vehicle.ownership,
      status: vehicle.status,
    }),
  });

  return serviceSuccess(vehicle);
}

export async function updateVehicle(
  raw: UpdateVehicleInput,
  actorUserId: string
): Promise<ServiceResult<VehicleRow>> {
  const parsed = updateVehicleSchema.safeParse(raw);

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

  const existing = await vehiclesRepo.findVehicleInStore(
    parsed.data.storeId,
    parsed.data.vehicleId
  );

  if (!existing) {
    return serviceError('NOT_FOUND', 'Veículo não encontrado nesta loja');
  }

  if (!isVehicleEditable(existing.status)) {
    return serviceError('CONFLICT', 'Veículo vendido não pode ser alterado pelo estoque');
  }

  const nextPlate = parsed.data.plate !== undefined ? parsed.data.plate : existing.plate;
  const nextInternal =
    parsed.data.internalCode !== undefined ? parsed.data.internalCode : existing.internalCode;
  const nextVin = parsed.data.vin !== undefined ? parsed.data.vin : existing.vin;

  const unique = await assertUniqueIdentifiers(
    parsed.data.storeId,
    nextPlate,
    nextInternal,
    nextVin,
    existing.id
  );

  if (!unique.ok) {
    return unique;
  }

  const ownership = parsed.data.ownership ?? existing.ownership;

  const patch: Parameters<typeof vehiclesRepo.updateVehicleRow>[1] = {
    ...(parsed.data.make != null ? { make: parsed.data.make } : {}),
    ...(parsed.data.makeSlug != null ? { makeSlug: parsed.data.makeSlug } : {}),
    ...(parsed.data.model != null ? { model: parsed.data.model } : {}),
    ...(parsed.data.modelSlug != null ? { modelSlug: parsed.data.modelSlug } : {}),
    ...(parsed.data.version != null ? { version: parsed.data.version } : {}),
    ...(parsed.data.condition != null ? { condition: parsed.data.condition } : {}),
    ...(parsed.data.ownership != null ? { ownership: parsed.data.ownership } : {}),
    ...(parsed.data.enteredAt != null ? { enteredAt: parsed.data.enteredAt } : {}),
    ...(parsed.data.mileageKm != null ? { mileageKm: parsed.data.mileageKm } : {}),
    ...(parsed.data.fuel != null ? { fuel: parsed.data.fuel } : {}),
    ...(parsed.data.transmission != null ? { transmission: parsed.data.transmission } : {}),
    ...(parsed.data.yearManufacture != null
      ? { yearManufacture: parsed.data.yearManufacture }
      : {}),
    ...(parsed.data.yearModel != null ? { yearModel: parsed.data.yearModel } : {}),
    ...(parsed.data.bodyType != null ? { bodyType: parsed.data.bodyType } : {}),
    ...(parsed.data.color !== undefined ? { color: parsed.data.color } : {}),
    ...(parsed.data.powerKw !== undefined ? { powerKw: parsed.data.powerKw } : {}),
    ...(parsed.data.drivetrain !== undefined ? { drivetrain: parsed.data.drivetrain } : {}),
    ...(parsed.data.vin !== undefined ? { vin: parsed.data.vin } : {}),
    ...(parsed.data.plate !== undefined ? { plate: parsed.data.plate } : {}),
    ...(parsed.data.askingPriceCents !== undefined
      ? { askingPriceCents: parsed.data.askingPriceCents }
      : {}),
    ...(parsed.data.notesInternal !== undefined
      ? { notesInternal: parsed.data.notesInternal }
      : {}),
    ...(parsed.data.notesCommercial !== undefined
      ? { notesCommercial: parsed.data.notesCommercial }
      : {}),
    ...(parsed.data.internalCode !== undefined
      ? { internalCode: parsed.data.internalCode }
      : {}),
    ...(parsed.data.isDraft != null ? { isDraft: boolToFlag(parsed.data.isDraft) } : {}),
  };

  if (ownership === VEHICLE_OWNERSHIP.CONSIGNED) {
    if (parsed.data.consignorName !== undefined) {
      patch.consignorName = parsed.data.consignorName;
    }
    if (parsed.data.consignorPhone !== undefined) {
      patch.consignorPhone = parsed.data.consignorPhone;
    }
    if (parsed.data.consignorDocument !== undefined) {
      patch.consignorDocument = parsed.data.consignorDocument;
    }
  } else if (parsed.data.ownership === VEHICLE_OWNERSHIP.OWN) {
    patch.consignorName = null;
    patch.consignorPhone = null;
    patch.consignorDocument = null;
  }

  const updated = await vehiclesRepo.updateVehicleRow(existing.id, patch);
  const diff = pickAuditDiff(existing, updated);

  if (Object.keys(diff).length > 0) {
    await auditRepo.insertAuditEvent({
      storeId: updated.storeId,
      actorUserId,
      action: 'vehicle.updated',
      entityType: 'vehicle',
      entityId: updated.id,
      payloadJson: JSON.stringify({ diff }),
    });
  }

  return serviceSuccess(updated);
}

export async function transitionVehicleStatus(
  raw: TransitionVehicleStatusInput,
  actorUserId: string
): Promise<ServiceResult<VehicleRow>> {
  const parsed = transitionVehicleStatusSchema.safeParse(raw);

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

  const existing = await vehiclesRepo.findVehicleInStore(
    parsed.data.storeId,
    parsed.data.vehicleId
  );

  if (!existing) {
    return serviceError('NOT_FOUND', 'Veículo não encontrado nesta loja');
  }

  if (
    !canTransitionVehicleStatus(existing.status, parsed.data.toStatus, parsed.data.source)
  ) {
    return serviceError(
      'CONFLICT',
      `Transição ${existing.status} → ${parsed.data.toStatus} não permitida via ${parsed.data.source}`
    );
  }

  if (existing.status === parsed.data.toStatus) {
    return serviceSuccess(existing);
  }

  const updated = await vehiclesRepo.updateVehicleRow(existing.id, {
    status: parsed.data.toStatus,
    isDraft: 'false',
  });

  await auditRepo.insertAuditEvent({
    storeId: updated.storeId,
    actorUserId,
    action: 'vehicle.status_changed',
    entityType: 'vehicle',
    entityId: updated.id,
    payloadJson: JSON.stringify({
      from: existing.status,
      to: updated.status,
      source: parsed.data.source,
    }),
  });

  if (parsed.data.toStatus === VEHICLE_STATUS.SOLD) {
    const { completeActiveReservationOnSale } = await import(
      '@server/reservations/reservations.service'
    );
    await completeActiveReservationOnSale(updated.storeId, updated.id, actorUserId);

    const { closeListingsForSoldVehicle } = await import('@server/listings/listings.service');
    await closeListingsForSoldVehicle(updated.id, actorUserId);
  }

  return serviceSuccess(updated);
}

export async function getVehicleInStore(
  storeId: string,
  vehicleId: string,
  actorUserId: string
): Promise<ServiceResult<VehicleRow>> {
  const access = await authorizeStoreAction(actorUserId, storeId, PERMISSIONS.VEHICLES_READ);

  if (!access.ok) {
    return access;
  }

  const vehicle = await vehiclesRepo.findVehicleInStore(storeId, vehicleId);

  if (!vehicle) {
    return serviceError('NOT_FOUND', 'Veículo não encontrado nesta loja');
  }

  return serviceSuccess(vehicle);
}

export async function listStoreVehicles(
  storeId: string,
  actorUserId: string
): Promise<ServiceResult<VehicleRow[]>> {
  const access = await authorizeStoreAction(actorUserId, storeId, PERMISSIONS.VEHICLES_READ);

  if (!access.ok) {
    return access;
  }

  const list = await vehiclesRepo.listVehiclesByStore(storeId);

  return serviceSuccess(list);
}

export type VehicleListResult = {
  items: VehicleRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  statusCounts: VehicleStatusCounts;
};

export async function searchStoreVehicles(
  raw: VehicleListQueryInput,
  actorUserId: string
): Promise<ServiceResult<VehicleListResult>> {
  const parsed = vehicleListQuerySchema.safeParse(raw);

  if (!parsed.success) {
    return serviceError('VALIDATION', parsed.error.issues[0]?.message ?? 'Filtros inválidos');
  }

  const access = await authorizeStoreAction(
    actorUserId,
    parsed.data.storeId,
    PERMISSIONS.VEHICLES_READ
  );

  if (!access.ok) {
    return access;
  }

  const [search, statusCounts] = await Promise.all([
    vehiclesRepo.searchVehicles(parsed.data),
    vehiclesRepo.countVehiclesByStatus(parsed.data.storeId),
  ]);

  const totalPages = Math.max(1, Math.ceil(search.total / parsed.data.pageSize));

  return serviceSuccess({
    items: search.items,
    total: search.total,
    page: parsed.data.page,
    pageSize: parsed.data.pageSize,
    totalPages,
    statusCounts,
  });
}

export async function addVehicleCost(
  raw: CreateVehicleCostInput,
  actorUserId: string
): Promise<ServiceResult<VehicleCostRow>> {
  const parsed = createVehicleCostSchema.safeParse(raw);

  if (!parsed.success) {
    return serviceError('VALIDATION', parsed.error.issues[0]?.message ?? 'Dados inválidos');
  }

  const access = await authorizeStoreAction(
    actorUserId,
    parsed.data.storeId,
    PERMISSIONS.COSTS_WRITE
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

  if (!isVehicleEditable(vehicle.status)) {
    return serviceError('CONFLICT', 'Não é possível alterar custos de veículo vendido');
  }

  const cost = await costsRepo.insertVehicleCost({
    storeId: parsed.data.storeId,
    vehicleId: parsed.data.vehicleId,
    type: parsed.data.type,
    amountCents: parsed.data.amountCents,
    incurredAt: parsed.data.incurredAt,
    description: parsed.data.description ?? null,
  });

  await auditRepo.insertAuditEvent({
    storeId: cost.storeId,
    actorUserId,
    action: 'vehicle_cost.created',
    entityType: 'vehicle_cost',
    entityId: cost.id,
    payloadJson: JSON.stringify({
      vehicleId: cost.vehicleId,
      type: cost.type,
      amountCents: cost.amountCents,
      ownership: vehicle.ownership,
    }),
  });

  return serviceSuccess(cost);
}

export async function removeVehicleCost(
  storeId: string,
  costId: string,
  actorUserId: string
): Promise<ServiceResult<{ id: string }>> {
  const access = await authorizeStoreAction(actorUserId, storeId, PERMISSIONS.COSTS_WRITE);

  if (!access.ok) {
    return access;
  }

  const cost = await costsRepo.findCostInStore(storeId, costId);

  if (!cost) {
    return serviceError('NOT_FOUND', 'Custo não encontrado nesta loja');
  }

  const vehicle = await vehiclesRepo.findVehicleInStore(storeId, cost.vehicleId);

  if (vehicle && !isVehicleEditable(vehicle.status)) {
    return serviceError('CONFLICT', 'Não é possível alterar custos de veículo vendido');
  }

  await costsRepo.deleteVehicleCost(storeId, costId);

  await auditRepo.insertAuditEvent({
    storeId,
    actorUserId,
    action: 'vehicle_cost.deleted',
    entityType: 'vehicle_cost',
    entityId: costId,
    payloadJson: JSON.stringify({ vehicleId: cost.vehicleId, amountCents: cost.amountCents }),
  });

  return serviceSuccess({ id: costId });
}

/** Custos são privados — sempre exigir ator autenticado com permissão na loja. */
export async function listPrivateVehicleCosts(
  storeId: string,
  vehicleId: string,
  actorUserId: string
): Promise<ServiceResult<VehicleCostRow[]>> {
  const access = await authorizeStoreAction(actorUserId, storeId, PERMISSIONS.COSTS_READ);

  if (!access.ok) {
    return access;
  }

  const vehicle = await vehiclesRepo.findVehicleInStore(storeId, vehicleId);

  if (!vehicle) {
    return serviceError('NOT_FOUND', 'Veículo não encontrado nesta loja');
  }

  const costs = await costsRepo.listCostsByVehicle(storeId, vehicleId);

  return serviceSuccess(costs);
}

export async function getPrivateVehicleCostTotal(
  storeId: string,
  vehicleId: string,
  actorUserId: string
): Promise<ServiceResult<{ totalCents: number }>> {
  const access = await authorizeStoreAction(actorUserId, storeId, PERMISSIONS.COSTS_READ);

  if (!access.ok) {
    return access;
  }

  const vehicle = await vehiclesRepo.findVehicleInStore(storeId, vehicleId);

  if (!vehicle) {
    return serviceError('NOT_FOUND', 'Veículo não encontrado nesta loja');
  }

  const totalCents = await costsRepo.sumCostsByVehicle(storeId, vehicleId);

  return serviceSuccess({ totalCents });
}

export async function listVehicleMedia(
  storeId: string,
  vehicleId: string,
  actorUserId: string
): Promise<ServiceResult<VehicleMediaRow[]>> {
  const access = await authorizeStoreAction(actorUserId, storeId, PERMISSIONS.VEHICLES_READ);

  if (!access.ok) {
    return access;
  }

  const vehicle = await vehiclesRepo.findVehicleInStore(storeId, vehicleId);

  if (!vehicle) {
    return serviceError('NOT_FOUND', 'Veículo não encontrado nesta loja');
  }

  const media = await mediaRepo.listMediaByVehicle(storeId, vehicleId);

  return serviceSuccess(media);
}

export async function replaceVehicleMedia(
  raw: ReplaceVehicleMediaInput,
  actorUserId: string
): Promise<ServiceResult<VehicleMediaRow[]>> {
  const parsed = replaceVehicleMediaSchema.safeParse(raw);

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

  if (!isVehicleEditable(vehicle.status)) {
    return serviceError('CONFLICT', 'Veículo vendido não pode ter mídia alterada');
  }

  const { insertMediaAssetsAttach, deleteStorageKeysSafe } = await import('@server/media/media-helpers');

  const replaced = await mediaRepo.replaceVehicleMedia(
    parsed.data.storeId,
    parsed.data.vehicleId,
    parsed.data.items.map((item, index) => ({
      url: item.url,
      cardUrl: item.cardUrl ?? null,
      detailUrl: item.detailUrl ?? null,
      storageKey: item.storageKey ?? null,
      mediaAssetId: item.mediaAssetId ?? null,
      sortOrder: item.sortOrder ?? index,
      isPrimary: item.isPrimary ?? index === 0,
      alt: item.alt ?? null,
      width: item.width ?? null,
      height: item.height ?? null,
      mimeType: item.mimeType ?? null,
    }))
  );

  const assetIds = parsed.data.items
    .map((item) => item.mediaAssetId)
    .filter((id): id is string => Boolean(id));

  if (assetIds.length > 0) {
    await insertMediaAssetsAttach({
      storeId: parsed.data.storeId,
      assetIds,
      entityType: 'vehicle',
      entityId: vehicle.id,
      actorUserId,
    });
  }

  const removedKeys = replaced.previous
    .map((row) => row.storageKey)
    .filter((key): key is string => Boolean(key))
    .filter((key) => !parsed.data.items.some((item) => item.storageKey === key));

  await deleteStorageKeysSafe(removedKeys);

  await auditRepo.insertAuditEvent({
    storeId: vehicle.storeId,
    actorUserId,
    action: 'vehicle.media_replaced',
    entityType: 'vehicle',
    entityId: vehicle.id,
    payloadJson: JSON.stringify({ count: replaced.inserted.length }),
  });

  return serviceSuccess(replaced.inserted);
}

function payloadVehicleId(payloadJson: string | null | undefined): string | null {
  if (!payloadJson) {
    return null;
  }

  try {
    const parsed = JSON.parse(payloadJson) as { vehicleId?: unknown };
    return typeof parsed.vehicleId === 'string' ? parsed.vehicleId : null;
  } catch {
    return null;
  }
}

/**
 * Histórico operacional da unidade (auditoria real da loja).
 * Inclui eventos do veículo, custos vinculados e anúncio associado.
 */
export async function listVehicleOperationalHistory(
  storeId: string,
  vehicleId: string,
  actorUserId: string
): Promise<ServiceResult<AuditEventRow[]>> {
  const access = await authorizeStoreAction(actorUserId, storeId, PERMISSIONS.VEHICLES_READ);

  if (!access.ok) {
    return access;
  }

  const vehicle = await vehiclesRepo.findVehicleInStore(storeId, vehicleId);

  if (!vehicle) {
    return serviceError('NOT_FOUND', 'Veículo não encontrado nesta loja');
  }

  const listing = await listingsRepo.findListingByVehicleId(vehicleId);
  const storeEvents = await auditRepo.listAuditEventsByStore(storeId, 200);

  const history = storeEvents.filter((event) => {
    if (event.entityType === 'vehicle' && event.entityId === vehicleId) {
      return true;
    }

    if (listing && event.entityType === 'listing' && event.entityId === listing.id) {
      return true;
    }

    if (
      event.entityType === 'vehicle_cost' ||
      event.entityType === 'sale' ||
      event.entityType === 'reservation'
    ) {
      return payloadVehicleId(event.payloadJson) === vehicleId;
    }

    return false;
  });

  return serviceSuccess(history);
}
