import { and, count, desc, eq, gte, lte, sql, type SQL } from 'drizzle-orm';

import { SALE_STATUS, type SaleStatus } from '@app-types/status';
import {
  createId,
  customers,
  getDb,
  nowIso,
  saleEvents,
  sales,
  users,
  vehicles,
  type AppDatabase,
  type NewSaleEventRow,
  type NewSaleRow,
  type SaleEventRow,
  type SaleRow,
} from '@lib/db';

export type SaleDbExecutor = Pick<AppDatabase, 'insert' | 'update' | 'select'>;

export type SaleListItem = SaleRow & {
  customerName: string;
  customerPhone: string;
  sellerName: string;
  vehicleLabel: string;
};

export async function insertSale(
  input: Omit<NewSaleRow, 'id' | 'createdAt' | 'updatedAt'> & { id?: string },
  executor: SaleDbExecutor = getDb()
): Promise<SaleRow> {
  const id = input.id ?? createId();
  const stamp = nowIso();

  await executor.insert(sales).values({
    ...input,
    id,
    createdAt: stamp,
    updatedAt: stamp,
  });

  const row = await findSaleById(id, executor);

  if (!row) {
    throw new Error('Falha ao registrar venda');
  }

  return row;
}

export async function findSaleById(
  id: string,
  executor: SaleDbExecutor = getDb()
): Promise<SaleRow | undefined> {
  const rows = await executor.select().from(sales).where(eq(sales.id, id)).limit(1);

  return rows[0];
}

export async function findSaleInStore(
  storeId: string,
  saleId: string,
  executor: SaleDbExecutor = getDb()
): Promise<SaleRow | undefined> {
  const rows = await executor
    .select()
    .from(sales)
    .where(and(eq(sales.storeId, storeId), eq(sales.id, saleId)))
    .limit(1);

  return rows[0];
}

export async function findCompletedSaleForVehicle(
  vehicleId: string,
  executor: SaleDbExecutor = getDb()
): Promise<SaleRow | undefined> {
  const rows = await executor
    .select()
    .from(sales)
    .where(and(eq(sales.vehicleId, vehicleId), eq(sales.status, SALE_STATUS.COMPLETED)))
    .limit(1);

  return rows[0];
}

export async function updateSale(
  id: string,
  patch: Partial<
    Pick<
      SaleRow,
      'status' | 'cancelReason' | 'cancelledAt' | 'cancelledByUserId' | 'notes'
    >
  >,
  executor: SaleDbExecutor = getDb()
): Promise<SaleRow> {
  await executor
    .update(sales)
    .set({ ...patch, updatedAt: nowIso() })
    .where(eq(sales.id, id));

  const row = await findSaleById(id, executor);

  if (!row) {
    throw new Error('Venda não encontrada após atualização');
  }

  return row;
}

export async function insertSaleEvent(
  input: Omit<NewSaleEventRow, 'id' | 'createdAt' | 'updatedAt'> & { id?: string },
  executor: SaleDbExecutor = getDb()
): Promise<SaleEventRow> {
  const id = input.id ?? createId();
  const stamp = nowIso();

  await executor.insert(saleEvents).values({
    ...input,
    id,
    createdAt: stamp,
    updatedAt: stamp,
  });

  const [row] = await executor.select().from(saleEvents).where(eq(saleEvents.id, id)).limit(1);

  if (!row) {
    throw new Error('Falha ao registrar evento de venda');
  }

  return row;
}

export async function listEventsForSale(
  storeId: string,
  saleId: string
): Promise<Array<SaleEventRow & { actorName: string | null }>> {
  const db = getDb();
  const rows = await db
    .select({
      event: saleEvents,
      actorName: users.name,
    })
    .from(saleEvents)
    .leftJoin(users, eq(saleEvents.actorUserId, users.id))
    .where(and(eq(saleEvents.storeId, storeId), eq(saleEvents.saleId, saleId)))
    .orderBy(desc(saleEvents.createdAt));

  return rows.map((row) => ({ ...row.event, actorName: row.actorName }));
}

export type SaleSearchParams = {
  storeId: string;
  status?: SaleStatus;
  sellerUserId?: string;
  vehicleId?: string;
  q?: string;
  from?: string;
  to?: string;
  page: number;
  pageSize: number;
};

function mapListRow(row: {
  sale: SaleRow;
  customerName: string;
  customerPhone: string;
  sellerName: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: number;
}): SaleListItem {
  return {
    ...row.sale,
    customerName: row.customerName,
    customerPhone: row.customerPhone,
    sellerName: row.sellerName,
    vehicleLabel: `${row.vehicleMake} ${row.vehicleModel} ${row.vehicleYear}`,
  };
}

export async function searchSalesInStore(
  params: SaleSearchParams
): Promise<{ items: SaleListItem[]; total: number }> {
  const db = getDb();
  const conditions: SQL[] = [eq(sales.storeId, params.storeId)];

  if (params.status) {
    conditions.push(eq(sales.status, params.status));
  }

  if (params.sellerUserId) {
    conditions.push(eq(sales.sellerUserId, params.sellerUserId));
  }

  if (params.vehicleId) {
    conditions.push(eq(sales.vehicleId, params.vehicleId));
  }

  if (params.from) {
    conditions.push(gte(sales.soldAt, params.from));
  }

  if (params.to) {
    conditions.push(lte(sales.soldAt, params.to));
  }

  const q = params.q?.trim();

  if (q) {
    const digits = q.replace(/\D/g, '');
    const pattern = `%${q}%`;
    conditions.push(
      sql`(
        ${customers.name} LIKE ${pattern}
        OR ${customers.phone} LIKE ${pattern}
        OR ${customers.phoneNormalized} LIKE ${digits.length > 0 ? `%${digits}%` : pattern}
        OR ${vehicles.make} LIKE ${pattern}
        OR ${vehicles.model} LIKE ${pattern}
        OR ${vehicles.plate} LIKE ${pattern}
      )`
    );
  }

  const where = and(...conditions);

  const [totalRow] = await db
    .select({ value: count() })
    .from(sales)
    .innerJoin(customers, eq(sales.customerId, customers.id))
    .innerJoin(vehicles, eq(sales.vehicleId, vehicles.id))
    .where(where);

  const total = totalRow?.value ?? 0;
  const offset = (params.page - 1) * params.pageSize;

  const rows = await db
    .select({
      sale: sales,
      customerName: customers.name,
      customerPhone: customers.phone,
      sellerName: users.name,
      vehicleMake: vehicles.make,
      vehicleModel: vehicles.model,
      vehicleYear: vehicles.yearModel,
    })
    .from(sales)
    .innerJoin(customers, eq(sales.customerId, customers.id))
    .innerJoin(vehicles, eq(sales.vehicleId, vehicles.id))
    .innerJoin(users, eq(sales.sellerUserId, users.id))
    .where(where)
    .orderBy(desc(sales.soldAt))
    .limit(params.pageSize)
    .offset(offset);

  return { items: rows.map(mapListRow), total };
}

export async function findSaleListItem(
  storeId: string,
  saleId: string
): Promise<SaleListItem | undefined> {
  const db = getDb();
  const rows = await db
    .select({
      sale: sales,
      customerName: customers.name,
      customerPhone: customers.phone,
      sellerName: users.name,
      vehicleMake: vehicles.make,
      vehicleModel: vehicles.model,
      vehicleYear: vehicles.yearModel,
    })
    .from(sales)
    .innerJoin(customers, eq(sales.customerId, customers.id))
    .innerJoin(vehicles, eq(sales.vehicleId, vehicles.id))
    .innerJoin(users, eq(sales.sellerUserId, users.id))
    .where(and(eq(sales.storeId, storeId), eq(sales.id, saleId)))
    .limit(1);

  const row = rows[0];

  return row ? mapListRow(row) : undefined;
}

export async function countSalesByStatus(storeId: string): Promise<Record<string, number>> {
  const db = getDb();
  const rows = await db
    .select({ status: sales.status, value: count() })
    .from(sales)
    .where(eq(sales.storeId, storeId))
    .groupBy(sales.status);

  const counts: Record<string, number> = {};

  for (const row of rows) {
    counts[row.status] = row.value;
  }

  return counts;
}

export async function sumCompletedNegotiatedCents(
  storeId: string,
  from?: string,
  to?: string
): Promise<number> {
  const db = getDb();
  const conditions: SQL[] = [
    eq(sales.storeId, storeId),
    eq(sales.status, SALE_STATUS.COMPLETED),
  ];

  if (from) {
    conditions.push(gte(sales.soldAt, from));
  }

  if (to) {
    conditions.push(lte(sales.soldAt, to));
  }

  const [row] = await db
    .select({ total: sql<number>`coalesce(sum(${sales.negotiatedPriceCents}), 0)` })
    .from(sales)
    .where(and(...conditions));

  return Number(row?.total ?? 0);
}
