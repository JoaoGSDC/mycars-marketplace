'use server';

import { revalidatePath, updateTag } from 'next/cache';

import { requireSession } from '@server/auth/access';
import { PUBLIC_CATALOG_CACHE_TAG } from '@server/catalog/public-catalog.service';
import { revalidateDealerDashboard } from '@server/dashboard/dashboard.service';
import { cancelSale, createSale } from '@server/sales/sales.service';
import type { CancelSaleInput, CreateSaleInput } from '@server/sales/sales.validators';

function fail(message: string, code?: string) {
  return { ok: false as const, message, code };
}

function revalidateSalePaths(
  storeId: string,
  vehicleId?: string,
  opportunityId?: string,
  saleId?: string
) {
  updateTag(PUBLIC_CATALOG_CACHE_TAG);
  revalidateDealerDashboard(storeId);
  revalidatePath('/painel');
  revalidatePath('/painel/vendas');
  revalidatePath('/painel/estoque');
  revalidatePath('/painel/reservas');
  revalidatePath('/painel/oportunidades');
  revalidatePath('/veiculos');
  revalidatePath('/');

  if (vehicleId) {
    revalidatePath(`/painel/estoque/${vehicleId}`);
  }

  if (opportunityId) {
    revalidatePath(`/painel/oportunidades/${opportunityId}`);
  }

  if (saleId) {
    revalidatePath(`/painel/vendas/${saleId}`);
  }
}

export async function createSaleAction(input: CreateSaleInput) {
  const session = await requireSession();

  if (!session.ok) {
    return fail(session.message, session.code);
  }

  const result = await createSale(input, session.data.userId);

  if (!result.ok) {
    return fail(result.message, result.code);
  }

  revalidateSalePaths(input.storeId, input.vehicleId, input.opportunityId, result.data.id);

  return { ok: true as const, data: { id: result.data.id } };
}

export async function cancelSaleAction(input: CancelSaleInput) {
  const session = await requireSession();

  if (!session.ok) {
    return fail(session.message, session.code);
  }

  const result = await cancelSale(input, session.data.userId);

  if (!result.ok) {
    return fail(result.message, result.code);
  }

  revalidateSalePaths(
    input.storeId,
    result.data.vehicleId,
    result.data.opportunityId ?? undefined,
    result.data.id
  );

  return { ok: true as const, data: result.data };
}
