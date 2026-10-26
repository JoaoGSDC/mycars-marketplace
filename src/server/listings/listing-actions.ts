'use server';

import { revalidatePath, updateTag } from 'next/cache';

import { requireSession } from '@server/auth/access';
import { PUBLIC_CATALOG_CACHE_TAG } from '@server/catalog/public-catalog.service';
import { revalidateDealerDashboard } from '@server/dashboard/dashboard.service';
import {
  createListingForStore,
  transitionListing,
  updateListing,
} from '@server/listings/listings.service';
import type {
  CreateListingInput,
  TransitionListingInput,
  UpdateListingInput,
} from '@server/listings/listings.validators';

function fail(message: string, code?: string) {
  return { ok: false as const, message, code };
}

function revalidateListingPaths(
  storeId?: string,
  storeSlug?: string,
  listingSlug?: string,
  vehicleId?: string
) {
  updateTag(PUBLIC_CATALOG_CACHE_TAG);
  if (storeId) {
    revalidateDealerDashboard(storeId);
  }
  revalidatePath('/painel');
  revalidatePath('/painel/estoque');
  revalidatePath('/veiculos');
  revalidatePath('/');

  if (vehicleId) {
    revalidatePath(`/painel/estoque/${vehicleId}`);
  }

  if (listingSlug) {
    revalidatePath(`/veiculos/${listingSlug}`);
  }

  if (storeSlug) {
    revalidatePath(`/lojas/${storeSlug}`);
  }
}

export async function createListingAction(input: CreateListingInput) {
  const session = await requireSession();

  if (!session.ok) {
    return fail(session.message, session.code);
  }

  const result = await createListingForStore(input, session.data.userId);

  if (!result.ok) {
    return fail(result.message, result.code);
  }

  revalidateListingPaths(input.storeId, undefined, result.data.slug, input.vehicleId);

  return { ok: true as const, data: { id: result.data.id, slug: result.data.slug } };
}

export async function updateListingAction(input: UpdateListingInput) {
  const session = await requireSession();

  if (!session.ok) {
    return fail(session.message, session.code);
  }

  const result = await updateListing(input, session.data.userId);

  if (!result.ok) {
    return fail(result.message, result.code);
  }

  revalidateListingPaths(input.storeId, undefined, result.data.slug, result.data.vehicleId);

  return { ok: true as const, data: { id: result.data.id, slug: result.data.slug } };
}

export async function transitionListingAction(input: TransitionListingInput) {
  const session = await requireSession();

  if (!session.ok) {
    return fail(session.message, session.code);
  }

  const result = await transitionListing(input, session.data.userId, 'dealer');

  if (!result.ok) {
    return fail(result.message, result.code);
  }

  revalidateListingPaths(input.storeId, undefined, result.data.slug, result.data.vehicleId);

  return {
    ok: true as const,
    data: { id: result.data.id, status: result.data.status, slug: result.data.slug },
  };
}
