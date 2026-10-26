import { and, asc, eq } from 'drizzle-orm';

import {
  createId,
  getDb,
  nowIso,
  vehicleMedia,
  type NewVehicleMediaRow,
  type VehicleMediaRow,
} from '@lib/db';

export async function insertVehicleMedia(
  input: Omit<NewVehicleMediaRow, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
): Promise<VehicleMediaRow> {
  const db = getDb();
  const id = input.id ?? createId();
  const stamp = nowIso();

  await db.insert(vehicleMedia).values({
    ...input,
    id,
    createdAt: stamp,
    updatedAt: stamp,
  });

  const rows = await db.select().from(vehicleMedia).where(eq(vehicleMedia.id, id)).limit(1);
  const row = rows[0];

  if (!row) {
    throw new Error('Falha ao inserir mídia');
  }

  return row;
}

export async function listMediaByVehicle(
  storeId: string,
  vehicleId: string
): Promise<VehicleMediaRow[]> {
  const db = getDb();

  return db
    .select()
    .from(vehicleMedia)
    .where(and(eq(vehicleMedia.storeId, storeId), eq(vehicleMedia.vehicleId, vehicleId)))
    .orderBy(asc(vehicleMedia.sortOrder));
}

export async function deleteMediaByVehicle(storeId: string, vehicleId: string): Promise<VehicleMediaRow[]> {
  const existing = await listMediaByVehicle(storeId, vehicleId);
  const db = getDb();

  await db
    .delete(vehicleMedia)
    .where(and(eq(vehicleMedia.storeId, storeId), eq(vehicleMedia.vehicleId, vehicleId)));

  return existing;
}

export type VehicleMediaWriteItem = {
  url: string;
  cardUrl?: string | null;
  detailUrl?: string | null;
  storageKey?: string | null;
  mediaAssetId?: string | null;
  sortOrder: number;
  isPrimary: boolean;
  alt?: string | null;
  width?: number | null;
  height?: number | null;
  mimeType?: string | null;
};

export async function replaceVehicleMedia(
  storeId: string,
  vehicleId: string,
  items: VehicleMediaWriteItem[]
): Promise<{ inserted: VehicleMediaRow[]; previous: VehicleMediaRow[] }> {
  const previous = await deleteMediaByVehicle(storeId, vehicleId);
  const inserted: VehicleMediaRow[] = [];

  for (const item of items) {
    const row = await insertVehicleMedia({
      storeId,
      vehicleId,
      url: item.url,
      cardUrl: item.cardUrl ?? null,
      detailUrl: item.detailUrl ?? null,
      storageKey: item.storageKey ?? null,
      mediaAssetId: item.mediaAssetId ?? null,
      sortOrder: item.sortOrder,
      isPrimary: item.isPrimary ? 'true' : 'false',
      alt: item.alt ?? null,
      width: item.width ?? null,
      height: item.height ?? null,
      mimeType: item.mimeType ?? null,
    });
    inserted.push(row);
  }

  return { inserted, previous };
}
