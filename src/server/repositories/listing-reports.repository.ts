import { and, count, desc, eq, type SQL } from 'drizzle-orm';

import {
  createId,
  getDb,
  listingReports,
  listings,
  nowIso,
  stores,
  type ListingReportRow,
  type NewListingReportRow,
} from '@lib/db';

export async function insertListingReport(
  input: Omit<NewListingReportRow, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
): Promise<ListingReportRow> {
  const db = getDb();
  const id = input.id ?? createId();
  const stamp = nowIso();

  await db.insert(listingReports).values({
    ...input,
    id,
    createdAt: stamp,
    updatedAt: stamp,
  });

  const row = await findListingReportById(id);

  if (!row) {
    throw new Error('Falha ao inserir denúncia');
  }

  return row;
}

export async function findListingReportById(
  id: string
): Promise<ListingReportRow | undefined> {
  const db = getDb();
  const rows = await db.select().from(listingReports).where(eq(listingReports.id, id)).limit(1);

  return rows[0];
}

export type ListingReportListItem = ListingReportRow & {
  listingTitle: string;
  storeName: string;
};

export async function searchListingReports(params: {
  status?: string;
  page: number;
  pageSize: number;
}): Promise<{ items: ListingReportListItem[]; total: number }> {
  const db = getDb();
  const conditions: SQL[] = [];

  if (params.status) {
    conditions.push(eq(listingReports.status, params.status));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const [totalRow] = await db
    .select({ value: count() })
    .from(listingReports)
    .where(where);

  const rows = await db
    .select({
      report: listingReports,
      listingTitle: listings.title,
      storeName: stores.publicName,
    })
    .from(listingReports)
    .innerJoin(listings, eq(listingReports.listingId, listings.id))
    .innerJoin(stores, eq(listingReports.storeId, stores.id))
    .where(where)
    .orderBy(desc(listingReports.createdAt))
    .limit(params.pageSize)
    .offset((params.page - 1) * params.pageSize);

  return {
    total: Number(totalRow?.value ?? 0),
    items: rows.map((row) => ({
      ...row.report,
      listingTitle: row.listingTitle,
      storeName: row.storeName,
    })),
  };
}

export async function updateListingReport(
  id: string,
  patch: Partial<Omit<ListingReportRow, 'id' | 'createdAt'>>
): Promise<ListingReportRow> {
  const db = getDb();

  await db
    .update(listingReports)
    .set({ ...patch, updatedAt: nowIso() })
    .where(eq(listingReports.id, id));

  const row = await findListingReportById(id);

  if (!row) {
    throw new Error('Falha ao atualizar denúncia');
  }

  return row;
}
