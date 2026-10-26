import { eq } from 'drizzle-orm';

import { createId, getDb, nowIso, users, type NewUserRow, type UserRow } from '@lib/db';

export async function insertUser(
  input: Omit<NewUserRow, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
): Promise<UserRow> {
  const db = getDb();
  const id = input.id ?? createId();
  const stamp = nowIso();

  await db.insert(users).values({
    ...input,
    id,
    createdAt: stamp,
    updatedAt: stamp,
  });

  const row = await findUserById(id);

  if (!row) {
    throw new Error('Falha ao inserir usuário');
  }

  return row;
}

export async function findUserById(id: string): Promise<UserRow | undefined> {
  const db = getDb();
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);

  return rows[0];
}

export async function findUserByEmail(email: string): Promise<UserRow | undefined> {
  const db = getDb();
  const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);

  return rows[0];
}
