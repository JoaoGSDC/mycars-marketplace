'use server';

import { revalidatePath } from 'next/cache';

import { requireSession } from '@server/auth/access';
import {
  createListingReportAdmin,
  moderateListingAdmin,
  resolveListingReportAdmin,
} from '@server/admin/listings-admin.service';
import { setPlatformRoleAdmin } from '@server/admin/metrics-admin.service';
import {
  assignSubscriptionAdmin,
  updateSubscriptionStatusAdmin,
  upsertPlanAdmin,
} from '@server/admin/plans-admin.service';
import {
  reactivateStoreAdmin,
  suspendStoreAdmin,
} from '@server/admin/stores-admin.service';
import { reviewStoreApplication } from '@server/onboarding/onboarding.service';
import type { ReviewApplicationInput } from '@server/onboarding/onboarding.validators';

import type {
  AssignSubscriptionInput,
  CreateListingReportInput,
  ModerateListingInput,
  ReactivateStoreInput,
  ResolveListingReportInput,
  SetPlatformRoleInput,
  SuspendStoreInput,
  UpdateSubscriptionStatusInput,
  UpsertPlanInput,
} from './admin.validators';

function fail(message: string, code?: string) {
  return { ok: false as const, message, code };
}

function revalidateAdmin() {
  revalidatePath('/admin');
  revalidatePath('/admin/lojas');
  revalidatePath('/admin/solicitacoes');
  revalidatePath('/admin/anuncios');
  revalidatePath('/admin/denuncias');
  revalidatePath('/admin/planos');
  revalidatePath('/admin/auditoria');
  revalidatePath('/admin/equipe');
}

export async function adminReviewApplicationAction(input: ReviewApplicationInput) {
  const session = await requireSession();

  if (!session.ok) {
    return fail(session.message, session.code);
  }

  const result = await reviewStoreApplication(input, session.data.userId);

  if (!result.ok) {
    return fail(result.message, result.code);
  }

  revalidateAdmin();
  revalidatePath(`/admin/lojas/${input.storeId}`);

  return { ok: true as const, status: result.data.status };
}

export async function adminSuspendStoreAction(input: SuspendStoreInput) {
  const session = await requireSession();

  if (!session.ok) {
    return fail(session.message, session.code);
  }

  const result = await suspendStoreAdmin(input, session.data.userId);

  if (!result.ok) {
    return fail(result.message, result.code);
  }

  revalidateAdmin();
  revalidatePath(`/admin/lojas/${input.storeId}`);

  return { ok: true as const };
}

export async function adminReactivateStoreAction(input: ReactivateStoreInput) {
  const session = await requireSession();

  if (!session.ok) {
    return fail(session.message, session.code);
  }

  const result = await reactivateStoreAdmin(input, session.data.userId);

  if (!result.ok) {
    return fail(result.message, result.code);
  }

  revalidateAdmin();
  revalidatePath(`/admin/lojas/${input.storeId}`);

  return { ok: true as const };
}

export async function adminModerateListingAction(input: ModerateListingInput) {
  const session = await requireSession();

  if (!session.ok) {
    return fail(session.message, session.code);
  }

  const result = await moderateListingAdmin(input, session.data.userId);

  if (!result.ok) {
    return fail(result.message, result.code);
  }

  revalidateAdmin();
  revalidatePath(`/admin/anuncios/${input.listingId}`);
  revalidatePath('/veiculos');
  revalidatePath('/');

  return { ok: true as const, status: result.data.status };
}

export async function adminCreateReportAction(input: CreateListingReportInput) {
  const session = await requireSession();

  if (!session.ok) {
    return fail(session.message, session.code);
  }

  const result = await createListingReportAdmin(input, session.data.userId);

  if (!result.ok) {
    return fail(result.message, result.code);
  }

  revalidateAdmin();

  return { ok: true as const, id: result.data.id };
}

export async function adminResolveReportAction(input: ResolveListingReportInput) {
  const session = await requireSession();

  if (!session.ok) {
    return fail(session.message, session.code);
  }

  const result = await resolveListingReportAdmin(input, session.data.userId);

  if (!result.ok) {
    return fail(result.message, result.code);
  }

  revalidateAdmin();

  return { ok: true as const };
}

export async function adminUpsertPlanAction(input: UpsertPlanInput) {
  const session = await requireSession();

  if (!session.ok) {
    return fail(session.message, session.code);
  }

  const result = await upsertPlanAdmin(input, session.data.userId);

  if (!result.ok) {
    return fail(result.message, result.code);
  }

  revalidateAdmin();

  return { ok: true as const, id: result.data.id };
}

export async function adminAssignSubscriptionAction(input: AssignSubscriptionInput) {
  const session = await requireSession();

  if (!session.ok) {
    return fail(session.message, session.code);
  }

  const result = await assignSubscriptionAdmin(input, session.data.userId);

  if (!result.ok) {
    return fail(result.message, result.code);
  }

  revalidateAdmin();
  revalidatePath(`/admin/lojas/${input.storeId}`);

  return { ok: true as const, id: result.data.id };
}

export async function adminUpdateSubscriptionAction(input: UpdateSubscriptionStatusInput) {
  const session = await requireSession();

  if (!session.ok) {
    return fail(session.message, session.code);
  }

  const result = await updateSubscriptionStatusAdmin(input, session.data.userId);

  if (!result.ok) {
    return fail(result.message, result.code);
  }

  revalidateAdmin();

  return { ok: true as const };
}

export async function adminSetPlatformRoleAction(input: SetPlatformRoleInput) {
  const session = await requireSession();

  if (!session.ok) {
    return fail(session.message, session.code);
  }

  const result = await setPlatformRoleAdmin(input, session.data.userId);

  if (!result.ok) {
    return fail(result.message, result.code);
  }

  revalidateAdmin();

  return { ok: true as const };
}
