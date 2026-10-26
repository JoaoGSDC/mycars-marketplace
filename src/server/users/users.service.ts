import * as membershipsRepo from '@server/repositories/store-memberships.repository';
import * as usersRepo from '@server/repositories/users.repository';
import * as auditRepo from '@server/repositories/audit-events.repository';
import { serviceError, serviceSuccess, type ServiceResult } from '@server/shared/service-result';
import type { StoreMembershipRow, UserRow } from '@lib/db';
import { MEMBERSHIP_STATUS, STORE_ROLES, type StoreRole } from '@app-types/membership';

import { createUserSchema, type CreateUserInput } from './users.validators';

export async function createUser(raw: CreateUserInput): Promise<ServiceResult<UserRow>> {
  const parsed = createUserSchema.safeParse(raw);

  if (!parsed.success) {
    return serviceError('VALIDATION', parsed.error.issues[0]?.message ?? 'Dados inválidos');
  }

  const existing = await usersRepo.findUserByEmail(parsed.data.email.toLowerCase());

  if (existing) {
    return serviceError('CONFLICT', 'E-mail já cadastrado');
  }

  const user = await usersRepo.insertUser({
    email: parsed.data.email.toLowerCase(),
    name: parsed.data.name,
    phone: parsed.data.phone ?? null,
    image: parsed.data.image ?? null,
    emailVerified: false,
    status: parsed.data.status,
  });

  return serviceSuccess(user);
}

export async function addStoreMember(input: {
  storeId: string;
  userId: string;
  role: StoreRole;
  permissions?: string[];
}): Promise<ServiceResult<StoreMembershipRow>> {
  const existing = await membershipsRepo.findMembership(input.storeId, input.userId);

  if (existing) {
    if (existing.status === MEMBERSHIP_STATUS.REVOKED) {
      const restored = await membershipsRepo.updateMembership(existing.id, {
        role: input.role,
        permissionsJson: JSON.stringify(input.permissions ?? []),
        status: MEMBERSHIP_STATUS.ACTIVE,
      });

      await auditRepo.insertAuditEvent({
        storeId: input.storeId,
        actorUserId: null,
        action: 'membership.restored',
        entityType: 'store_membership',
        entityId: restored.id,
        payload: { userId: input.userId, role: input.role },
      });

      return serviceSuccess(restored);
    }

    return serviceError('CONFLICT', 'Usuário já vinculado a esta loja');
  }

  if (!Object.values(STORE_ROLES).includes(input.role)) {
    return serviceError('VALIDATION', 'Papel inválido');
  }

  const membership = await membershipsRepo.insertMembership({
    storeId: input.storeId,
    userId: input.userId,
    role: input.role,
    permissionsJson: JSON.stringify(input.permissions ?? []),
    status: MEMBERSHIP_STATUS.ACTIVE,
  });

  await auditRepo.insertAuditEvent({
    storeId: input.storeId,
    actorUserId: null,
    action: 'membership.created',
    entityType: 'store_membership',
    entityId: membership.id,
    payload: { userId: input.userId, role: input.role },
  });

  return serviceSuccess(membership);
}

export async function updateStoreMemberPermissions(input: {
  storeId: string;
  userId: string;
  role?: StoreRole;
  permissions?: string[];
  actorUserId?: string | null;
}): Promise<ServiceResult<StoreMembershipRow>> {
  const membership = await membershipsRepo.findMembership(input.storeId, input.userId);

  if (!membership || membership.status !== MEMBERSHIP_STATUS.ACTIVE) {
    return serviceError('NOT_FOUND', 'Vínculo ativo não encontrado');
  }

  if (input.role && !Object.values(STORE_ROLES).includes(input.role)) {
    return serviceError('VALIDATION', 'Papel inválido');
  }

  const patch: Partial<Pick<StoreMembershipRow, 'role' | 'permissionsJson'>> = {};

  if (input.role && input.role !== membership.role) {
    patch.role = input.role;
  }

  if (input.permissions) {
    patch.permissionsJson = JSON.stringify(input.permissions);
  }

  if (Object.keys(patch).length === 0) {
    return serviceSuccess(membership);
  }

  const updated = await membershipsRepo.updateMembership(membership.id, patch);

  await auditRepo.insertAuditEvent({
    storeId: input.storeId,
    actorUserId: input.actorUserId ?? null,
    action: 'membership.permissions_changed',
    entityType: 'store_membership',
    entityId: updated.id,
    payload: {
      userId: input.userId,
      from: { role: membership.role, permissionsJson: membership.permissionsJson },
      to: { role: updated.role, permissionsJson: updated.permissionsJson },
    },
  });

  return serviceSuccess(updated);
}

export async function revokeStoreMembership(
  storeId: string,
  userId: string,
  actorUserId?: string | null
): Promise<ServiceResult<StoreMembershipRow>> {
  const membership = await membershipsRepo.findMembership(storeId, userId);

  if (!membership) {
    return serviceError('NOT_FOUND', 'Vínculo não encontrado');
  }

  if (membership.status === MEMBERSHIP_STATUS.REVOKED) {
    return serviceSuccess(membership);
  }

  const updated = await membershipsRepo.updateMembership(membership.id, {
    status: MEMBERSHIP_STATUS.REVOKED,
  });

  await auditRepo.insertAuditEvent({
    storeId,
    actorUserId: actorUserId ?? null,
    action: 'membership.revoked',
    entityType: 'store_membership',
    entityId: updated.id,
    payload: { userId, role: membership.role },
  });

  return serviceSuccess(updated);
}

export async function assertUserBelongsToStore(
  storeId: string,
  userId: string
): Promise<ServiceResult<StoreMembershipRow>> {
  const membership = await membershipsRepo.findMembership(storeId, userId);

  if (!membership || membership.status !== MEMBERSHIP_STATUS.ACTIVE) {
    return serviceError('FORBIDDEN', 'Usuário sem vínculo ativo com a loja');
  }

  return serviceSuccess(membership);
}
