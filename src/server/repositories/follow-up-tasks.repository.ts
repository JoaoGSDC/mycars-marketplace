import { and, asc, eq, lt } from 'drizzle-orm';

import {
  createId,
  followUpTasks,
  getDb,
  nowIso,
  type FollowUpTaskRow,
  type NewFollowUpTaskRow,
} from '@lib/db';
import { FOLLOW_UP_TASK_STATUS } from '@app-types/crm';

export async function insertFollowUpTask(
  input: Omit<NewFollowUpTaskRow, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
): Promise<FollowUpTaskRow> {
  const db = getDb();
  const id = input.id ?? createId();
  const stamp = nowIso();

  await db.insert(followUpTasks).values({
    ...input,
    id,
    createdAt: stamp,
    updatedAt: stamp,
  });

  const [row] = await db.select().from(followUpTasks).where(eq(followUpTasks.id, id)).limit(1);

  if (!row) {
    throw new Error('Falha ao agendar retorno');
  }

  return row;
}

export async function findFollowUpTaskInStore(
  storeId: string,
  taskId: string
): Promise<FollowUpTaskRow | undefined> {
  const db = getDb();
  const rows = await db
    .select()
    .from(followUpTasks)
    .where(and(eq(followUpTasks.storeId, storeId), eq(followUpTasks.id, taskId)))
    .limit(1);

  return rows[0];
}

export async function listTasksForOpportunity(
  storeId: string,
  opportunityId: string
): Promise<FollowUpTaskRow[]> {
  const db = getDb();

  return db
    .select()
    .from(followUpTasks)
    .where(
      and(eq(followUpTasks.storeId, storeId), eq(followUpTasks.opportunityId, opportunityId))
    )
    .orderBy(asc(followUpTasks.dueAt));
}

export async function listPendingTasksForStore(
  storeId: string
): Promise<FollowUpTaskRow[]> {
  const db = getDb();

  return db
    .select()
    .from(followUpTasks)
    .where(
      and(
        eq(followUpTasks.storeId, storeId),
        eq(followUpTasks.status, FOLLOW_UP_TASK_STATUS.PENDING)
      )
    )
    .orderBy(asc(followUpTasks.dueAt));
}

export async function listOverduePendingTasks(
  storeId: string,
  nowIsoValue: string
): Promise<FollowUpTaskRow[]> {
  const db = getDb();

  return db
    .select()
    .from(followUpTasks)
    .where(
      and(
        eq(followUpTasks.storeId, storeId),
        eq(followUpTasks.status, FOLLOW_UP_TASK_STATUS.PENDING),
        lt(followUpTasks.dueAt, nowIsoValue)
      )
    )
    .orderBy(asc(followUpTasks.dueAt));
}

export async function updateFollowUpTask(
  id: string,
  patch: Partial<Pick<FollowUpTaskRow, 'status' | 'completedAt' | 'title' | 'dueAt'>>
): Promise<FollowUpTaskRow> {
  const db = getDb();

  await db
    .update(followUpTasks)
    .set({ ...patch, updatedAt: nowIso() })
    .where(eq(followUpTasks.id, id));

  const [row] = await db.select().from(followUpTasks).where(eq(followUpTasks.id, id)).limit(1);

  if (!row) {
    throw new Error('Tarefa não encontrada após atualização');
  }

  return row;
}
