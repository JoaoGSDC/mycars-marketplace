import { PLATFORM_PERMISSIONS } from '@app-types/platform';
import { SUBSCRIPTION_STATUS } from '@app-types/subscription';
import { nowIso, type PlanRow, type StoreSubscriptionRow } from '@lib/db';
import { assertPlatformPermission } from '@server/auth/platform-admin';
import * as auditRepo from '@server/repositories/audit-events.repository';
import * as plansRepo from '@server/repositories/plans.repository';
import * as subscriptionsRepo from '@server/repositories/store-subscriptions.repository';
import * as storesRepo from '@server/repositories/stores.repository';
import { serviceError, serviceSuccess, type ServiceResult } from '@server/shared/service-result';

import {
  assignSubscriptionSchema,
  updateSubscriptionStatusSchema,
  upsertPlanSchema,
  type AssignSubscriptionInput,
  type UpdateSubscriptionStatusInput,
  type UpsertPlanInput,
} from './admin.validators';

function boolText(value: boolean): string {
  return value ? 'true' : 'false';
}

export async function listPlansAdmin(actorUserId: string): Promise<ServiceResult<PlanRow[]>> {
  const access = await assertPlatformPermission(actorUserId, PLATFORM_PERMISSIONS.PLANS_MANAGE);

  if (!access.ok) {
    return access;
  }

  return serviceSuccess(await plansRepo.listPlans(false));
}

export async function upsertPlanAdmin(
  raw: UpsertPlanInput,
  actorUserId: string
): Promise<ServiceResult<PlanRow>> {
  const access = await assertPlatformPermission(actorUserId, PLATFORM_PERMISSIONS.PLANS_MANAGE);

  if (!access.ok) {
    return access;
  }

  const parsed = upsertPlanSchema.safeParse(raw);

  if (!parsed.success) {
    return serviceError('VALIDATION', parsed.error.issues[0]?.message ?? 'Dados inválidos');
  }

  const data = parsed.data;
  const existingCode = await plansRepo.findPlanByCode(data.code);

  if (existingCode && existingCode.id !== data.id) {
    return serviceError('CONFLICT', 'Código de plano já em uso');
  }

  let plan: PlanRow;

  if (data.id) {
    const existing = await plansRepo.findPlanById(data.id);

    if (!existing) {
      return serviceError('NOT_FOUND', 'Plano não encontrado');
    }

    plan = await plansRepo.updatePlan(data.id, {
      code: data.code,
      name: data.name,
      description: data.description ?? null,
      maxPublishedListings: data.maxPublishedListings,
      maxVehicles: data.maxVehicles,
      maxMembers: data.maxMembers,
      gracePeriodDays: data.gracePeriodDays,
      priceCentsMonthly: data.priceCentsMonthly,
      isActive: boolText(data.isActive),
    });
  } else {
    plan = await plansRepo.insertPlan({
      code: data.code,
      name: data.name,
      description: data.description ?? null,
      maxPublishedListings: data.maxPublishedListings,
      maxVehicles: data.maxVehicles,
      maxMembers: data.maxMembers,
      gracePeriodDays: data.gracePeriodDays,
      priceCentsMonthly: data.priceCentsMonthly,
      isActive: boolText(data.isActive),
    });
  }

  await auditRepo.insertAuditEvent({
    storeId: null,
    actorUserId,
    action: data.id ? 'plan.updated' : 'plan.created',
    entityType: 'plan',
    entityId: plan.id,
    payloadJson: JSON.stringify({
      code: plan.code,
      maxPublishedListings: plan.maxPublishedListings,
      gracePeriodDays: plan.gracePeriodDays,
    }),
  });

  return serviceSuccess(plan);
}

export async function assignSubscriptionAdmin(
  raw: AssignSubscriptionInput,
  actorUserId: string
): Promise<ServiceResult<StoreSubscriptionRow>> {
  const access = await assertPlatformPermission(
    actorUserId,
    PLATFORM_PERMISSIONS.SUBSCRIPTIONS_MANAGE
  );

  if (!access.ok) {
    return access;
  }

  const parsed = assignSubscriptionSchema.safeParse(raw);

  if (!parsed.success) {
    return serviceError('VALIDATION', parsed.error.issues[0]?.message ?? 'Dados inválidos');
  }

  const data = parsed.data;
  const store = await storesRepo.findStoreById(data.storeId);

  if (!store) {
    return serviceError('NOT_FOUND', 'Loja não encontrada');
  }

  const plan = await plansRepo.findPlanById(data.planId);

  if (!plan || plan.isActive !== 'true') {
    return serviceError('VALIDATION', 'Plano inválido ou inativo');
  }

  const startsAt = data.startsAt ? new Date(data.startsAt).toISOString() : nowIso();
  let graceEndsAt: string | null = null;

  if (data.status === SUBSCRIPTION_STATUS.PAST_DUE) {
    graceEndsAt = new Date(
      Date.now() + plan.gracePeriodDays * 24 * 60 * 60 * 1000
    ).toISOString();
  }

  const current = await subscriptionsRepo.findCurrentSubscriptionForStore(data.storeId);

  if (current) {
    await subscriptionsRepo.updateSubscription(current.id, {
      status: SUBSCRIPTION_STATUS.CANCELED,
      endsAt: nowIso(),
      notes: `Substituída por nova assinatura (${plan.code})`,
    });
  }

  const subscription = await subscriptionsRepo.insertSubscription({
    storeId: data.storeId,
    planId: data.planId,
    status: data.status,
    startsAt,
    endsAt: data.endsAt ? new Date(data.endsAt).toISOString() : null,
    graceEndsAt,
    notes: data.notes ?? `Ativação manual piloto · plano ${plan.code}`,
    activatedByUserId: actorUserId,
  });

  await storesRepo.updateStore(store.id, {
    subscriptionStatus: data.status,
  });

  await auditRepo.insertAuditEvent({
    storeId: store.id,
    actorUserId,
    action: 'subscription.assigned',
    entityType: 'store_subscription',
    entityId: subscription.id,
    payloadJson: JSON.stringify({
      planId: plan.id,
      planCode: plan.code,
      status: data.status,
      manual: true,
      previousSubscriptionId: current?.id ?? null,
    }),
  });

  return serviceSuccess(subscription);
}

export async function updateSubscriptionStatusAdmin(
  raw: UpdateSubscriptionStatusInput,
  actorUserId: string
): Promise<ServiceResult<StoreSubscriptionRow>> {
  const access = await assertPlatformPermission(
    actorUserId,
    PLATFORM_PERMISSIONS.SUBSCRIPTIONS_MANAGE
  );

  if (!access.ok) {
    return access;
  }

  const parsed = updateSubscriptionStatusSchema.safeParse(raw);

  if (!parsed.success) {
    return serviceError('VALIDATION', parsed.error.issues[0]?.message ?? 'Dados inválidos');
  }

  const current = await subscriptionsRepo.findSubscriptionById(parsed.data.subscriptionId);

  if (!current) {
    return serviceError('NOT_FOUND', 'Assinatura não encontrada');
  }

  const plan = await plansRepo.findPlanById(current.planId);
  let graceEndsAt = current.graceEndsAt;

  if (parsed.data.status === SUBSCRIPTION_STATUS.PAST_DUE) {
    graceEndsAt = new Date(
      Date.now() + (plan?.gracePeriodDays ?? 7) * 24 * 60 * 60 * 1000
    ).toISOString();
  }

  if (parsed.data.status === SUBSCRIPTION_STATUS.ACTIVE) {
    graceEndsAt = null;
  }

  const updated = await subscriptionsRepo.updateSubscription(current.id, {
    status: parsed.data.status,
    graceEndsAt,
    notes: parsed.data.notes ?? current.notes,
    endsAt:
      parsed.data.status === SUBSCRIPTION_STATUS.CANCELED ? nowIso() : current.endsAt,
  });

  await storesRepo.updateStore(current.storeId, {
    subscriptionStatus: parsed.data.status,
  });

  await auditRepo.insertAuditEvent({
    storeId: current.storeId,
    actorUserId,
    action: 'subscription.status_changed',
    entityType: 'store_subscription',
    entityId: current.id,
    payloadJson: JSON.stringify({
      from: current.status,
      to: parsed.data.status,
      reason: parsed.data.reason,
      graceEndsAt,
    }),
  });

  return serviceSuccess(updated);
}
