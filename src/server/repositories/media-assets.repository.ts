import { and, eq, lt } from 'drizzle-orm';

import {
  createId,
  getDb,
  mediaAssets,
  nowIso,
  type MediaAssetRow,
  type NewMediaAssetRow,
} from '@lib/db';

export async function insertMediaAsset(
  input: Omit<NewMediaAssetRow, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
): Promise<MediaAssetRow> {
  const db = getDb();
  const id = input.id ?? createId();
  const stamp = nowIso();

  await db.insert(mediaAssets).values({
    ...input,
    id,
    createdAt: stamp,
    updatedAt: stamp,
  });

  const row = await findMediaAssetById(id);

  if (!row) {
    throw new Error('Falha ao inserir media asset');
  }

  return row;
}

export async function findMediaAssetById(id: string): Promise<MediaAssetRow | undefined> {
  const db = getDb();
  const rows = await db.select().from(mediaAssets).where(eq(mediaAssets.id, id)).limit(1);

  return rows[0];
}

export async function findMediaAssetInStore(
  storeId: string,
  assetId: string
): Promise<MediaAssetRow | undefined> {
  const db = getDb();
  const rows = await db
    .select()
    .from(mediaAssets)
    .where(and(eq(mediaAssets.storeId, storeId), eq(mediaAssets.id, assetId)))
    .limit(1);

  return rows[0];
}

export async function updateMediaAsset(
  assetId: string,
  patch: Partial<Omit<NewMediaAssetRow, 'id' | 'storeId' | 'createdAt'>>
): Promise<MediaAssetRow> {
  const db = getDb();
  await db
    .update(mediaAssets)
    .set({ ...patch, updatedAt: nowIso() })
    .where(eq(mediaAssets.id, assetId));

  const row = await findMediaAssetById(assetId);

  if (!row) {
    throw new Error('Media asset não encontrado após update');
  }

  return row;
}

export async function listPendingOlderThan(isoCutoff: string): Promise<MediaAssetRow[]> {
  const db = getDb();

  return db
    .select()
    .from(mediaAssets)
    .where(and(eq(mediaAssets.status, 'pending'), lt(mediaAssets.createdAt, isoCutoff)));
}

export async function markAssetsAttached(
  storeId: string,
  assetIds: string[],
  entityType: string,
  entityId: string
): Promise<void> {
  const db = getDb();
  const stamp = nowIso();

  for (const id of assetIds) {
    await db
      .update(mediaAssets)
      .set({
        status: 'attached',
        entityType,
        entityId,
        updatedAt: stamp,
      })
      .where(and(eq(mediaAssets.storeId, storeId), eq(mediaAssets.id, id)));
  }
}
