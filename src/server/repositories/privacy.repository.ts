import { and, desc, eq } from 'drizzle-orm';

import {
  createId,
  getDb,
  nowIso,
  privacyRequests,
  type NewPrivacyRequestRow,
  type PrivacyRequestRow,
} from '@lib/db';

export async function insertPrivacyRequest(
  input: Omit<NewPrivacyRequestRow, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
): Promise<PrivacyRequestRow> {
  const db = getDb();
  const id = input.id ?? createId();
  const stamp = nowIso();

  await db.insert(privacyRequests).values({
    ...input,
    id,
    createdAt: stamp,
    updatedAt: stamp,
  });

  const rows = await db.select().from(privacyRequests).where(eq(privacyRequests.id, id)).limit(1);

  if (!rows[0]) {
    throw new Error('Falha ao criar solicitação de privacidade');
  }

  return rows[0];
}

export async function findPrivacyRequestInStore(
  storeId: string,
  requestId: string
): Promise<PrivacyRequestRow | undefined> {
  const db = getDb();
  const rows = await db
    .select()
    .from(privacyRequests)
    .where(and(eq(privacyRequests.storeId, storeId), eq(privacyRequests.id, requestId)))
    .limit(1);

  return rows[0];
}

export async function listPrivacyRequestsByStore(
  storeId: string,
  limit = 30
): Promise<PrivacyRequestRow[]> {
  const db = getDb();

  return db
    .select()
    .from(privacyRequests)
    .where(eq(privacyRequests.storeId, storeId))
    .orderBy(desc(privacyRequests.createdAt))
    .limit(limit);
}

export async function updatePrivacyRequest(
  id: string,
  patch: Partial<Omit<PrivacyRequestRow, 'id' | 'createdAt'>>
): Promise<PrivacyRequestRow> {
  const db = getDb();

  await db
    .update(privacyRequests)
    .set({ ...patch, updatedAt: nowIso() })
    .where(eq(privacyRequests.id, id));

  const rows = await db.select().from(privacyRequests).where(eq(privacyRequests.id, id)).limit(1);

  if (!rows[0]) {
    throw new Error('Solicitação não encontrada');
  }

  return rows[0];
}
