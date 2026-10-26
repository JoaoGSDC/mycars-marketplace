import { and, asc, count, desc, eq, lt, sql, type SQL } from 'drizzle-orm';

import { RESERVATION_STATUS, type ReservationStatus } from '@app-types/status';
import {
  createId,
  customers,
  getDb,
  nowIso,
  reservationEvents,
  reservations,
  users,
  vehicles,
  type AppDatabase,
  type NewReservationEventRow,
  type NewReservationRow,
  type ReservationEventRow,
  type ReservationRow,
} from '@lib/db';

/** Aceita `getDb()` ou o `tx` de `db.transaction` (sem exigir `.batch`). */
export type ReservationDbExecutor = Pick<AppDatabase, 'insert' | 'update' | 'select'>;

export type ReservationListItem = ReservationRow & {
  customerName: string;
  customerPhone: string;
  assigneeName: string | null;
  vehicleLabel: string;
};

export async function insertReservation(
  input: Omit<NewReservationRow, 'id' | 'createdAt' | 'updatedAt'> & { id?: string },
  executor: ReservationDbExecutor = getDb()
): Promise<ReservationRow> {
  const id = input.id ?? createId();
  const stamp = nowIso();

  await executor.insert(reservations).values({
    ...input,
    id,
    createdAt: stamp,
    updatedAt: stamp,
  });

  const row = await findReservationById(id, executor);

  if (!row) {
    throw new Error('Falha ao criar reserva');
  }

  return row;
}

export async function findReservationById(
  id: string,
  executor: ReservationDbExecutor = getDb()
): Promise<ReservationRow | undefined> {
  const rows = await executor.select().from(reservations).where(eq(reservations.id, id)).limit(1);

  return rows[0];
}

export async function findReservationInStore(
  storeId: string,
  reservationId: string,
  executor: ReservationDbExecutor = getDb()
): Promise<ReservationRow | undefined> {
  const rows = await executor
    .select()
    .from(reservations)
    .where(and(eq(reservations.storeId, storeId), eq(reservations.id, reservationId)))
    .limit(1);

  return rows[0];
}

export async function findActiveReservationForVehicle(
  vehicleId: string,
  executor: ReservationDbExecutor = getDb()
): Promise<ReservationRow | undefined> {
  const rows = await executor
    .select()
    .from(reservations)
    .where(
      and(eq(reservations.vehicleId, vehicleId), eq(reservations.status, RESERVATION_STATUS.ACTIVE))
    )
    .limit(1);

  return rows[0];
}

export async function listDueActiveReservations(params: {
  nowIso: string;
  storeId?: string;
  vehicleId?: string;
  limit?: number;
}): Promise<ReservationRow[]> {
  const db = getDb();
  const conditions: SQL[] = [
    eq(reservations.status, RESERVATION_STATUS.ACTIVE),
    lt(reservations.expiresAt, params.nowIso),
  ];

  if (params.storeId) {
    conditions.push(eq(reservations.storeId, params.storeId));
  }

  if (params.vehicleId) {
    conditions.push(eq(reservations.vehicleId, params.vehicleId));
  }

  return db
    .select()
    .from(reservations)
    .where(and(...conditions))
    .orderBy(asc(reservations.expiresAt))
    .limit(params.limit ?? 100);
}

export async function updateReservation(
  id: string,
  patch: Partial<
    Pick<ReservationRow, 'status' | 'expiresAt' | 'notes' | 'assigneeUserId' | 'opportunityId'>
  >,
  executor: ReservationDbExecutor = getDb()
): Promise<ReservationRow> {
  await executor
    .update(reservations)
    .set({ ...patch, updatedAt: nowIso() })
    .where(eq(reservations.id, id));

  const row = await findReservationById(id, executor);

  if (!row) {
    throw new Error('Reserva não encontrada após atualização');
  }

  return row;
}

export async function insertReservationEvent(
  input: Omit<NewReservationEventRow, 'id' | 'createdAt' | 'updatedAt'> & { id?: string },
  executor: ReservationDbExecutor = getDb()
): Promise<ReservationEventRow> {
  const id = input.id ?? createId();
  const stamp = nowIso();

  await executor.insert(reservationEvents).values({
    ...input,
    id,
    createdAt: stamp,
    updatedAt: stamp,
  });

  const [row] = await executor
    .select()
    .from(reservationEvents)
    .where(eq(reservationEvents.id, id))
    .limit(1);

  if (!row) {
    throw new Error('Falha ao registrar evento de reserva');
  }

  return row;
}

export async function listEventsForReservation(
  storeId: string,
  reservationId: string
): Promise<Array<ReservationEventRow & { actorName: string | null }>> {
  const db = getDb();
  const rows = await db
    .select({
      event: reservationEvents,
      actorName: users.name,
    })
    .from(reservationEvents)
    .leftJoin(users, eq(reservationEvents.actorUserId, users.id))
    .where(
      and(
        eq(reservationEvents.storeId, storeId),
        eq(reservationEvents.reservationId, reservationId)
      )
    )
    .orderBy(desc(reservationEvents.createdAt));

  return rows.map((row) => ({ ...row.event, actorName: row.actorName }));
}

export type ReservationSearchParams = {
  storeId: string;
  status?: ReservationStatus;
  q?: string;
  page: number;
  pageSize: number;
};

function mapListRow(row: {
  reservation: ReservationRow;
  customerName: string;
  customerPhone: string;
  assigneeName: string | null;
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: number;
}): ReservationListItem {
  return {
    ...row.reservation,
    customerName: row.customerName,
    customerPhone: row.customerPhone,
    assigneeName: row.assigneeName,
    vehicleLabel: `${row.vehicleMake} ${row.vehicleModel} ${row.vehicleYear}`,
  };
}

export async function searchReservationsInStore(
  params: ReservationSearchParams
): Promise<{ items: ReservationListItem[]; total: number }> {
  const db = getDb();
  const conditions: SQL[] = [eq(reservations.storeId, params.storeId)];

  if (params.status) {
    conditions.push(eq(reservations.status, params.status));
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
    .from(reservations)
    .innerJoin(customers, eq(reservations.customerId, customers.id))
    .innerJoin(vehicles, eq(reservations.vehicleId, vehicles.id))
    .where(where);

  const total = totalRow?.value ?? 0;
  const offset = (params.page - 1) * params.pageSize;

  const rows = await db
    .select({
      reservation: reservations,
      customerName: customers.name,
      customerPhone: customers.phone,
      assigneeName: users.name,
      vehicleMake: vehicles.make,
      vehicleModel: vehicles.model,
      vehicleYear: vehicles.yearModel,
    })
    .from(reservations)
    .innerJoin(customers, eq(reservations.customerId, customers.id))
    .innerJoin(vehicles, eq(reservations.vehicleId, vehicles.id))
    .leftJoin(users, eq(reservations.assigneeUserId, users.id))
    .where(where)
    .orderBy(desc(reservations.createdAt))
    .limit(params.pageSize)
    .offset(offset);

  return { items: rows.map(mapListRow), total };
}

export async function findReservationListItem(
  storeId: string,
  reservationId: string
): Promise<ReservationListItem | undefined> {
  const db = getDb();
  const rows = await db
    .select({
      reservation: reservations,
      customerName: customers.name,
      customerPhone: customers.phone,
      assigneeName: users.name,
      vehicleMake: vehicles.make,
      vehicleModel: vehicles.model,
      vehicleYear: vehicles.yearModel,
    })
    .from(reservations)
    .innerJoin(customers, eq(reservations.customerId, customers.id))
    .innerJoin(vehicles, eq(reservations.vehicleId, vehicles.id))
    .leftJoin(users, eq(reservations.assigneeUserId, users.id))
    .where(and(eq(reservations.storeId, storeId), eq(reservations.id, reservationId)))
    .limit(1);

  const row = rows[0];

  return row ? mapListRow(row) : undefined;
}

export async function countReservationsByStatus(
  storeId: string
): Promise<Record<string, number>> {
  const db = getDb();
  const rows = await db
    .select({ status: reservations.status, value: count() })
    .from(reservations)
    .where(eq(reservations.storeId, storeId))
    .groupBy(reservations.status);

  const counts: Record<string, number> = {};

  for (const row of rows) {
    counts[row.status] = row.value;
  }

  return counts;
}
