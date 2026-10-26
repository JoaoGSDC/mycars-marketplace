import { desc, eq } from 'drizzle-orm';

import { createId, getDb, nowIso, plans, type NewPlanRow, type PlanRow } from '@lib/db';

export async function insertPlan(
  input: Omit<NewPlanRow, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
): Promise<PlanRow> {
  const db = getDb();
  const id = input.id ?? createId();
  const stamp = nowIso();

  await db.insert(plans).values({ ...input, id, createdAt: stamp, updatedAt: stamp });

  const row = await findPlanById(id);

  if (!row) {
    throw new Error('Falha ao inserir plano');
  }

  return row;
}

export async function findPlanById(id: string): Promise<PlanRow | undefined> {
  const db = getDb();
  const rows = await db.select().from(plans).where(eq(plans.id, id)).limit(1);

  return rows[0];
}

export async function findPlanByCode(code: string): Promise<PlanRow | undefined> {
  const db = getDb();
  const rows = await db.select().from(plans).where(eq(plans.code, code)).limit(1);

  return rows[0];
}

export async function listPlans(activeOnly = false): Promise<PlanRow[]> {
  const db = getDb();

  if (activeOnly) {
    return db
      .select()
      .from(plans)
      .where(eq(plans.isActive, 'true'))
      .orderBy(desc(plans.createdAt));
  }

  return db.select().from(plans).orderBy(desc(plans.createdAt));
}

export async function updatePlan(
  id: string,
  patch: Partial<Omit<PlanRow, 'id' | 'createdAt'>>
): Promise<PlanRow> {
  const db = getDb();

  await db
    .update(plans)
    .set({ ...patch, updatedAt: nowIso() })
    .where(eq(plans.id, id));

  const row = await findPlanById(id);

  if (!row) {
    throw new Error('Falha ao atualizar plano');
  }

  return row;
}
