import { and, desc, eq } from 'drizzle-orm';

import {
  createId,
  fipePriceCache,
  getDb,
  nowIso,
  type FipePriceCacheRow,
  type NewFipePriceCacheRow,
} from '@lib/db';

export async function findCachedPrice(input: {
  provider: string;
  fipeCode: string;
  yearId: string;
  referenceCode: string;
}): Promise<FipePriceCacheRow | undefined> {
  const db = getDb();
  const rows = await db
    .select()
    .from(fipePriceCache)
    .where(
      and(
        eq(fipePriceCache.provider, input.provider),
        eq(fipePriceCache.fipeCode, input.fipeCode),
        eq(fipePriceCache.yearId, input.yearId),
        eq(fipePriceCache.referenceCode, input.referenceCode)
      )
    )
    .limit(1);

  return rows[0];
}

/** Última cotação conhecida para o código+ano (qualquer referência). */
export async function findLatestCachedPrice(input: {
  provider: string;
  fipeCode: string;
  yearId: string;
}): Promise<FipePriceCacheRow | undefined> {
  const db = getDb();
  const rows = await db
    .select()
    .from(fipePriceCache)
    .where(
      and(
        eq(fipePriceCache.provider, input.provider),
        eq(fipePriceCache.fipeCode, input.fipeCode),
        eq(fipePriceCache.yearId, input.yearId)
      )
    )
    .orderBy(desc(fipePriceCache.fetchedAt))
    .limit(1);

  return rows[0];
}

export async function upsertCachedPrice(
  input: Omit<NewFipePriceCacheRow, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
): Promise<FipePriceCacheRow> {
  const existing = await findCachedPrice({
    provider: input.provider,
    fipeCode: input.fipeCode,
    yearId: input.yearId,
    referenceCode: input.referenceCode,
  });

  const db = getDb();
  const stamp = nowIso();

  if (existing) {
    await db
      .update(fipePriceCache)
      .set({
        referenceLabel: input.referenceLabel,
        brandCode: input.brandCode,
        brandName: input.brandName,
        modelCode: input.modelCode,
        modelName: input.modelName,
        fuel: input.fuel,
        modelYear: input.modelYear,
        priceCents: input.priceCents,
        fetchedAt: input.fetchedAt,
        vehicleType: input.vehicleType,
        updatedAt: stamp,
      })
      .where(eq(fipePriceCache.id, existing.id));

    const rows = await db
      .select()
      .from(fipePriceCache)
      .where(eq(fipePriceCache.id, existing.id))
      .limit(1);

    const row = rows[0];

    if (!row) {
      throw new Error('Falha ao atualizar cache FIPE');
    }

    return row;
  }

  const id = input.id ?? createId();

  await db.insert(fipePriceCache).values({
    ...input,
    id,
    createdAt: stamp,
    updatedAt: stamp,
  });

  const rows = await db.select().from(fipePriceCache).where(eq(fipePriceCache.id, id)).limit(1);
  const row = rows[0];

  if (!row) {
    throw new Error('Falha ao inserir cache FIPE');
  }

  return row;
}
