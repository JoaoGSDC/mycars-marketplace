'use server';

import { revalidatePath } from 'next/cache';

import { requireSession } from '@server/auth/access';
import { revalidateDealerDashboard } from '@server/dashboard/dashboard.service';
import {
  confirmVehicleAvailability,
  confirmVehicleAvailabilityBatch,
  getAvailabilityReviewQueue,
  getIntegrityPolicy,
  listVehicleConfirmationHistory,
  updateIntegrityPolicy,
} from '@server/integrity/availability.service';
import type {
  ConfirmAvailabilityBatchInput,
  ConfirmAvailabilityInput,
  UpdateIntegrityPolicyInput,
} from '@server/integrity/integrity.validators';
import {
  listStorePrivacyRequests,
  requestStoreDataDeletion,
  requestStoreDataExport,
} from '@server/privacy/privacy.service';
import type { PrivacyRequestInput } from '@server/integrity/integrity.validators';

function actionFail(message: string, code?: string) {
  return { ok: false as const, message, code };
}

function revalidateIntegrity(storeId: string) {
  revalidateDealerDashboard(storeId);
  revalidatePath('/painel');
  revalidatePath('/painel/estoque');
  revalidatePath('/painel/estoque/confirmacao');
  revalidatePath('/painel/estoque');
  revalidatePath('/painel/configuracoes');
}

export async function confirmAvailabilityAction(input: ConfirmAvailabilityInput) {
  const session = await requireSession();

  if (!session.ok) {
    return actionFail(session.message, session.code);
  }

  const result = await confirmVehicleAvailability(input, session.data.userId);

  if (!result.ok) {
    return actionFail(result.message, result.code);
  }

  revalidateIntegrity(input.storeId);
  revalidatePath(`/painel/estoque/${input.vehicleId}`);

  return { ok: true as const, data: result.data };
}

export async function confirmAvailabilityBatchAction(input: ConfirmAvailabilityBatchInput) {
  const session = await requireSession();

  if (!session.ok) {
    return actionFail(session.message, session.code);
  }

  const result = await confirmVehicleAvailabilityBatch(input, session.data.userId);

  if (!result.ok) {
    return actionFail(result.message, result.code);
  }

  revalidateIntegrity(input.storeId);

  return { ok: true as const, data: result.data };
}

export async function getAvailabilityReviewAction(storeId: string) {
  const session = await requireSession();

  if (!session.ok) {
    return actionFail(session.message, session.code);
  }

  const result = await getAvailabilityReviewQueue(storeId, session.data.userId);

  if (!result.ok) {
    return actionFail(result.message, result.code);
  }

  return { ok: true as const, data: result.data };
}

export async function updateIntegrityPolicyAction(input: UpdateIntegrityPolicyInput) {
  const session = await requireSession();

  if (!session.ok) {
    return actionFail(session.message, session.code);
  }

  const result = await updateIntegrityPolicy(input, session.data.userId);

  if (!result.ok) {
    return actionFail(result.message, result.code);
  }

  revalidateIntegrity(input.storeId);

  return { ok: true as const, data: result.data };
}

export async function getIntegrityPolicyAction(storeId: string) {
  const session = await requireSession();

  if (!session.ok) {
    return actionFail(session.message, session.code);
  }

  const result = await getIntegrityPolicy(storeId, session.data.userId);

  if (!result.ok) {
    return actionFail(result.message, result.code);
  }

  return { ok: true as const, data: result.data };
}

export async function listConfirmationHistoryAction(storeId: string, vehicleId: string) {
  const session = await requireSession();

  if (!session.ok) {
    return actionFail(session.message, session.code);
  }

  const result = await listVehicleConfirmationHistory(storeId, vehicleId, session.data.userId);

  if (!result.ok) {
    return actionFail(result.message, result.code);
  }

  return { ok: true as const, data: result.data };
}

export async function requestPrivacyExportAction(input: Omit<PrivacyRequestInput, 'type'>) {
  const session = await requireSession();

  if (!session.ok) {
    return actionFail(session.message, session.code);
  }

  const result = await requestStoreDataExport(
    { ...input, type: 'export' },
    session.data.userId
  );

  if (!result.ok) {
    return actionFail(result.message, result.code);
  }

  revalidatePath('/painel/configuracoes');

  return { ok: true as const, data: { id: result.data.id, status: result.data.status } };
}

export async function requestPrivacyDeletionAction(input: Omit<PrivacyRequestInput, 'type'>) {
  const session = await requireSession();

  if (!session.ok) {
    return actionFail(session.message, session.code);
  }

  const result = await requestStoreDataDeletion(
    { ...input, type: 'deletion' },
    session.data.userId
  );

  if (!result.ok) {
    return actionFail(result.message, result.code);
  }

  revalidatePath('/painel/configuracoes');

  return {
    ok: true as const,
    data: {
      id: result.data.id,
      status: result.data.status,
      retentionHoldUntil: result.data.retentionHoldUntil,
    },
  };
}

export async function listPrivacyRequestsAction(storeId: string) {
  const session = await requireSession();

  if (!session.ok) {
    return actionFail(session.message, session.code);
  }

  const result = await listStorePrivacyRequests(storeId, session.data.userId);

  if (!result.ok) {
    return actionFail(result.message, result.code);
  }

  return { ok: true as const, data: result.data };
}
