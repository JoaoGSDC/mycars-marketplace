import { unstable_cache, updateTag } from 'next/cache';

import {
  computeAverageTicket,
  computeConversionRate,
  DASHBOARD_INDICATOR_DEFS,
  DASHBOARD_PERIOD_PRESETS,
  type DashboardPeriodPreset,
  type DashboardSnapshot,
} from '@app-types/dashboard';
import type { StoreRole } from '@app-types/membership';
import { membershipGrantsPermission, PERMISSIONS } from '@app-types/permissions';
import { authorizeStoreAction } from '@server/auth/access';
import * as dashboardRepo from '@server/repositories/dashboard.repository';
import { serviceError, serviceSuccess, type ServiceResult } from '@server/shared/service-result';

import {
  dashboardQuerySchema,
  type DashboardQueryInput,
} from './dashboard.validators';

export const DEALER_DASHBOARD_CACHE_TAG = 'dealer-dashboard';

export function dealerDashboardTag(storeId: string): string {
  return `${DEALER_DASHBOARD_CACHE_TAG}:${storeId}`;
}

export function revalidateDealerDashboard(storeId: string): void {
  updateTag(DEALER_DASHBOARD_CACHE_TAG);
  updateTag(dealerDashboardTag(storeId));
}

export function resolveDashboardPeriod(
  preset: DashboardPeriodPreset,
  from?: string,
  to?: string,
  now = new Date()
): { from: string; to: string; preset: DashboardPeriodPreset } {
  const end = new Date(now);
  end.setUTCHours(23, 59, 59, 999);
  const toIso = end.toISOString();

  if (preset === DASHBOARD_PERIOD_PRESETS.CUSTOM) {
    if (!from || !to) {
      throw new Error('Período personalizado exige from e to');
    }

    const fromDate = new Date(from);
    const toDate = new Date(to);

    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      throw new Error('Datas do período inválidas');
    }

    if (fromDate.getTime() > toDate.getTime()) {
      throw new Error('Data inicial deve ser anterior à final');
    }

    return { preset, from: fromDate.toISOString(), to: toDate.toISOString() };
  }

  const start = new Date(now);

  if (preset === DASHBOARD_PERIOD_PRESETS.THIS_MONTH) {
    start.setUTCDate(1);
    start.setUTCHours(0, 0, 0, 0);
  } else {
    const days =
      preset === DASHBOARD_PERIOD_PRESETS.LAST_7_DAYS
        ? 7
        : preset === DASHBOARD_PERIOD_PRESETS.LAST_90_DAYS
          ? 90
          : 30;
    start.setUTCDate(start.getUTCDate() - (days - 1));
    start.setUTCHours(0, 0, 0, 0);
  }

  return { preset, from: start.toISOString(), to: toIso };
}

async function loadDashboardUncached(
  params: {
    storeId: string;
    preset: DashboardPeriodPreset;
    from: string;
    to: string;
    sellerUserId: string | null;
    canFilterSeller: boolean;
    canViewGrossResult: boolean;
  }
): Promise<DashboardSnapshot> {
  const window = {
    storeId: params.storeId,
    from: params.from,
    to: params.to,
    sellerUserId: params.sellerUserId,
  };

  const [operational, commercialRaw] = await Promise.all([
    dashboardRepo.fetchOperationalMetrics(window),
    dashboardRepo.fetchCommercialMetrics(window),
  ]);

  const { wonClosedInPeriod, ...commercialRest } = commercialRaw;
  const averageTicketCents = computeAverageTicket(
    commercialRest.negotiatedVolumeCents,
    commercialRest.salesCount
  );
  const conversion = {
    numerator: wonClosedInPeriod,
    denominator: commercialRest.leadsReceived,
    rate: computeConversionRate(wonClosedInPeriod, commercialRest.leadsReceived),
  };

  const commercial = {
    ...commercialRest,
    averageTicketCents,
    conversion,
    estimatedGrossResultCents: params.canViewGrossResult
      ? commercialRest.estimatedGrossResultCents
      : null,
    incompleteGrossResultCount: params.canViewGrossResult
      ? commercialRest.incompleteGrossResultCount
      : 0,
  };

  return {
    storeId: params.storeId,
    generatedAt: new Date().toISOString(),
    period: {
      preset: params.preset,
      from: params.from,
      to: params.to,
    },
    sellerUserId: params.sellerUserId,
    operational,
    commercial,
    capabilities: {
      canFilterSeller: params.canFilterSeller,
      canViewGrossResult: params.canViewGrossResult,
    },
    definitions: DASHBOARD_INDICATOR_DEFS,
  };
}

type ResolvedDashboardQuery = {
  storeId: string;
  preset: DashboardPeriodPreset;
  from: string;
  to: string;
  sellerUserId: string | null;
  canFilterSeller: boolean;
  canViewGrossResult: boolean;
};

async function resolveDashboardAccess(
  raw: DashboardQueryInput,
  actorUserId: string
): Promise<ServiceResult<ResolvedDashboardQuery>> {
  const parsed = dashboardQuerySchema.safeParse(raw);

  if (!parsed.success) {
    return serviceError('VALIDATION', parsed.error.issues[0]?.message ?? 'Filtros inválidos');
  }

  const data = parsed.data;
  const access = await authorizeStoreAction(
    actorUserId,
    data.storeId,
    PERMISSIONS.STORE_READ
  );

  if (!access.ok) {
    return access;
  }

  const role = access.data.membership.role as StoreRole;
  const permissionsJson = access.data.membership.permissionsJson;
  const canFilterSeller = membershipGrantsPermission(
    role,
    permissionsJson,
    PERMISSIONS.MEMBERS_MANAGE
  );
  const canViewGrossResult = membershipGrantsPermission(
    role,
    permissionsJson,
    PERMISSIONS.COSTS_READ
  );

  let sellerUserId: string | null = data.sellerUserId ?? null;

  if (sellerUserId && !canFilterSeller && sellerUserId !== actorUserId) {
    return serviceError('FORBIDDEN', 'Filtro por vendedor não autorizado');
  }

  if (!canFilterSeller) {
    /** Sem gestão de equipe: só permite auto-filtro. */
    sellerUserId = data.sellerUserId === actorUserId ? actorUserId : null;
  }

  let period: { from: string; to: string; preset: DashboardPeriodPreset };

  try {
    period = resolveDashboardPeriod(data.preset, data.from, data.to);
  } catch (error) {
    return serviceError(
      'VALIDATION',
      error instanceof Error ? error.message : 'Período inválido'
    );
  }

  return serviceSuccess({
    storeId: data.storeId,
    preset: period.preset,
    from: period.from,
    to: period.to,
    sellerUserId,
    canFilterSeller,
    canViewGrossResult,
  });
}

/** Sem cache — uso em testes e diagnóstico. */
export async function getDealerDashboardUncached(
  raw: DashboardQueryInput,
  actorUserId: string
): Promise<ServiceResult<DashboardSnapshot>> {
  const resolved = await resolveDashboardAccess(raw, actorUserId);

  if (!resolved.ok) {
    return resolved;
  }

  return serviceSuccess(await loadDashboardUncached(resolved.data));
}

export async function getDealerDashboard(
  raw: DashboardQueryInput,
  actorUserId: string
): Promise<ServiceResult<DashboardSnapshot>> {
  const resolved = await resolveDashboardAccess(raw, actorUserId);

  if (!resolved.ok) {
    return resolved;
  }

  const data = resolved.data;
  const cached = unstable_cache(
    async () => loadDashboardUncached(data),
    [
      'dealer-dashboard',
      data.storeId,
      data.preset,
      data.from,
      data.to,
      data.sellerUserId ?? '',
      String(data.canFilterSeller),
      String(data.canViewGrossResult),
    ],
    {
      revalidate: 45,
      tags: [DEALER_DASHBOARD_CACHE_TAG, dealerDashboardTag(data.storeId)],
    }
  );

  return serviceSuccess(await cached());
}
