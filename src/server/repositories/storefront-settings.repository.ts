import { eq } from 'drizzle-orm';

import {
  createId,
  getDb,
  nowIso,
  storefrontSettings,
  type NewStorefrontSettingsRow,
  type StorefrontSettingsRow,
} from '@lib/db';

export async function upsertStorefrontSettings(
  input: Omit<NewStorefrontSettingsRow, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
): Promise<StorefrontSettingsRow> {
  const db = getDb();
  const existing = await findStorefrontByStoreId(input.storeId);
  const stamp = nowIso();

  if (existing) {
    await db
      .update(storefrontSettings)
      .set({ ...input, updatedAt: stamp })
      .where(eq(storefrontSettings.storeId, input.storeId));

    const updated = await findStorefrontByStoreId(input.storeId);

    if (!updated) {
      throw new Error('Falha ao atualizar storefront');
    }

    return updated;
  }

  const id = input.id ?? createId();

  await db.insert(storefrontSettings).values({
    ...input,
    id,
    createdAt: stamp,
    updatedAt: stamp,
  });

  const created = await findStorefrontByStoreId(input.storeId);

  if (!created) {
    throw new Error('Falha ao inserir storefront');
  }

  return created;
}

export async function findStorefrontByStoreId(storeId: string): Promise<StorefrontSettingsRow | undefined> {
  const db = getDb();
  const rows = await db
    .select()
    .from(storefrontSettings)
    .where(eq(storefrontSettings.storeId, storeId))
    .limit(1);

  return rows[0];
}
