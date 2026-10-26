import { PLATFORM_PERMISSIONS } from '@app-types/platform';
import { STORE_STATUS } from '@app-types/status';
import { nowIso, type StoreRow } from '@lib/db';
import { assertPlatformPermission } from '@server/auth/platform-admin';
import { resolveStorePlanAccess } from '@server/admin/plan-limits';
import * as auditRepo from '@server/repositories/audit-events.repository';
import * as subscriptionsRepo from '@server/repositories/store-subscriptions.repository';
import * as storesRepo from '@server/repositories/stores.repository';
import { serviceError, serviceSuccess, type ServiceResult } from '@server/shared/service-result';

import {
  adminStoreSearchSchema,
  reactivateStoreSchema,
  suspendStoreSchema,
  type AdminStoreSearchInput,
  type ReactivateStoreInput,
  type SuspendStoreInput,
} from './admin.validators';

export async function searchStoresForAdmin(
  raw: AdminStoreSearchInput,
  actorUserId: string
): Promise<ServiceResult<{ items: StoreRow[]; total: number; page: number; pageSize: number }>> {
  const access = await assertPlatformPermission(actorUserId, PLATFORM_PERMISSIONS.STORES_READ);

  if (!access.ok) {
    return access;
  }

  const parsed = adminStoreSearchSchema.safeParse(raw);

  if (!parsed.success) {
    return serviceError('VALIDATION', parsed.error.issues[0]?.message ?? 'Filtros inválidos');
  }

  const result = await storesRepo.searchStores(parsed.data);

  return serviceSuccess({
    ...result,
    page: parsed.data.page,
    pageSize: parsed.data.pageSize,
  });
}

export async function getStoreAdminDetail(
  storeId: string,
  actorUserId: string
): Promise<
  ServiceResult<{
    store: StoreRow;
    planAccess: Awaited<ReturnType<typeof resolveStorePlanAccess>>;
    subscriptions: Awaited<ReturnType<typeof subscriptionsRepo.listSubscriptionsByStore>>;
    audit: Awaited<ReturnType<typeof auditRepo.listAuditEventsByStore>>;
  }>
> {
  const access = await assertPlatformPermission(actorUserId, PLATFORM_PERMISSIONS.STORES_READ);

  if (!access.ok) {
    return access;
  }

  const store = await storesRepo.findStoreById(storeId);

  if (!store) {
    return serviceError('NOT_FOUND', 'Loja não encontrada');
  }

  const [planAccess, subscriptions, audit] = await Promise.all([
    resolveStorePlanAccess(storeId),
    subscriptionsRepo.listSubscriptionsByStore(storeId),
    auditRepo.listAuditEventsByStore(storeId, 40),
  ]);

  return serviceSuccess({ store, planAccess, subscriptions, audit });
}

export async function suspendStoreAdmin(
  raw: SuspendStoreInput,
  actorUserId: string
): Promise<ServiceResult<StoreRow>> {
  const access = await assertPlatformPermission(actorUserId, PLATFORM_PERMISSIONS.STORES_SUSPEND);

  if (!access.ok) {
    return access;
  }

  const parsed = suspendStoreSchema.safeParse(raw);

  if (!parsed.success) {
    return serviceError('VALIDATION', parsed.error.issues[0]?.message ?? 'Dados inválidos');
  }

  const { suspendStore } = await import('@server/onboarding/onboarding.service');

  return suspendStore(parsed.data.storeId, parsed.data.reason, actorUserId);
}

export async function reactivateStoreAdmin(
  raw: ReactivateStoreInput,
  actorUserId: string
): Promise<ServiceResult<StoreRow>> {
  const access = await assertPlatformPermission(actorUserId, PLATFORM_PERMISSIONS.STORES_SUSPEND);

  if (!access.ok) {
    return access;
  }

  const parsed = reactivateStoreSchema.safeParse(raw);

  if (!parsed.success) {
    return serviceError('VALIDATION', parsed.error.issues[0]?.message ?? 'Dados inválidos');
  }

  const store = await storesRepo.findStoreById(parsed.data.storeId);

  if (!store) {
    return serviceError('NOT_FOUND', 'Loja não encontrada');
  }

  if (store.status !== STORE_STATUS.SUSPENDED) {
    return serviceError('CONFLICT', 'Somente lojas suspensas podem ser reativadas');
  }

  const updated = await storesRepo.updateStore(store.id, {
    status: STORE_STATUS.ACTIVE,
    rejectionReason: null,
    reviewedAt: nowIso(),
    reviewedByUserId: actorUserId,
  });

  await auditRepo.insertAuditEvent({
    storeId: store.id,
    actorUserId,
    action: 'store.reactivated',
    entityType: 'store',
    entityId: store.id,
    payloadJson: JSON.stringify({ reason: parsed.data.reason }),
  });

  return serviceSuccess(updated);
}
