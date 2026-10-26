import { and, count, eq, gte } from 'drizzle-orm';

import {
  createId,
  getDb,
  listingLeads,
  nowIso,
  type ListingLeadRow,
  type NewListingLeadRow,
} from '@lib/db';

export async function insertListingLead(
  input: Omit<NewListingLeadRow, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
): Promise<ListingLeadRow> {
  const db = getDb();
  const id = input.id ?? createId();
  const stamp = nowIso();

  await db.insert(listingLeads).values({
    ...input,
    id,
    createdAt: stamp,
    updatedAt: stamp,
  });

  const [row] = await db.select().from(listingLeads).where(eq(listingLeads.id, id)).limit(1);

  if (!row) {
    throw new Error('Falha ao registrar interesse');
  }

  return row;
}

export async function countLeadsByIpSince(
  ipHash: string,
  sinceIso: string
): Promise<number> {
  const db = getDb();
  const [row] = await db
    .select({ value: count() })
    .from(listingLeads)
    .where(and(eq(listingLeads.ipHash, ipHash), gte(listingLeads.createdAt, sinceIso)));

  return row?.value ?? 0;
}

export async function countLeadsByListingSince(
  listingId: string,
  ipHash: string,
  sinceIso: string
): Promise<number> {
  const db = getDb();
  const [row] = await db
    .select({ value: count() })
    .from(listingLeads)
    .where(
      and(
        eq(listingLeads.listingId, listingId),
        eq(listingLeads.ipHash, ipHash),
        gte(listingLeads.createdAt, sinceIso)
      )
    );

  return row?.value ?? 0;
}
