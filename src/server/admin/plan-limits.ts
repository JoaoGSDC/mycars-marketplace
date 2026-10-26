import { count, eq } from 'drizzle-orm';

import { SUBSCRIPTION_STATUS } from '@app-types/subscription';
import { getDb, nowIso, vehicles } from '@lib/db';
import * as listingsRepo from '@server/repositories/listings.repository';
import * as plansRepo from '@server/repositories/plans.repository';
import * as subscriptionsRepo from '@server/repositories/store-subscriptions.repository';
import { serviceError, serviceSuccess, type ServiceResult } from '@server/shared/service-result';

export type StorePlanAccess = {
  hasBoundPlan: boolean;
  planId: string | null;
  planCode: string | null;
  planName: string | null;
  status: string | null;
  maxPublishedListings: number | null;
  maxVehicles: number | null;
  publishedCount: number;
  vehicleCount: number;
  withinGrace: boolean;
  canPublish: boolean;
  reason?: string;
};

async function countVehiclesByStore(storeId: string): Promise<number> {
  const [row] = await getDb()
    .select({ value: count() })
    .from(vehicles)
    .where(eq(vehicles.storeId, storeId));

  return Number(row?.value ?? 0);
}

/**
 * Política piloto:
 * - Sem assinatura vinculada: publicação liberada (limites não aplicados).
 * - Com assinatura trial/active: limites do plano.
 * - past_due: acesso até graceEndsAt.
 * - canceled: bloqueia novas publicações.
 */
export async function resolveStorePlanAccess(storeId: string): Promise<StorePlanAccess> {
  const current = await subscriptionsRepo.findCurrentSubscriptionForStore(storeId);
  const publishedCount = await listingsRepo.countPublishedListingsByStore(storeId);
  const vehicleCount = await countVehiclesByStore(storeId);

  if (!current) {
    return {
      hasBoundPlan: false,
      planId: null,
      planCode: null,
      planName: null,
      status: null,
      maxPublishedListings: null,
      maxVehicles: null,
      publishedCount,
      vehicleCount,
      withinGrace: false,
      canPublish: true,
    };
  }

  const plan = await plansRepo.findPlanById(current.planId);
  const now = nowIso();
  let withinGrace = false;
  let canPublish = false;
  let reason: string | undefined;

  if (
    current.status === SUBSCRIPTION_STATUS.TRIAL ||
    current.status === SUBSCRIPTION_STATUS.ACTIVE
  ) {
    canPublish = true;
  } else if (current.status === SUBSCRIPTION_STATUS.PAST_DUE) {
    const graceEnd = current.graceEndsAt;

    if (graceEnd && graceEnd >= now) {
      withinGrace = true;
      canPublish = true;
    } else {
      reason = 'Assinatura em atraso fora do período de tolerância';
    }
  } else {
    reason = 'Assinatura sem acesso comercial';
  }

  const maxPublishedListings = plan?.maxPublishedListings ?? null;
  const maxVehicles = plan?.maxVehicles ?? null;

  if (canPublish && maxPublishedListings !== null && publishedCount >= maxPublishedListings) {
    canPublish = false;
    reason = `Limite de anúncios publicados do plano (${maxPublishedListings}) atingido`;
  }

  return {
    hasBoundPlan: true,
    planId: current.planId,
    planCode: current.planCode,
    planName: current.planName,
    status: current.status,
    maxPublishedListings,
    maxVehicles,
    publishedCount,
    vehicleCount,
    withinGrace,
    canPublish,
    reason,
  };
}

export async function assertStoreCanPublishListing(
  storeId: string
): Promise<ServiceResult<StorePlanAccess>> {
  const access = await resolveStorePlanAccess(storeId);

  if (!access.canPublish) {
    return serviceError(
      'FORBIDDEN',
      access.reason ?? 'Publicação bloqueada pela política comercial do plano'
    );
  }

  return serviceSuccess(access);
}
