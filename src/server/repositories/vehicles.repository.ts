import { and, asc, count, desc, eq, gte, like, lte, or, sql, type SQL } from 'drizzle-orm';

import {
  createId,
  getDb,
  nowIso,
  vehicles,
  type NewVehicleRow,
  type VehicleRow,
} from '@lib/db';
import type { VehicleStatus } from '@app-types/status';
import { VEHICLE_STATUS } from '@app-types/status';
import type { VehicleListSort, SortDir, VehicleStatusCounts } from '@app-types/inventory';

export async function insertVehicle(
  input: Omit<NewVehicleRow, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
): Promise<VehicleRow> {
  const db = getDb();
  const id = input.id ?? createId();
  const stamp = nowIso();

  await db.insert(vehicles).values({
    ...input,
    id,
    createdAt: stamp,
    updatedAt: stamp,
  });

  const row = await findVehicleById(id);

  if (!row) {
    throw new Error('Falha ao inserir veículo');
  }

  return row;
}

export async function findVehicleById(id: string): Promise<VehicleRow | undefined> {
  const db = getDb();
  const rows = await db.select().from(vehicles).where(eq(vehicles.id, id)).limit(1);

  return rows[0];
}

export async function listVehiclesByStore(storeId: string): Promise<VehicleRow[]> {
  const db = getDb();

  return db.select().from(vehicles).where(eq(vehicles.storeId, storeId));
}

export async function findVehicleInStore(
  storeId: string,
  vehicleId: string
): Promise<VehicleRow | undefined> {
  const db = getDb();
  const rows = await db
    .select()
    .from(vehicles)
    .where(and(eq(vehicles.storeId, storeId), eq(vehicles.id, vehicleId)))
    .limit(1);

  return rows[0];
}

export async function findVehicleByPlateInStore(
  storeId: string,
  plate: string,
  excludeId?: string
): Promise<VehicleRow | undefined> {
  const db = getDb();
  const normalized = plate.toUpperCase().replace(/\s+/g, '');
  const conditions: SQL[] = [eq(vehicles.storeId, storeId), eq(vehicles.plate, normalized)];

  if (excludeId) {
    conditions.push(sql`${vehicles.id} != ${excludeId}`);
  }

  const rows = await db
    .select()
    .from(vehicles)
    .where(and(...conditions))
    .limit(1);

  return rows[0];
}

export async function findVehicleByInternalCodeInStore(
  storeId: string,
  internalCode: string,
  excludeId?: string
): Promise<VehicleRow | undefined> {
  const db = getDb();
  const conditions: SQL[] = [eq(vehicles.storeId, storeId), eq(vehicles.internalCode, internalCode)];

  if (excludeId) {
    conditions.push(sql`${vehicles.id} != ${excludeId}`);
  }

  const rows = await db
    .select()
    .from(vehicles)
    .where(and(...conditions))
    .limit(1);

  return rows[0];
}

export async function findVehicleByVinInStore(
  storeId: string,
  vin: string,
  excludeId?: string
): Promise<VehicleRow | undefined> {
  const db = getDb();
  const normalized = vin.toUpperCase().replace(/\s+/g, '');
  const conditions: SQL[] = [eq(vehicles.storeId, storeId), eq(vehicles.vin, normalized)];

  if (excludeId) {
    conditions.push(sql`${vehicles.id} != ${excludeId}`);
  }

  const rows = await db
    .select()
    .from(vehicles)
    .where(and(...conditions))
    .limit(1);

  return rows[0];
}

export type SearchVehiclesParams = {
  storeId: string;
  q?: string;
  status?: string;
  makeSlug?: string;
  modelSlug?: string;
  yearFrom?: number;
  yearTo?: number;
  ownership?: string;
  sort: VehicleListSort;
  sortDir: SortDir;
  page: number;
  pageSize: number;
};

function buildFilterConditions(params: SearchVehiclesParams): SQL[] {
  const conditions: SQL[] = [eq(vehicles.storeId, params.storeId)];

  if (params.status) {
    conditions.push(eq(vehicles.status, params.status));
  }

  if (params.makeSlug) {
    conditions.push(eq(vehicles.makeSlug, params.makeSlug));
  }

  if (params.modelSlug) {
    conditions.push(eq(vehicles.modelSlug, params.modelSlug));
  }

  if (params.ownership) {
    conditions.push(eq(vehicles.ownership, params.ownership));
  }

  if (params.yearFrom != null) {
    conditions.push(gte(vehicles.yearModel, params.yearFrom));
  }

  if (params.yearTo != null) {
    conditions.push(lte(vehicles.yearModel, params.yearTo));
  }

  if (params.q && params.q.trim().length > 0) {
    const term = `%${params.q.trim().toLowerCase()}%`;
    const plateTerm = `%${params.q.trim().toUpperCase().replace(/\s+/g, '')}%`;

    conditions.push(
      or(
        like(sql`lower(${vehicles.make})`, term),
        like(sql`lower(${vehicles.model})`, term),
        like(sql`lower(${vehicles.version})`, term),
        like(vehicles.plate, plateTerm),
        like(sql`lower(coalesce(${vehicles.internalCode}, ''))`, term)
      )!
    );
  }

  return conditions;
}

function orderClause(sort: VehicleListSort, sortDir: SortDir) {
  const direction = sortDir === 'asc' ? asc : desc;

  switch (sort) {
    case 'asking_price':
      return direction(vehicles.askingPriceCents);
    case 'days_in_stock':
      /** Mais dias em estoque = entered_at mais antigo. */
      return sortDir === 'asc' ? desc(vehicles.enteredAt) : asc(vehicles.enteredAt);
    case 'entered_at':
    default:
      return direction(vehicles.enteredAt);
  }
}

export async function searchVehicles(
  params: SearchVehiclesParams
): Promise<{ items: VehicleRow[]; total: number }> {
  const db = getDb();
  const conditions = buildFilterConditions(params);
  const where = and(...conditions);
  const offset = (params.page - 1) * params.pageSize;

  const [countRow] = await db.select({ value: count() }).from(vehicles).where(where);
  const total = countRow?.value ?? 0;

  const items = await db
    .select()
    .from(vehicles)
    .where(where)
    .orderBy(orderClause(params.sort, params.sortDir))
    .limit(params.pageSize)
    .offset(offset);

  return { items, total };
}

export async function countVehiclesByStatus(storeId: string): Promise<VehicleStatusCounts> {
  const db = getDb();
  const rows = await db
    .select({ status: vehicles.status, value: count() })
    .from(vehicles)
    .where(eq(vehicles.storeId, storeId))
    .groupBy(vehicles.status);

  const counts: VehicleStatusCounts = {
    [VEHICLE_STATUS.PREPARING]: 0,
    [VEHICLE_STATUS.AVAILABLE]: 0,
    [VEHICLE_STATUS.RESERVED]: 0,
    [VEHICLE_STATUS.SOLD]: 0,
    [VEHICLE_STATUS.WITHDRAWN]: 0,
    total: 0,
  };

  for (const row of rows) {
    const key = row.status as VehicleStatus;

    if (key in counts) {
      counts[key] = row.value;
    }

    counts.total += row.value;
  }

  return counts;
}

export async function updateVehicleRow(
  vehicleId: string,
  patch: Partial<Omit<NewVehicleRow, 'id' | 'storeId' | 'createdAt'>>
): Promise<VehicleRow> {
  const db = getDb();
  const stamp = nowIso();

  await db
    .update(vehicles)
    .set({ ...patch, updatedAt: stamp })
    .where(eq(vehicles.id, vehicleId));

  const row = await findVehicleById(vehicleId);

  if (!row) {
    throw new Error('Veículo não encontrado após update');
  }

  return row;
}
