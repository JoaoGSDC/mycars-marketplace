import { and, eq } from 'drizzle-orm';

import {
  createId,
  getDb,
  nowIso,
  storeInvites,
  type NewStoreInviteRow,
  type StoreInviteRow,
} from '@lib/db';

export async function insertInvite(
  input: Omit<NewStoreInviteRow, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
): Promise<StoreInviteRow> {
  const db = getDb();
  const id = input.id ?? createId();
  const stamp = nowIso();

  await db.insert(storeInvites).values({
    ...input,
    id,
    createdAt: stamp,
    updatedAt: stamp,
  });

  const row = await findInviteById(id);

  if (!row) {
    throw new Error('Falha ao inserir convite');
  }

  return row;
}

export async function findInviteById(id: string): Promise<StoreInviteRow | undefined> {
  const db = getDb();
  const rows = await db.select().from(storeInvites).where(eq(storeInvites.id, id)).limit(1);

  return rows[0];
}

export async function findInviteByTokenHash(tokenHash: string): Promise<StoreInviteRow | undefined> {
  const db = getDb();
  const rows = await db
    .select()
    .from(storeInvites)
    .where(eq(storeInvites.tokenHash, tokenHash))
    .limit(1);

  return rows[0];
}

export async function listPendingInvitesByStore(storeId: string): Promise<StoreInviteRow[]> {
  const db = getDb();

  return db
    .select()
    .from(storeInvites)
    .where(and(eq(storeInvites.storeId, storeId), eq(storeInvites.status, 'pending')));
}

export async function updateInvite(
  id: string,
  patch: Partial<
    Pick<StoreInviteRow, 'status' | 'acceptedAt' | 'acceptedUserId' | 'expiresAt'>
  >
): Promise<StoreInviteRow> {
  const db = getDb();

  await db
    .update(storeInvites)
    .set({ ...patch, updatedAt: nowIso() })
    .where(eq(storeInvites.id, id));

  const row = await findInviteById(id);

  if (!row) {
    throw new Error('Falha ao atualizar convite');
  }

  return row;
}
