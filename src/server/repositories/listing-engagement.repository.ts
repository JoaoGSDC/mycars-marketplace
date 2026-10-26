import { and, count, eq, gte } from 'drizzle-orm';

import {
  createId,
  getDb,
  listingEngagementEvents,
  nowIso,
  type ListingEngagementEventRow,
  type NewListingEngagementEventRow,
} from '@lib/db';

export async function insertEngagementEvent(
  input: Omit<NewListingEngagementEventRow, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
): Promise<ListingEngagementEventRow> {
  const db = getDb();
  const id = input.id ?? createId();
  const stamp = nowIso();

  await db.insert(listingEngagementEvents).values({
    ...input,
    id,
    createdAt: stamp,
    updatedAt: stamp,
  });

  const [row] = await db
    .select()
    .from(listingEngagementEvents)
    .where(eq(listingEngagementEvents.id, id))
    .limit(1);

  if (!row) {
    throw new Error('Falha ao registrar engajamento');
  }

  return row;
}

export async function countEngagementByListingSince(
  listingId: string,
  ipHash: string,
  sinceIso: string
): Promise<number> {
  const db = getDb();
  const [row] = await db
    .select({ value: count() })
    .from(listingEngagementEvents)
    .where(
      and(
        eq(listingEngagementEvents.listingId, listingId),
        eq(listingEngagementEvents.ipHash, ipHash),
        gte(listingEngagementEvents.createdAt, sinceIso)
      )
    );

  return row?.value ?? 0;
}
