'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { PERMISSIONS } from '@app-types/permissions';
import {
  clearActiveStoreCookie,
  requireSession,
  requireStoreAccess,
  setActiveStoreCookie,
} from '@server/auth/access';
import { auth } from '@server/auth/auth';
import { acceptStoreInvite, createStoreInvite } from '@server/invites/invites.service';
import { headers } from 'next/headers';

export async function switchActiveStoreAction(storeId: string) {
  const access = await requireStoreAccess({ storeId, permission: PERMISSIONS.STORE_READ });

  if (!access.ok) {
    return { ok: false as const, message: access.message };
  }

  await setActiveStoreCookie(storeId);
  revalidatePath('/painel');

  return { ok: true as const };
}

export async function signOutAction() {
  await auth.api.signOut({
    headers: await headers(),
  });
  await clearActiveStoreCookie();
  redirect('/entrar');
}

export async function acceptInviteAction(token: string) {
  const session = await requireSession();

  if (!session.ok) {
    return { ok: false as const, message: session.message, code: session.code };
  }

  const result = await acceptStoreInvite({ token });

  if (!result.ok) {
    return { ok: false as const, message: result.message, code: result.code };
  }

  await setActiveStoreCookie(result.data.storeId);
  redirect('/painel');
}

export async function createInviteAction(input: {
  storeId: string;
  email: string;
  role: string;
}) {
  const result = await createStoreInvite({
    storeId: input.storeId,
    email: input.email,
    role: input.role,
    expiresInDays: 7,
  });

  if (!result.ok) {
    return { ok: false as const, message: result.message };
  }

  return {
    ok: true as const,
    token: result.data.token,
    inviteId: result.data.invite.id,
  };
}
