import { eq } from 'drizzle-orm';

import {
  PLATFORM_ROLES,
  platformRoleGrantsPermission,
  type PlatformPermission,
} from '@app-types/platform';
import { getDb, users, type UserRow } from '@lib/db';
import { requireSession, type AuthenticatedContext } from '@server/auth/access';
import { serviceError, serviceSuccess, type ServiceResult } from '@server/shared/service-result';

export type PlatformAdminContext = AuthenticatedContext & {
  platformRole: string;
  user: UserRow;
};

export async function requirePlatformAdmin(): Promise<ServiceResult<PlatformAdminContext>> {
  const session = await requireSession();

  if (!session.ok) {
    return session;
  }

  const db = getDb();
  const rows = await db.select().from(users).where(eq(users.id, session.data.userId)).limit(1);
  const user = rows[0];

  if (!user || user.platformRole !== PLATFORM_ROLES.ADMIN) {
    return serviceError('FORBIDDEN', 'Acesso restrito a administradores da plataforma');
  }

  return serviceSuccess({
    ...session.data,
    platformRole: user.platformRole,
    user,
  });
}

export async function requirePlatformPermission(
  permission: PlatformPermission
): Promise<ServiceResult<PlatformAdminContext>> {
  const admin = await requirePlatformAdmin();

  if (!admin.ok) {
    return admin;
  }

  if (!platformRoleGrantsPermission(admin.data.platformRole, permission)) {
    return serviceError('FORBIDDEN', 'Permissão administrativa insuficiente');
  }

  return admin;
}

export async function assertPlatformPermission(
  userId: string,
  permission: PlatformPermission
): Promise<ServiceResult<UserRow>> {
  const db = getDb();
  const rows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const user = rows[0];

  if (!user || user.platformRole !== PLATFORM_ROLES.ADMIN) {
    return serviceError('FORBIDDEN', 'Acesso restrito a administradores da plataforma');
  }

  if (!platformRoleGrantsPermission(user.platformRole, permission)) {
    return serviceError('FORBIDDEN', 'Permissão administrativa insuficiente');
  }

  return serviceSuccess(user);
}

export async function isPlatformAdminUser(userId: string): Promise<boolean> {
  const db = getDb();
  const rows = await db.select().from(users).where(eq(users.id, userId)).limit(1);

  return rows[0]?.platformRole === PLATFORM_ROLES.ADMIN;
}
