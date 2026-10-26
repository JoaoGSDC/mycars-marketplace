import { eq } from 'drizzle-orm';

import {
  createId,
  getDb,
  nowIso,
  storeSlugRedirects,
  type StoreSlugRedirectRow,
} from '@lib/db';

export async function insertSlugRedirect(
  storeId: string,
  oldSlug: string
): Promise<StoreSlugRedirectRow> {
  const db = getDb();
  const id = createId();
  const stamp = nowIso();

  const existing = await findRedirectByOldSlug(oldSlug);

  if (existing) {
    return existing;
  }

  await db.insert(storeSlugRedirects).values({
    id,
    storeId,
    oldSlug,
    createdAt: stamp,
  });

  const [row] = await db
    .select()
    .from(storeSlugRedirects)
    .where(eq(storeSlugRedirects.oldSlug, oldSlug))
    .limit(1);

  if (!row) {
    throw new Error('Falha ao registrar redirect de slug');
  }

  return row;
}

export async function findRedirectByOldSlug(
  oldSlug: string
): Promise<StoreSlugRedirectRow | undefined> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(storeSlugRedirects)
    .where(eq(storeSlugRedirects.oldSlug, oldSlug))
    .limit(1);

  return row;
}
