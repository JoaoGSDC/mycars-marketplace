import { and, desc, eq, inArray } from 'drizzle-orm';

import { SUBSCRIPTION_STATUS } from '@app-types/subscription';
import {
  createId,
  getDb,
  nowIso,
  plans,
  storeSubscriptions,
  type NewStoreSubscriptionRow,
  type StoreSubscriptionRow,
} from '@lib/db';

export async function insertSubscription(
  input: Omit<NewStoreSubscriptionRow, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
): Promise<StoreSubscriptionRow> {
  const db = getDb();
  const id = input.id ?? createId();
  const stamp = nowIso();

  await db.insert(storeSubscriptions).values({
    ...input,
    id,
    createdAt: stamp,
    updatedAt: stamp,
  });

  const row = await findSubscriptionById(id);

  if (!row) {
    throw new Error('Falha ao inserir assinatura');
  }

  return row;
}

export async function findSubscriptionById(
  id: string
): Promise<StoreSubscriptionRow | undefined> {
  const db = getDb();
  const rows = await db
    .select()
    .from(storeSubscriptions)
    .where(eq(storeSubscriptions.id, id))
    .limit(1);

  return rows[0];
}

export async function listSubscriptionsByStore(
  storeId: string
): Promise<StoreSubscriptionRow[]> {
  const db = getDb();

  return db
    .select()
    .from(storeSubscriptions)
    .where(eq(storeSubscriptions.storeId, storeId))
    .orderBy(desc(storeSubscriptions.createdAt));
}

export async function findCurrentSubscriptionForStore(
  storeId: string
): Promise<(StoreSubscriptionRow & { planCode: string; planName: string }) | undefined> {
  const db = getDb();
  const rows = await db
    .select({
      subscription: storeSubscriptions,
      planCode: plans.code,
      planName: plans.name,
    })
    .from(storeSubscriptions)
    .innerJoin(plans, eq(storeSubscriptions.planId, plans.id))
    .where(
      and(
        eq(storeSubscriptions.storeId, storeId),
        inArray(storeSubscriptions.status, [
          SUBSCRIPTION_STATUS.TRIAL,
          SUBSCRIPTION_STATUS.ACTIVE,
          SUBSCRIPTION_STATUS.PAST_DUE,
        ])
      )
    )
    .orderBy(desc(storeSubscriptions.createdAt))
    .limit(1);

  const row = rows[0];

  if (!row) {
    return undefined;
  }

  return { ...row.subscription, planCode: row.planCode, planName: row.planName };
}

export async function updateSubscription(
  id: string,
  patch: Partial<Omit<StoreSubscriptionRow, 'id' | 'createdAt'>>
): Promise<StoreSubscriptionRow> {
  const db = getDb();

  await db
    .update(storeSubscriptions)
    .set({ ...patch, updatedAt: nowIso() })
    .where(eq(storeSubscriptions.id, id));

  const row = await findSubscriptionById(id);

  if (!row) {
    throw new Error('Falha ao atualizar assinatura');
  }

  return row;
}

export async function countPayingStores(): Promise<number> {
  const db = getDb();
  const rows = await db
    .select({ storeId: storeSubscriptions.storeId })
    .from(storeSubscriptions)
    .where(
      inArray(storeSubscriptions.status, [
        SUBSCRIPTION_STATUS.TRIAL,
        SUBSCRIPTION_STATUS.ACTIVE,
        SUBSCRIPTION_STATUS.PAST_DUE,
      ])
    )
    .groupBy(storeSubscriptions.storeId);

  return rows.length;
}
