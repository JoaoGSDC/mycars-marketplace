import { and, eq } from 'drizzle-orm';

import {
  createId,
  getDb,
  nowIso,
  storeMemberships,
  type NewStoreMembershipRow,
  type StoreMembershipRow,
} from '@lib/db';

export async function insertMembership(
  input: Omit<NewStoreMembershipRow, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
): Promise<StoreMembershipRow> {
  const db = getDb();
  const id = input.id ?? createId();
  const stamp = nowIso();

  await db.insert(storeMemberships).values({
    ...input,
    id,
    createdAt: stamp,
    updatedAt: stamp,
  });

  const row = await findMembershipById(id);

  if (!row) {
    throw new Error('Falha ao inserir membership');
  }

  return row;
}

export async function findMembershipById(id: string): Promise<StoreMembershipRow | undefined> {
  const db = getDb();
  const rows = await db.select().from(storeMemberships).where(eq(storeMemberships.id, id)).limit(1);

  return rows[0];
}

export async function findMembership(storeId: string, userId: string): Promise<StoreMembershipRow | undefined> {
  const db = getDb();
  const rows = await db
    .select()
    .from(storeMemberships)
    .where(and(eq(storeMemberships.storeId, storeId), eq(storeMemberships.userId, userId)))
    .limit(1);

  return rows[0];
}

export async function listMembershipsByStore(storeId: string): Promise<StoreMembershipRow[]> {
  const db = getDb();

  return db.select().from(storeMemberships).where(eq(storeMemberships.storeId, storeId));
}

export async function listMembershipsByUser(userId: string): Promise<StoreMembershipRow[]> {
  const db = getDb();

  return db.select().from(storeMemberships).where(eq(storeMemberships.userId, userId));
}

export async function updateMembership(
  id: string,
  patch: Partial<Pick<StoreMembershipRow, 'role' | 'permissionsJson' | 'status'>>
): Promise<StoreMembershipRow> {
  const db = getDb();

  await db
    .update(storeMemberships)
    .set({ ...patch, updatedAt: nowIso() })
    .where(eq(storeMemberships.id, id));

  const row = await findMembershipById(id);

  if (!row) {
    throw new Error('Falha ao atualizar membership');
  }

  return row;
}

export async function listActiveMembershipsByUser(userId: string): Promise<StoreMembershipRow[]> {
  const db = getDb();

  return db
    .select()
    .from(storeMemberships)
    .where(and(eq(storeMemberships.userId, userId), eq(storeMemberships.status, 'active')));
}
