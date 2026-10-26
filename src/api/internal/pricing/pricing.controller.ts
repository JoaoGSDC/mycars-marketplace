import { NextResponse } from 'next/server';

import { requireSession } from '@server/auth/access';
import { checkPricingRateLimit } from '@server/pricing/pricing-rate-limit';
import {
  applyManualFipeCode,
  getManualFipeYears,
  getPricingAnalysis,
  getPricingExplanation,
  matchVehicleFipe,
  selectFipeCandidate,
  updateDesiredMargin,
} from '@server/pricing/pricing.service';
import type { ServiceResult } from '@server/shared/service-result';

function toHttpStatus(code: string | undefined): number {
  switch (code) {
    case 'UNAUTHORIZED':
      return 401;
    case 'FORBIDDEN':
      return 403;
    case 'NOT_FOUND':
      return 404;
    case 'VALIDATION':
      return 400;
    case 'CONFLICT':
      return 409;
    default:
      return 500;
  }
}

function jsonResult<T>(result: ServiceResult<T>) {
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, message: result.message, code: result.code },
      { status: toHttpStatus(result.code) }
    );
  }

  return NextResponse.json({ ok: true, data: result.data });
}

async function withAuthAndRateLimit() {
  const session = await requireSession();

  if (!session.ok) {
    return { ok: false as const, response: jsonResult(session) };
  }

  const limit = checkPricingRateLimit(`pricing-api:${session.data.userId}`);

  if (!limit.allowed) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          ok: false,
          message: `Muitas consultas. Aguarde ${limit.retryAfterSec}s.`,
          code: 'RATE_LIMIT',
        },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfterSec) } }
      ),
    };
  }

  return { ok: true as const, userId: session.data.userId };
}

export async function getAnalysis(storeId: string, vehicleId: string) {
  const auth = await withAuthAndRateLimit();

  if (!auth.ok) {
    return auth.response;
  }

  return jsonResult(await getPricingAnalysis({ storeId, vehicleId }, auth.userId));
}

export async function postMatch(body: unknown) {
  const auth = await withAuthAndRateLimit();

  if (!auth.ok) {
    return auth.response;
  }

  return jsonResult(await matchVehicleFipe(body as never, auth.userId));
}

export async function postSelect(body: unknown) {
  const auth = await withAuthAndRateLimit();

  if (!auth.ok) {
    return auth.response;
  }

  return jsonResult(await selectFipeCandidate(body as never, auth.userId));
}

export async function postManual(body: unknown) {
  const auth = await withAuthAndRateLimit();

  if (!auth.ok) {
    return auth.response;
  }

  return jsonResult(await applyManualFipeCode(body as never, auth.userId));
}

export async function postManualYears(body: unknown) {
  const auth = await withAuthAndRateLimit();

  if (!auth.ok) {
    return auth.response;
  }

  return jsonResult(await getManualFipeYears(body as never, auth.userId));
}

export async function postMargin(body: unknown) {
  const auth = await withAuthAndRateLimit();

  if (!auth.ok) {
    return auth.response;
  }

  return jsonResult(await updateDesiredMargin(body as never, auth.userId));
}

export async function getExplanation(storeId: string, vehicleId: string) {
  const auth = await withAuthAndRateLimit();

  if (!auth.ok) {
    return auth.response;
  }

  return jsonResult(await getPricingExplanation({ storeId, vehicleId }, auth.userId));
}
