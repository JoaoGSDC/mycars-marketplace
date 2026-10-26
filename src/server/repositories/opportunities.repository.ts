import { and, count, desc, eq, sql, type SQL } from 'drizzle-orm';

import type { OpportunityOrigin } from '@app-types/crm';
import type { OpportunityStatus } from '@app-types/status';
import {
  createId,
  customers,
  getDb,
  nowIso,
  opportunities,
  users,
  vehicles,
  type NewOpportunityRow,
  type OpportunityRow,
} from '@lib/db';

export async function insertOpportunity(
  input: Omit<NewOpportunityRow, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
): Promise<OpportunityRow> {
  const db = getDb();
  const id = input.id ?? createId();
  const stamp = nowIso();

  await db.insert(opportunities).values({
    ...input,
    id,
    createdAt: stamp,
    updatedAt: stamp,
  });

  const row = await findOpportunityById(id);

  if (!row) {
    throw new Error('Falha ao inserir oportunidade');
  }

  return row;
}

export async function findOpportunityById(id: string): Promise<OpportunityRow | undefined> {
  const db = getDb();
  const rows = await db.select().from(opportunities).where(eq(opportunities.id, id)).limit(1);

  return rows[0];
}

export async function findOpportunityInStore(
  storeId: string,
  opportunityId: string
): Promise<OpportunityRow | undefined> {
  const db = getDb();
  const rows = await db
    .select()
    .from(opportunities)
    .where(and(eq(opportunities.storeId, storeId), eq(opportunities.id, opportunityId)))
    .limit(1);

  return rows[0];
}

export async function findOpportunityListItem(
  storeId: string,
  opportunityId: string
): Promise<OpportunityListItem | undefined> {
  const db = getDb();
  const rows = await db
    .select({
      opportunity: opportunities,
      customerName: customers.name,
      customerPhone: customers.phone,
      assigneeName: users.name,
      vehicleMake: vehicles.make,
      vehicleModel: vehicles.model,
      vehicleYear: vehicles.yearModel,
    })
    .from(opportunities)
    .innerJoin(customers, eq(opportunities.customerId, customers.id))
    .leftJoin(users, eq(opportunities.assigneeUserId, users.id))
    .leftJoin(vehicles, eq(opportunities.vehicleId, vehicles.id))
    .where(and(eq(opportunities.storeId, storeId), eq(opportunities.id, opportunityId)))
    .limit(1);

  const row = rows[0];

  if (!row) {
    return undefined;
  }

  return {
    ...row.opportunity,
    customerName: row.customerName,
    customerPhone: row.customerPhone,
    assigneeName: row.assigneeName,
    vehicleLabel: row.vehicleMake
      ? `${row.vehicleMake} ${row.vehicleModel}${row.vehicleYear ? ` ${row.vehicleYear}` : ''}`
      : null,
  };
}

export type OpportunityListItem = OpportunityRow & {
  customerName: string;
  customerPhone: string;
  assigneeName: string | null;
  vehicleLabel: string | null;
};

export type OpportunitySearchParams = {
  storeId: string;
  stage?: OpportunityStatus;
  origin?: OpportunityOrigin;
  assigneeUserId?: string;
  customerId?: string;
  q?: string;
  page: number;
  pageSize: number;
};

export async function searchOpportunitiesInStore(
  params: OpportunitySearchParams
): Promise<{ items: OpportunityListItem[]; total: number }> {
  const db = getDb();
  const conditions: SQL[] = [eq(opportunities.storeId, params.storeId)];

  if (params.stage) {
    conditions.push(eq(opportunities.stage, params.stage));
  }

  if (params.origin) {
    conditions.push(eq(opportunities.origin, params.origin));
  }

  if (params.assigneeUserId) {
    conditions.push(eq(opportunities.assigneeUserId, params.assigneeUserId));
  }

  if (params.customerId) {
    conditions.push(eq(opportunities.customerId, params.customerId));
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
      )`
    );
  }

  const where = and(...conditions);
  const base = db
    .select({
      opportunity: opportunities,
      customerName: customers.name,
      customerPhone: customers.phone,
      assigneeName: users.name,
      vehicleMake: vehicles.make,
      vehicleModel: vehicles.model,
      vehicleYear: vehicles.yearModel,
    })
    .from(opportunities)
    .innerJoin(customers, eq(opportunities.customerId, customers.id))
    .leftJoin(users, eq(opportunities.assigneeUserId, users.id))
    .leftJoin(vehicles, eq(opportunities.vehicleId, vehicles.id))
    .where(where);

  const [totalRow] = await db
    .select({ value: count() })
    .from(opportunities)
    .innerJoin(customers, eq(opportunities.customerId, customers.id))
    .where(where);

  const total = totalRow?.value ?? 0;
  const offset = (params.page - 1) * params.pageSize;

  const rows = await base
    .orderBy(desc(opportunities.enteredAt))
    .limit(params.pageSize)
    .offset(offset);

  const items: OpportunityListItem[] = rows.map((row) => ({
    ...row.opportunity,
    customerName: row.customerName,
    customerPhone: row.customerPhone,
    assigneeName: row.assigneeName,
    vehicleLabel: row.vehicleMake
      ? `${row.vehicleMake} ${row.vehicleModel}${row.vehicleYear ? ` ${row.vehicleYear}` : ''}`
      : null,
  }));

  return { items, total };
}

export async function listOpportunitiesByCustomer(
  storeId: string,
  customerId: string
): Promise<OpportunityListItem[]> {
  const result = await searchOpportunitiesInStore({
    storeId,
    customerId,
    page: 1,
    pageSize: 100,
  });

  return result.items;
}

export type FunnelCounts = Record<string, number>;

export async function countOpportunitiesByStage(storeId: string): Promise<FunnelCounts> {
  const db = getDb();
  const rows = await db
    .select({ stage: opportunities.stage, value: count() })
    .from(opportunities)
    .where(eq(opportunities.storeId, storeId))
    .groupBy(opportunities.stage);

  const counts: FunnelCounts = {};

  for (const row of rows) {
    counts[row.stage] = row.value;
  }

  return counts;
}

export async function updateOpportunity(
  id: string,
  patch: Partial<
    Pick<
      OpportunityRow,
      | 'stage'
      | 'assigneeUserId'
      | 'vehicleId'
      | 'listingId'
      | 'nextActionAt'
      | 'nextActionLabel'
      | 'notes'
      | 'resultNotes'
      | 'closedAt'
    >
  >
): Promise<OpportunityRow> {
  const db = getDb();
  const stamp = nowIso();

  await db
    .update(opportunities)
    .set({ ...patch, updatedAt: stamp })
    .where(eq(opportunities.id, id));

  const row = await findOpportunityById(id);

  if (!row) {
    throw new Error('Oportunidade não encontrada após atualização');
  }

  return row;
}

export async function listKanbanOpportunities(
  storeId: string,
  filters: {
    origin?: OpportunityOrigin;
    assigneeUserId?: string;
  }
): Promise<OpportunityListItem[]> {
  const result = await searchOpportunitiesInStore({
    storeId,
    origin: filters.origin,
    assigneeUserId: filters.assigneeUserId,
    page: 1,
    pageSize: 500,
  });

  return result.items;
}
