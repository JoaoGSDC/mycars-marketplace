'use server';

import { revalidatePath, updateTag } from 'next/cache';

import { requireSession } from '@server/auth/access';
import { PUBLIC_CATALOG_CACHE_TAG } from '@server/catalog/public-catalog.service';
import { revalidateDealerDashboard } from '@server/dashboard/dashboard.service';
import {
  cancelReservation,
  createReservation,
  extendReservation,
} from '@server/reservations/reservations.service';
import type {
  CancelReservationInput,
  CreateReservationInput,
  ExtendReservationInput,
} from '@server/reservations/reservations.validators';

function fail(message: string, code?: string) {
  return { ok: false as const, message, code };
}

function revalidateReservationPaths(storeId: string) {
  updateTag(PUBLIC_CATALOG_CACHE_TAG);
  revalidateDealerDashboard(storeId);
  revalidatePath('/painel');
  revalidatePath('/painel/reservas');
  revalidatePath('/painel/estoque');
  revalidatePath('/painel/oportunidades');
  revalidatePath('/veiculos');
  revalidatePath('/');
}

export async function createReservationAction(input: CreateReservationInput) {
  const session = await requireSession();

  if (!session.ok) {
    return fail(session.message, session.code);
  }

  const result = await createReservation(input, session.data.userId);

  if (!result.ok) {
    return fail(result.message, result.code);
  }

  revalidateReservationPaths(input.storeId);
  revalidatePath(`/painel/estoque/${input.vehicleId}`);
  revalidatePath(`/painel/reservas/${result.data.id}`);

  if (input.opportunityId) {
    revalidatePath(`/painel/oportunidades/${input.opportunityId}`);
  }

  return { ok: true as const, data: { id: result.data.id } };
}

export async function extendReservationAction(input: ExtendReservationInput) {
  const session = await requireSession();

  if (!session.ok) {
    return fail(session.message, session.code);
  }

  const result = await extendReservation(input, session.data.userId);

  if (!result.ok) {
    return fail(result.message, result.code);
  }

  revalidateReservationPaths(input.storeId);
  revalidatePath(`/painel/reservas/${input.reservationId}`);

  return { ok: true as const, data: result.data };
}

export async function cancelReservationAction(input: CancelReservationInput) {
  const session = await requireSession();

  if (!session.ok) {
    return fail(session.message, session.code);
  }

  const result = await cancelReservation(input, session.data.userId);

  if (!result.ok) {
    return fail(result.message, result.code);
  }

  revalidateReservationPaths(input.storeId);
  revalidatePath(`/painel/reservas/${input.reservationId}`);
  revalidatePath(`/painel/estoque/${result.data.vehicleId}`);

  return { ok: true as const, data: result.data };
}
