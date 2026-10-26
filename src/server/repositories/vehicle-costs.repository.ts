import { and, eq, sum } from 'drizzle-orm';

import {
  createId,
  getDb,
  nowIso,
  vehicleCosts,
  type NewVehicleCostRow,
  type VehicleCostRow,
} from '@lib/db';

export async function insertVehicleCost(
  input: Omit<NewVehicleCostRow, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
): Promise<VehicleCostRow> {
  const db = getDb();
  const id = input.id ?? createId();
  const stamp = nowIso();

  await db.insert(vehicleCosts).values({
    ...input,
    id,
    createdAt: stamp,
    updatedAt: stamp,
  });

  const rows = await db.select().from(vehicleCosts).where(eq(vehicleCosts.id, id)).limit(1);
  const row = rows[0];

  if (!row) {
    throw new Error('Falha ao inserir custo');
  }

  return row;
}

export async function listCostsByVehicle(
  storeId: string,
  vehicleId: string
): Promise<VehicleCostRow[]> {
  const db = getDb();

  return db
    .select()
    .from(vehicleCosts)
    .where(and(eq(vehicleCosts.storeId, storeId), eq(vehicleCosts.vehicleId, vehicleId)));
}

export async function sumCostsByVehicle(storeId: string, vehicleId: string): Promise<number> {
  const db = getDb();
  const [row] = await db
    .select({ total: sum(vehicleCosts.amountCents) })
    .from(vehicleCosts)
    .where(and(eq(vehicleCosts.storeId, storeId), eq(vehicleCosts.vehicleId, vehicleId)));

  return Number(row?.total ?? 0);
}

export async function findCostInStore(
  storeId: string,
  costId: string
): Promise<VehicleCostRow | undefined> {
  const db = getDb();
  const rows = await db
    .select()
    .from(vehicleCosts)
    .where(and(eq(vehicleCosts.storeId, storeId), eq(vehicleCosts.id, costId)))
    .limit(1);

  return rows[0];
}

export async function deleteVehicleCost(storeId: string, costId: string): Promise<boolean> {
  const existing = await findCostInStore(storeId, costId);

  if (!existing) {
    return false;
  }

  const db = getDb();
  await db
    .delete(vehicleCosts)
    .where(and(eq(vehicleCosts.storeId, storeId), eq(vehicleCosts.id, costId)));

  return true;
}
