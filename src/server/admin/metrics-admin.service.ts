import { PLATFORM_PERMISSIONS, PLATFORM_ROLES } from '@app-types/platform';
import { eq } from 'drizzle-orm';

import { getDb, nowIso, users, type UserRow } from '@lib/db';
import { assertPlatformPermission } from '@server/auth/platform-admin';
import * as auditRepo from '@server/repositories/audit-events.repository';
import * as metricsRepo from '@server/repositories/platform-metrics.repository';
import { serviceError, serviceSuccess, type ServiceResult } from '@server/shared/service-result';

import {
  auditSearchSchema,
  platformMetricsQuerySchema,
  setPlatformRoleSchema,
  type AuditSearchInput,
  type PlatformMetricsQueryInput,
  type SetPlatformRoleInput,
} from './admin.validators';

export async function getPlatformMetricsAdmin(
  raw: PlatformMetricsQueryInput,
  actorUserId: string
) {
  const access = await assertPlatformPermission(actorUserId, PLATFORM_PERMISSIONS.METRICS_READ);

  if (!access.ok) {
    return access;
  }

  const parsed = platformMetricsQuerySchema.safeParse(raw);

  if (!parsed.success) {
    return serviceError('VALIDATION', parsed.error.issues[0]?.message ?? 'Filtros inválidos');
  }

  const to = parsed.data.to
    ? new Date(parsed.data.to).toISOString()
    : new Date().toISOString();
  const from = parsed.data.from
    ? new Date(parsed.data.from).toISOString()
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const metrics = await metricsRepo.fetchPlatformMetrics({ from, to });

  return serviceSuccess({ metrics, period: { from, to } });
}

export async function searchAuditAdmin(raw: AuditSearchInput, actorUserId: string) {
  const access = await assertPlatformPermission(actorUserId, PLATFORM_PERMISSIONS.AUDIT_READ);

  if (!access.ok) {
    return access;
  }

  const parsed = auditSearchSchema.safeParse(raw);

  if (!parsed.success) {
    return serviceError('VALIDATION', parsed.error.issues[0]?.message ?? 'Filtros inválidos');
  }

  const result = await auditRepo.searchPlatformAuditEvents(parsed.data);

  return serviceSuccess({
    ...result,
    page: parsed.data.page,
    pageSize: parsed.data.pageSize,
  });
}

export async function listPlatformUsersAdmin(
  actorUserId: string
): Promise<ServiceResult<UserRow[]>> {
  const access = await assertPlatformPermission(actorUserId, PLATFORM_PERMISSIONS.USERS_MANAGE);

  if (!access.ok) {
    return access;
  }

  const db = getDb();
  const admins = await db
    .select()
    .from(users)
    .where(eq(users.platformRole, PLATFORM_ROLES.ADMIN));

  return serviceSuccess(admins);
}

export async function setPlatformRoleAdmin(
  raw: SetPlatformRoleInput,
  actorUserId: string
): Promise<ServiceResult<UserRow>> {
  const access = await assertPlatformPermission(actorUserId, PLATFORM_PERMISSIONS.USERS_MANAGE);

  if (!access.ok) {
    return access;
  }

  const parsed = setPlatformRoleSchema.safeParse(raw);

  if (!parsed.success) {
    return serviceError('VALIDATION', parsed.error.issues[0]?.message ?? 'Dados inválidos');
  }

  if (parsed.data.userId === actorUserId && parsed.data.platformRole === PLATFORM_ROLES.USER) {
    return serviceError('CONFLICT', 'Não é possível remover o próprio acesso administrativo');
  }

  const db = getDb();
  const rows = await db.select().from(users).where(eq(users.id, parsed.data.userId)).limit(1);
  const target = rows[0];

  if (!target) {
    return serviceError('NOT_FOUND', 'Usuário não encontrado');
  }

  await db
    .update(users)
    .set({ platformRole: parsed.data.platformRole, updatedAt: nowIso() })
    .where(eq(users.id, target.id));

  const updatedRows = await db.select().from(users).where(eq(users.id, target.id)).limit(1);
  const updated = updatedRows[0]!;

  await auditRepo.insertAuditEvent({
    storeId: null,
    actorUserId,
    action: 'platform_user.role_changed',
    entityType: 'user',
    entityId: target.id,
    payloadJson: JSON.stringify({
      from: target.platformRole,
      to: parsed.data.platformRole,
      reason: parsed.data.reason,
    }),
  });

  return serviceSuccess(updated);
}
