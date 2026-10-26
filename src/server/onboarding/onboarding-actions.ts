'use server';

import { revalidatePath, updateTag } from 'next/cache';
import { redirect } from 'next/navigation';

import { setActiveStoreCookie } from '@server/auth/access';
import { PUBLIC_CATALOG_CACHE_TAG } from '@server/catalog/public-catalog.service';
import {
  discardStorefrontDraft,
  reviewStoreApplication,
  saveStorefrontDraft,
  submitStoreApplication,
  updateStorefrontSetup,
} from '@server/onboarding/onboarding.service';
import type {
  ReviewApplicationInput,
  StoreApplicationInput,
  StorefrontDraftSaveInput,
  StorefrontSetupInput,
} from '@server/onboarding/onboarding.validators';

export async function submitStoreApplicationAction(input: StoreApplicationInput) {
  const result = await submitStoreApplication(input);

  if (!result.ok) {
    return { ok: false as const, message: result.message, code: result.code };
  }

  await setActiveStoreCookie(result.data.id);
  revalidatePath('/painel');
  redirect('/painel/solicitacao');
}

export async function reviewApplicationAction(input: ReviewApplicationInput) {
  const result = await reviewStoreApplication(input);

  if (!result.ok) {
    return { ok: false as const, message: result.message };
  }

  revalidatePath('/admin');
  revalidatePath('/admin/solicitacoes');

  return { ok: true as const, status: result.data.status };
}

/** Publica a configuração na vitrine pública e limpa o rascunho. */
export async function publishStorefrontSetupAction(input: StorefrontSetupInput) {
  const result = await updateStorefrontSetup(input);

  if (!result.ok) {
    return { ok: false as const, message: result.message };
  }

  revalidatePath('/painel/vitrine');
  revalidatePath('/painel');
  revalidatePath('/lojas');
  revalidatePath(`/lojas/${result.data.store.slug}`);
  revalidatePath('/vitrine');
  updateTag(PUBLIC_CATALOG_CACHE_TAG);

  return { ok: true as const };
}

/** @deprecated Use `publishStorefrontSetupAction`. */
export async function saveStorefrontSetupAction(input: StorefrontSetupInput) {
  return publishStorefrontSetupAction(input);
}

export async function saveStorefrontDraftAction(input: StorefrontDraftSaveInput) {
  const result = await saveStorefrontDraft(input);

  if (!result.ok) {
    return { ok: false as const, message: result.message };
  }

  revalidatePath('/painel/vitrine');
  revalidatePath('/vitrine');

  return { ok: true as const, draftUpdatedAt: result.data.draftUpdatedAt };
}

export async function discardStorefrontDraftAction(input: { storeId: string }) {
  const result = await discardStorefrontDraft(input);

  if (!result.ok) {
    return { ok: false as const, message: result.message };
  }

  revalidatePath('/painel/vitrine');
  revalidatePath('/vitrine');

  return { ok: true as const };
}
