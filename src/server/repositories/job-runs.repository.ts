import { eq } from 'drizzle-orm';

import { JOB_RUN_STATUS } from '@app-types/integrity';
import { createId, getDb, jobRuns, nowIso, type JobRunRow, type NewJobRunRow } from '@lib/db';

export async function findJobRunByIdempotencyKey(
  idempotencyKey: string
): Promise<JobRunRow | undefined> {
  const db = getDb();
  const rows = await db
    .select()
    .from(jobRuns)
    .where(eq(jobRuns.idempotencyKey, idempotencyKey))
    .limit(1);

  return rows[0];
}

export async function startJobRun(input: {
  kind: string;
  idempotencyKey: string;
}): Promise<{ created: boolean; run: JobRunRow }> {
  const existing = await findJobRunByIdempotencyKey(input.idempotencyKey);

  if (existing) {
    return { created: false, run: existing };
  }

  const db = getDb();
  const id = createId();
  const stamp = nowIso();
  const row: NewJobRunRow = {
    id,
    kind: input.kind,
    idempotencyKey: input.idempotencyKey,
    status: JOB_RUN_STATUS.RUNNING,
    startedAt: stamp,
    finishedAt: null,
    processedCount: 0,
    errorMessage: null,
    resultJson: null,
    createdAt: stamp,
    updatedAt: stamp,
  };

  try {
    await db.insert(jobRuns).values(row);
  } catch (error) {
    const raced = await findJobRunByIdempotencyKey(input.idempotencyKey);

    if (raced) {
      return { created: false, run: raced };
    }

    throw error;
  }

  const created = await findJobRunByIdempotencyKey(input.idempotencyKey);

  if (!created) {
    throw new Error('Falha ao iniciar job');
  }

  return { created: true, run: created };
}

export async function completeJobRun(
  id: string,
  result: { processedCount: number; resultJson?: string }
): Promise<JobRunRow> {
  const db = getDb();

  await db
    .update(jobRuns)
    .set({
      status: JOB_RUN_STATUS.COMPLETED,
      finishedAt: nowIso(),
      processedCount: result.processedCount,
      resultJson: result.resultJson ?? null,
      errorMessage: null,
      updatedAt: nowIso(),
    })
    .where(eq(jobRuns.id, id));

  const rows = await db.select().from(jobRuns).where(eq(jobRuns.id, id)).limit(1);

  return rows[0]!;
}

export async function failJobRun(id: string, errorMessage: string): Promise<JobRunRow> {
  const db = getDb();

  await db
    .update(jobRuns)
    .set({
      status: JOB_RUN_STATUS.FAILED,
      finishedAt: nowIso(),
      errorMessage: errorMessage.slice(0, 2000),
      updatedAt: nowIso(),
    })
    .where(eq(jobRuns.id, id));

  const rows = await db.select().from(jobRuns).where(eq(jobRuns.id, id)).limit(1);

  return rows[0]!;
}
