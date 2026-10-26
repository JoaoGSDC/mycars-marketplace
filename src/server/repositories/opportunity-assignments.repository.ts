import { and, desc, eq, isNull } from 'drizzle-orm';

import {
  createId,
  getDb,
  nowIso,
  opportunityAssignments,
  type NewOpportunityAssignmentRow,
  type OpportunityAssignmentRow,
} from '@lib/db';

export async function insertAssignment(
  input: Omit<NewOpportunityAssignmentRow, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
): Promise<OpportunityAssignmentRow> {
  const db = getDb();
  const id = input.id ?? createId();
  const stamp = nowIso();

  await db.insert(opportunityAssignments).values({
    ...input,
    id,
    createdAt: stamp,
    updatedAt: stamp,
  });

  const [row] = await db
    .select()
    .from(opportunityAssignments)
    .where(eq(opportunityAssignments.id, id))
    .limit(1);

  if (!row) {
    throw new Error('Falha ao registrar atribuição');
  }

  return row;
}

export async function endOpenAssignments(
  opportunityId: string,
  endedAt: string
): Promise<void> {
  const db = getDb();

  await db
    .update(opportunityAssignments)
    .set({ endedAt, updatedAt: nowIso() })
    .where(
      and(
        eq(opportunityAssignments.opportunityId, opportunityId),
        isNull(opportunityAssignments.endedAt)
      )
    );
}

export async function listAssignmentsForOpportunity(
  storeId: string,
  opportunityId: string
): Promise<OpportunityAssignmentRow[]> {
  const db = getDb();

  return db
    .select()
    .from(opportunityAssignments)
    .where(
      and(
        eq(opportunityAssignments.storeId, storeId),
        eq(opportunityAssignments.opportunityId, opportunityId)
      )
    )
    .orderBy(desc(opportunityAssignments.assignedAt));
}
