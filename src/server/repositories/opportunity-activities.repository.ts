import { and, asc, desc, eq } from 'drizzle-orm';

import {
  createId,
  getDb,
  nowIso,
  opportunityActivities,
  users,
  type NewOpportunityActivityRow,
  type OpportunityActivityRow,
} from '@lib/db';

export type ActivityWithActor = OpportunityActivityRow & {
  actorName: string | null;
};

export async function insertActivity(
  input: Omit<NewOpportunityActivityRow, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
): Promise<OpportunityActivityRow> {
  const db = getDb();
  const id = input.id ?? createId();
  const stamp = nowIso();

  await db.insert(opportunityActivities).values({
    ...input,
    id,
    createdAt: stamp,
    updatedAt: stamp,
  });

  const [row] = await db
    .select()
    .from(opportunityActivities)
    .where(eq(opportunityActivities.id, id))
    .limit(1);

  if (!row) {
    throw new Error('Falha ao registrar atividade');
  }

  return row;
}

export async function listActivitiesForOpportunity(
  storeId: string,
  opportunityId: string
): Promise<ActivityWithActor[]> {
  const db = getDb();
  const rows = await db
    .select({
      activity: opportunityActivities,
      actorName: users.name,
    })
    .from(opportunityActivities)
    .leftJoin(users, eq(opportunityActivities.actorUserId, users.id))
    .where(
      and(
        eq(opportunityActivities.storeId, storeId),
        eq(opportunityActivities.opportunityId, opportunityId)
      )
    )
    .orderBy(desc(opportunityActivities.createdAt));

  return rows.map((row) => ({
    ...row.activity,
    actorName: row.actorName,
  }));
}

export async function listActivitiesChronological(
  storeId: string,
  opportunityId: string
): Promise<ActivityWithActor[]> {
  const db = getDb();
  const rows = await db
    .select({
      activity: opportunityActivities,
      actorName: users.name,
    })
    .from(opportunityActivities)
    .leftJoin(users, eq(opportunityActivities.actorUserId, users.id))
    .where(
      and(
        eq(opportunityActivities.storeId, storeId),
        eq(opportunityActivities.opportunityId, opportunityId)
      )
    )
    .orderBy(asc(opportunityActivities.createdAt));

  return rows.map((row) => ({
    ...row.activity,
    actorName: row.actorName,
  }));
}
