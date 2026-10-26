'use server';

import { revalidatePath, updateTag } from 'next/cache';

import { requireSession } from '@server/auth/access';
import { PUBLIC_CATALOG_CACHE_TAG } from '@server/catalog/public-catalog.service';
import { revalidateDealerDashboard } from '@server/dashboard/dashboard.service';
import {
  addVehicleCost,
  createVehicle,
  removeVehicleCost,
  replaceVehicleMedia,
  searchStoreVehicles,
  transitionVehicleStatus,
  updateVehicle,
} from '@server/vehicles/vehicles.service';
import type {
  CreateVehicleCostInput,
  CreateVehicleInput,
  ReplaceVehicleMediaInput,
  TransitionVehicleStatusInput,
  UpdateVehicleInput,
  VehicleListQueryInput,
} from '@server/vehicles/vehicles.validators';

function actionFail(message: string, code?: string) {
  return { ok: false as const, message, code };
}

function revalidateInventoryDashboard(storeId: string) {
  revalidateDealerDashboard(storeId);
  revalidatePath('/painel');
}

export async function searchInventoryAction(input: VehicleListQueryInput) {
  const session = await requireSession();

  if (!session.ok) {
    return actionFail(session.message, session.code);
  }

  const result = await searchStoreVehicles(input, session.data.userId);

  if (!result.ok) {
    return actionFail(result.message, result.code);
  }

  return { ok: true as const, data: result.data };
}

export async function createVehicleAction(input: CreateVehicleInput) {
  const session = await requireSession();

  if (!session.ok) {
    return actionFail(session.message, session.code);
  }

  const result = await createVehicle(input, session.data.userId);

  if (!result.ok) {
    return actionFail(result.message, result.code);
  }

  revalidateInventoryDashboard(input.storeId);
  revalidatePath('/painel/estoque');

  return { ok: true as const, data: { id: result.data.id } };
}

export async function updateVehicleAction(input: UpdateVehicleInput) {
  const session = await requireSession();

  if (!session.ok) {
    return actionFail(session.message, session.code);
  }

  const result = await updateVehicle(input, session.data.userId);

  if (!result.ok) {
    return actionFail(result.message, result.code);
  }

  revalidateInventoryDashboard(input.storeId);
  revalidatePath('/painel/estoque');
  revalidatePath(`/painel/estoque/${result.data.id}`);

  return { ok: true as const, data: { id: result.data.id } };
}

export async function transitionVehicleStatusAction(input: TransitionVehicleStatusInput) {
  const session = await requireSession();

  if (!session.ok) {
    return actionFail(session.message, session.code);
  }

  const result = await transitionVehicleStatus(input, session.data.userId);

  if (!result.ok) {
    return actionFail(result.message, result.code);
  }

  updateTag(PUBLIC_CATALOG_CACHE_TAG);
  revalidateInventoryDashboard(input.storeId);
  revalidatePath('/painel/estoque');
  revalidatePath(`/painel/estoque/${result.data.id}`);
  revalidatePath('/veiculos');
  revalidatePath('/');

  return { ok: true as const, data: { id: result.data.id, status: result.data.status } };
}

export async function addVehicleCostAction(input: CreateVehicleCostInput) {
  const session = await requireSession();

  if (!session.ok) {
    return actionFail(session.message, session.code);
  }

  const result = await addVehicleCost(input, session.data.userId);

  if (!result.ok) {
    return actionFail(result.message, result.code);
  }

  revalidateInventoryDashboard(input.storeId);
  revalidatePath(`/painel/estoque/${result.data.vehicleId}`);

  return { ok: true as const, data: { id: result.data.id } };
}

export async function removeVehicleCostAction(storeId: string, costId: string, vehicleId: string) {
  const session = await requireSession();

  if (!session.ok) {
    return actionFail(session.message, session.code);
  }

  const result = await removeVehicleCost(storeId, costId, session.data.userId);

  if (!result.ok) {
    return actionFail(result.message, result.code);
  }

  revalidateInventoryDashboard(storeId);
  revalidatePath(`/painel/estoque/${vehicleId}`);

  return { ok: true as const };
}

export async function replaceVehicleMediaAction(input: ReplaceVehicleMediaInput) {
  const session = await requireSession();

  if (!session.ok) {
    return actionFail(session.message, session.code);
  }

  const result = await replaceVehicleMedia(input, session.data.userId);

  if (!result.ok) {
    return actionFail(result.message, result.code);
  }

  revalidatePath(`/painel/estoque/${input.vehicleId}`);

  return { ok: true as const, data: { count: result.data.length } };
}
