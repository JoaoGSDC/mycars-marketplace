'use server';

import { revalidatePath } from 'next/cache';

import { requireSession } from '@server/auth/access';

import { checkPricingRateLimit } from './pricing-rate-limit';
import {
  applyManualFipeCode,
  getManualFipeYears,
  getPricingAnalysis,
  getPricingExplanation,
  matchVehicleFipe,
  previewPricing,
  selectFipeCandidate,
  updateDesiredMargin,
} from './pricing.service';
import type {
  PricingManualCodeInput,
  PricingManualYearsInput,
  PricingMarginInput,
  PricingMatchInput,
  PricingPreviewInput,
  PricingSelectCandidateInput,
  PricingVehicleIdInput,
} from './pricing.validators';

function actionFail(message: string, code?: string) {
  return { ok: false as const, message, code };
}

function rateLimitOrFail(userId: string) {
  const limit = checkPricingRateLimit(`pricing:${userId}`);

  if (!limit.allowed) {
    return actionFail(
      `Muitas consultas de precificação. Aguarde ${limit.retryAfterSec}s.`,
      'RATE_LIMIT'
    );
  }

  return null;
}

function revalidateVehicle(storeId: string, vehicleId: string) {
  revalidatePath('/painel/estoque');
  revalidatePath(`/painel/estoque/${vehicleId}`);
  void storeId;
}

export async function getPricingAnalysisAction(input: PricingVehicleIdInput) {
  const session = await requireSession();

  if (!session.ok) {
    return actionFail(session.message, session.code);
  }

  const limited = rateLimitOrFail(session.data.userId);

  if (limited) {
    return limited;
  }

  const result = await getPricingAnalysis(input, session.data.userId);

  if (!result.ok) {
    return actionFail(result.message, result.code);
  }

  return { ok: true as const, data: result.data };
}

export async function matchVehicleFipeAction(input: PricingMatchInput) {
  const session = await requireSession();

  if (!session.ok) {
    return actionFail(session.message, session.code);
  }

  const limited = rateLimitOrFail(session.data.userId);

  if (limited) {
    return limited;
  }

  const result = await matchVehicleFipe(input, session.data.userId);

  if (!result.ok) {
    return actionFail(result.message, result.code);
  }

  revalidateVehicle(input.storeId, input.vehicleId);
  return { ok: true as const, data: result.data };
}

export async function selectFipeCandidateAction(input: PricingSelectCandidateInput) {
  const session = await requireSession();

  if (!session.ok) {
    return actionFail(session.message, session.code);
  }

  const limited = rateLimitOrFail(session.data.userId);

  if (limited) {
    return limited;
  }

  const result = await selectFipeCandidate(input, session.data.userId);

  if (!result.ok) {
    return actionFail(result.message, result.code);
  }

  revalidateVehicle(input.storeId, input.vehicleId);
  return { ok: true as const, data: result.data };
}

export async function applyManualFipeCodeAction(input: PricingManualCodeInput) {
  const session = await requireSession();

  if (!session.ok) {
    return actionFail(session.message, session.code);
  }

  const limited = rateLimitOrFail(session.data.userId);

  if (limited) {
    return limited;
  }

  const result = await applyManualFipeCode(input, session.data.userId);

  if (!result.ok) {
    return actionFail(result.message, result.code);
  }

  revalidateVehicle(input.storeId, input.vehicleId);
  return { ok: true as const, data: result.data };
}

export async function getManualFipeYearsAction(input: PricingManualYearsInput) {
  const session = await requireSession();

  if (!session.ok) {
    return actionFail(session.message, session.code);
  }

  const limited = rateLimitOrFail(session.data.userId);

  if (limited) {
    return limited;
  }

  const result = await getManualFipeYears(input, session.data.userId);

  if (!result.ok) {
    return actionFail(result.message, result.code);
  }

  return { ok: true as const, data: result.data };
}

export async function updateDesiredMarginAction(input: PricingMarginInput) {
  const session = await requireSession();

  if (!session.ok) {
    return actionFail(session.message, session.code);
  }

  const result = await updateDesiredMargin(input, session.data.userId);

  if (!result.ok) {
    return actionFail(result.message, result.code);
  }

  revalidateVehicle(input.storeId, input.vehicleId);
  return { ok: true as const, data: result.data };
}

export async function getPricingExplanationAction(input: PricingVehicleIdInput) {
  const session = await requireSession();

  if (!session.ok) {
    return actionFail(session.message, session.code);
  }

  const result = await getPricingExplanation(input, session.data.userId);

  if (!result.ok) {
    return actionFail(result.message, result.code);
  }

  return { ok: true as const, data: result.data };
}

export async function previewPricingAction(input: PricingPreviewInput) {
  const session = await requireSession();

  if (!session.ok) {
    return actionFail(session.message, session.code);
  }

  const result = await previewPricing(input, session.data.userId);

  if (!result.ok) {
    return actionFail(result.message, result.code);
  }

  return { ok: true as const, data: result.data };
}
