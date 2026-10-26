import { cookies, headers } from 'next/headers';

import { MEMBERSHIP_STATUS, type StoreRole } from '@app-types/membership';
import {
  membershipGrantsPermission,
  type Permission,
} from '@app-types/permissions';
import type { StoreMembershipRow, StoreRow } from '@lib/db';
import * as membershipsRepo from '@server/repositories/store-memberships.repository';
import * as storesRepo from '@server/repositories/stores.repository';
import { serviceError, serviceSuccess, type ServiceResult } from '@server/shared/service-result';

import { auth, type AuthSession } from './auth';

export { assertMembershipPermission } from './permissions-guard';

export const ACTIVE_STORE_COOKIE = 'mycars_active_store';

export type AuthenticatedContext = {
  session: AuthSession;
  userId: string;
};

export type StoreAccessContext = {
  userId: string;
  storeId: string;
  store: StoreRow;
  membership: StoreMembershipRow;
  role: StoreRole;
};

export async function getSession(): Promise<AuthSession | null> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return session;
}

export async function requireSession(): Promise<ServiceResult<AuthenticatedContext>> {
  const session = await getSession();

  if (!session?.user?.id) {
    return serviceError('UNAUTHORIZED', 'Sessão necessária');
  }

  const status = (session.user as { status?: string }).status;

  if (status === 'disabled') {
    return serviceError('FORBIDDEN', 'Conta desativada');
  }

  return serviceSuccess({
    session,
    userId: session.user.id,
  });
}

export async function listUserStoreMemberships(userId: string): Promise<StoreMembershipRow[]> {
  return membershipsRepo.listActiveMembershipsByUser(userId);
}

export async function resolveActiveStoreId(
  userId: string,
  preferredStoreId?: string | null
): Promise<string | null> {
  const memberships = await listUserStoreMemberships(userId);

  if (memberships.length === 0) {
    return null;
  }

  if (preferredStoreId) {
    const match = memberships.find((m) => m.storeId === preferredStoreId);

    if (match) {
      return match.storeId;
    }
  }

  try {
    const jar = await cookies();
    const cookieStoreId = jar.get(ACTIVE_STORE_COOKIE)?.value;

    if (cookieStoreId) {
      const match = memberships.find((m) => m.storeId === cookieStoreId);

      if (match) {
        return match.storeId;
      }
    }
  } catch {
    // cookies() indisponível fora de request (testes)
  }

  return memberships[0]?.storeId ?? null;
}

export async function setActiveStoreCookie(storeId: string): Promise<void> {
  const jar = await cookies();

  jar.set(ACTIVE_STORE_COOKIE, storeId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearActiveStoreCookie(): Promise<void> {
  const jar = await cookies();

  jar.delete(ACTIVE_STORE_COOKIE);
}

/**
 * Autorização multi-tenant pura (sem cookies) — usada em services e testes.
 * Impede acesso cruzado e vínculos revogados.
 */
export async function authorizeStoreAction(
  userId: string,
  storeId: string,
  permission?: Permission
): Promise<ServiceResult<StoreAccessContext>> {
  const membership = await membershipsRepo.findMembership(storeId, userId);

  if (!membership) {
    return serviceError('FORBIDDEN', 'Usuário sem vínculo com a loja');
  }

  if (membership.status !== MEMBERSHIP_STATUS.ACTIVE) {
    return serviceError('FORBIDDEN', 'Vínculo com a loja revogado ou inativo');
  }

  const store = await storesRepo.findStoreById(storeId);

  if (!store) {
    return serviceError('NOT_FOUND', 'Loja não encontrada');
  }

  const role = membership.role as StoreRole;

  if (permission) {
    const allowed = membershipGrantsPermission(role, membership.permissionsJson, permission);

    if (!allowed) {
      return serviceError('FORBIDDEN', 'Permissão insuficiente para esta operação');
    }
  }

  return serviceSuccess({
    userId,
    storeId,
    store,
    membership,
    role,
  });
}

/**
 * Sessão HTTP + loja ativa + permissão.
 * Nunca confiar em role/storeId do client sem esta checagem.
 */
export async function requireStoreAccess(input: {
  storeId?: string | null;
  permission?: Permission;
}): Promise<ServiceResult<StoreAccessContext & AuthenticatedContext>> {
  const authResult = await requireSession();

  if (!authResult.ok) {
    return authResult;
  }

  const memberships = await listUserStoreMemberships(authResult.data.userId);

  if (memberships.length === 0) {
    return serviceError('FORBIDDEN', 'Usuário sem loja vinculada');
  }

  let targetStoreId = input.storeId ?? null;

  if (!targetStoreId) {
    targetStoreId = await resolveActiveStoreId(authResult.data.userId);
  }

  if (!targetStoreId) {
    return serviceError('FORBIDDEN', 'Usuário sem loja vinculada');
  }

  const authorized = await authorizeStoreAction(
    authResult.data.userId,
    targetStoreId,
    input.permission
  );

  if (!authorized.ok) {
    return authorized;
  }

  return serviceSuccess({
    ...authResult.data,
    ...authorized.data,
  });
}

