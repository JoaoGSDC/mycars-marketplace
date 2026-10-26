import { and, count, desc, eq, like, or, sql, type SQL } from 'drizzle-orm';

import {
  createId,
  customers,
  getDb,
  nowIso,
  type CustomerRow,
  type NewCustomerRow,
} from '@lib/db';

export async function insertCustomer(
  input: Omit<NewCustomerRow, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
): Promise<CustomerRow> {
  const db = getDb();
  const id = input.id ?? createId();
  const stamp = nowIso();

  await db.insert(customers).values({
    ...input,
    id,
    createdAt: stamp,
    updatedAt: stamp,
  });

  const row = await findCustomerById(id);

  if (!row) {
    throw new Error('Falha ao inserir cliente');
  }

  return row;
}

export async function findCustomerById(id: string): Promise<CustomerRow | undefined> {
  const db = getDb();
  const rows = await db.select().from(customers).where(eq(customers.id, id)).limit(1);

  return rows[0];
}

export async function findCustomerInStore(
  storeId: string,
  customerId: string
): Promise<CustomerRow | undefined> {
  const db = getDb();
  const rows = await db
    .select()
    .from(customers)
    .where(and(eq(customers.storeId, storeId), eq(customers.id, customerId)))
    .limit(1);

  return rows[0];
}

export async function findCustomersByPhoneInStore(
  storeId: string,
  phoneNormalized: string,
  excludeId?: string
): Promise<CustomerRow[]> {
  const db = getDb();
  const conditions: SQL[] = [
    eq(customers.storeId, storeId),
    eq(customers.phoneNormalized, phoneNormalized),
  ];

  if (excludeId) {
    conditions.push(sql`${customers.id} != ${excludeId}`);
  }

  return db.select().from(customers).where(and(...conditions)).orderBy(desc(customers.createdAt));
}

export type CustomerSearchParams = {
  storeId: string;
  q?: string;
  page: number;
  pageSize: number;
};

export async function searchCustomersInStore(
  params: CustomerSearchParams
): Promise<{ items: CustomerRow[]; total: number }> {
  const db = getDb();
  const conditions: SQL[] = [eq(customers.storeId, params.storeId)];
  const q = params.q?.trim();

  if (q) {
    const digits = q.replace(/\D/g, '');
    const pattern = `%${q}%`;
    const searchParts: SQL[] = [
      like(customers.name, pattern),
      like(customers.phone, pattern),
      like(customers.email, pattern),
    ];

    if (digits.length > 0) {
      searchParts.push(like(customers.phoneNormalized, `%${digits}%`));
    }

    conditions.push(or(...searchParts)!);
  }

  const where = and(...conditions);
  const [totalRow] = await db.select({ value: count() }).from(customers).where(where);
  const total = totalRow?.value ?? 0;
  const offset = (params.page - 1) * params.pageSize;

  const items = await db
    .select()
    .from(customers)
    .where(where)
    .orderBy(desc(customers.updatedAt))
    .limit(params.pageSize)
    .offset(offset);

  return { items, total };
}

export async function updateCustomer(
  id: string,
  patch: Partial<
    Pick<CustomerRow, 'name' | 'phone' | 'phoneNormalized' | 'email' | 'notes' | 'dataPurpose'>
  >
): Promise<CustomerRow> {
  const db = getDb();
  const stamp = nowIso();

  await db
    .update(customers)
    .set({ ...patch, updatedAt: stamp })
    .where(eq(customers.id, id));

  const row = await findCustomerById(id);

  if (!row) {
    throw new Error('Cliente não encontrado após atualização');
  }

  return row;
}
