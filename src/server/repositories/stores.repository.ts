import { and, count, desc, eq, like, or, type SQL } from 'drizzle-orm';

import { createId, getDb, nowIso, stores, type NewStoreRow, type StoreRow } from '@lib/db';

export async function insertStore(
  input: Omit<NewStoreRow, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
): Promise<StoreRow> {
  const db = getDb();
  const id = input.id ?? createId();
  const stamp = nowIso();

  await db.insert(stores).values({
    ...input,
    id,
    createdAt: stamp,
    updatedAt: stamp,
  });

  const row = await findStoreById(id);

  if (!row) {
    throw new Error('Falha ao inserir loja');
  }

  return row;
}

export async function findStoreById(id: string): Promise<StoreRow | undefined> {
  const db = getDb();
  const rows = await db.select().from(stores).where(eq(stores.id, id)).limit(1);

  return rows[0];
}

export async function findStoreBySlug(slug: string): Promise<StoreRow | undefined> {
  const db = getDb();
  const rows = await db.select().from(stores).where(eq(stores.slug, slug)).limit(1);

  return rows[0];
}

export async function findStoreBySubdomain(subdomain: string): Promise<StoreRow | undefined> {
  const db = getDb();
  const rows = await db.select().from(stores).where(eq(stores.subdomain, subdomain)).limit(1);

  return rows[0];
}

export async function findStoreByDocument(document: string): Promise<StoreRow | undefined> {
  const db = getDb();
  const rows = await db.select().from(stores).where(eq(stores.document, document)).limit(1);

  return rows[0];
}

export async function listStoresByStatus(status?: string): Promise<StoreRow[]> {
  const db = getDb();

  if (!status) {
    return db.select().from(stores).orderBy(desc(stores.createdAt));
  }

  return db
    .select()
    .from(stores)
    .where(eq(stores.status, status))
    .orderBy(desc(stores.createdAt));
}

export async function searchStores(params: {
  status?: string;
  q?: string;
  page: number;
  pageSize: number;
}): Promise<{ items: StoreRow[]; total: number }> {
  const db = getDb();
  const conditions: SQL[] = [];

  if (params.status) {
    conditions.push(eq(stores.status, params.status));
  }

  const q = params.q?.trim();

  if (q) {
    const pattern = `%${q}%`;
    conditions.push(
      or(
        like(stores.publicName, pattern),
        like(stores.tradeName, pattern),
        like(stores.slug, pattern),
        like(stores.document, pattern),
        like(stores.responsibleEmail, pattern)
      )!
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const [totalRow] = await db.select({ value: count() }).from(stores).where(where);
  const items = await db
    .select()
    .from(stores)
    .where(where)
    .orderBy(desc(stores.createdAt))
    .limit(params.pageSize)
    .offset((params.page - 1) * params.pageSize);

  return { items, total: Number(totalRow?.value ?? 0) };
}

export async function updateStore(
  id: string,
  patch: Partial<Omit<StoreRow, 'id' | 'createdAt'>>
): Promise<StoreRow> {
  const db = getDb();

  await db
    .update(stores)
    .set({ ...patch, updatedAt: nowIso() })
    .where(eq(stores.id, id));

  const row = await findStoreById(id);

  if (!row) {
    throw new Error('Falha ao atualizar loja');
  }

  return row;
}
