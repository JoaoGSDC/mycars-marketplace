import { createHash, randomBytes } from 'node:crypto';

import { INVITE_STATUS, MEMBERSHIP_STATUS, STORE_ROLES, type StoreRole } from '@app-types/membership';
import { PERMISSIONS } from '@app-types/permissions';
import { nowIso, type StoreInviteRow, type StoreMembershipRow } from '@lib/db';
import { requireSession, requireStoreAccess } from '@server/auth/access';
import * as invitesRepo from '@server/repositories/store-invites.repository';
import * as membershipsRepo from '@server/repositories/store-memberships.repository';
import { serviceError, serviceSuccess, type ServiceResult } from '@server/shared/service-result';
import { addStoreMember } from '@server/users/users.service';

import {
  acceptInviteSchema,
  createInviteSchema,
  type AcceptInviteInput,
  type CreateInviteInput,
} from './invites.validators';

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function createInviteToken(): string {
  return randomBytes(32).toString('base64url');
}

export type CreateInviteResult = {
  invite: StoreInviteRow;
  /** Token plaintext — exibir/enviar uma vez; nunca persistir. */
  token: string;
};

export async function createStoreInvite(
  raw: CreateInviteInput
): Promise<ServiceResult<CreateInviteResult>> {
  const parsed = createInviteSchema.safeParse(raw);

  if (!parsed.success) {
    return serviceError('VALIDATION', parsed.error.issues[0]?.message ?? 'Dados inválidos');
  }

  const access = await requireStoreAccess({
    storeId: parsed.data.storeId,
    permission: PERMISSIONS.INVITES_MANAGE,
  });

  if (!access.ok) {
    return access;
  }

  if (parsed.data.role === STORE_ROLES.OWNER && access.data.role !== STORE_ROLES.OWNER) {
    return serviceError('FORBIDDEN', 'Somente o proprietário pode convidar outro proprietário');
  }

  const token = createInviteToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(
    Date.now() + parsed.data.expiresInDays * 24 * 60 * 60 * 1000
  ).toISOString();

  const invite = await invitesRepo.insertInvite({
    storeId: parsed.data.storeId,
    email: parsed.data.email.toLowerCase(),
    role: parsed.data.role,
    tokenHash,
    status: INVITE_STATUS.PENDING,
    expiresAt,
    invitedByUserId: access.data.userId,
    acceptedAt: null,
    acceptedUserId: null,
  });

  if (process.env.NODE_ENV !== 'production') {
    console.info('[invite] criado', {
      email: invite.email,
      storeId: invite.storeId,
      path: `/convite?token=${token}`,
    });
  }

  return serviceSuccess({ invite, token });
}

export async function revokeStoreInvite(
  inviteId: string,
  storeId: string
): Promise<ServiceResult<StoreInviteRow>> {
  const access = await requireStoreAccess({
    storeId,
    permission: PERMISSIONS.INVITES_MANAGE,
  });

  if (!access.ok) {
    return access;
  }

  const invite = await invitesRepo.findInviteById(inviteId);

  if (!invite || invite.storeId !== storeId) {
    return serviceError('NOT_FOUND', 'Convite não encontrado');
  }

  const updated = await invitesRepo.updateInvite(invite.id, {
    status: INVITE_STATUS.REVOKED,
  });

  return serviceSuccess(updated);
}

export async function acceptStoreInvite(
  raw: AcceptInviteInput
): Promise<ServiceResult<StoreMembershipRow>> {
  const parsed = acceptInviteSchema.safeParse(raw);

  if (!parsed.success) {
    return serviceError('VALIDATION', parsed.error.issues[0]?.message ?? 'Token inválido');
  }

  const session = await requireSession();

  if (!session.ok) {
    return session;
  }

  const invite = await invitesRepo.findInviteByTokenHash(hashToken(parsed.data.token));

  if (!invite) {
    return serviceError('NOT_FOUND', 'Convite inválido');
  }

  if (invite.status === INVITE_STATUS.REVOKED) {
    return serviceError('FORBIDDEN', 'Convite revogado');
  }

  if (invite.status === INVITE_STATUS.ACCEPTED) {
    return serviceError('CONFLICT', 'Convite já utilizado');
  }

  if (new Date(invite.expiresAt).getTime() < Date.now()) {
    await invitesRepo.updateInvite(invite.id, { status: INVITE_STATUS.EXPIRED });
    return serviceError('FORBIDDEN', 'Convite expirado');
  }

  const email = session.data.session.user.email?.toLowerCase();

  if (!email || email !== invite.email.toLowerCase()) {
    return serviceError('FORBIDDEN', 'Convite destinado a outro e-mail');
  }

  const membershipResult = await addStoreMember({
    storeId: invite.storeId,
    userId: session.data.userId,
    role: invite.role as StoreRole,
  });

  if (!membershipResult.ok) {
    return membershipResult;
  }

  await invitesRepo.updateInvite(invite.id, {
    status: INVITE_STATUS.ACCEPTED,
    acceptedAt: nowIso(),
    acceptedUserId: session.data.userId,
  });

  return membershipResult;
}

/** Aceita convite em fluxos de teste sem cookies Next (passando userId/email). */
export async function acceptStoreInviteForUser(input: {
  token: string;
  userId: string;
  email: string;
}): Promise<ServiceResult<StoreMembershipRow>> {
  const invite = await invitesRepo.findInviteByTokenHash(hashToken(input.token));

  if (!invite) {
    return serviceError('NOT_FOUND', 'Convite inválido');
  }

  if (invite.status !== INVITE_STATUS.PENDING) {
    return serviceError('FORBIDDEN', 'Convite indisponível');
  }

  if (new Date(invite.expiresAt).getTime() < Date.now()) {
    await invitesRepo.updateInvite(invite.id, { status: INVITE_STATUS.EXPIRED });
    return serviceError('FORBIDDEN', 'Convite expirado');
  }

  if (input.email.toLowerCase() !== invite.email.toLowerCase()) {
    return serviceError('FORBIDDEN', 'Convite destinado a outro e-mail');
  }

  const membershipResult = await addStoreMember({
    storeId: invite.storeId,
    userId: input.userId,
    role: invite.role as StoreRole,
  });

  if (!membershipResult.ok) {
    return membershipResult;
  }

  await invitesRepo.updateInvite(invite.id, {
    status: INVITE_STATUS.ACCEPTED,
    acceptedAt: nowIso(),
    acceptedUserId: input.userId,
  });

  return membershipResult;
}

export async function revokeMembershipAndInvalidateAccess(input: {
  storeId: string;
  targetUserId: string;
}): Promise<ServiceResult<StoreMembershipRow>> {
  const access = await requireStoreAccess({
    storeId: input.storeId,
    permission: PERMISSIONS.MEMBERS_MANAGE,
  });

  if (!access.ok) {
    return access;
  }

  if (input.targetUserId === access.data.userId) {
    return serviceError('VALIDATION', 'Não é possível revogar o próprio vínculo por este fluxo');
  }

  const membership = await membershipsRepo.findMembership(input.storeId, input.targetUserId);

  if (!membership) {
    return serviceError('NOT_FOUND', 'Vínculo não encontrado');
  }

  if (membership.role === STORE_ROLES.OWNER && access.data.role !== STORE_ROLES.OWNER) {
    return serviceError('FORBIDDEN', 'Somente o proprietário pode revogar outro proprietário');
  }

  const updated = await membershipsRepo.updateMembership(membership.id, {
    status: MEMBERSHIP_STATUS.REVOKED,
  });

  return serviceSuccess(updated);
}

export { hashToken, createInviteToken };
