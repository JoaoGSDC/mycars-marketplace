import { index, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { timestamps } from './_helpers';
import { plans } from './plans';
import { stores } from './stores';
import { users } from './users';

/**
 * Assinatura vinculada à loja.
 * Ativação pode ser manual (piloto) com auditoria — sem gateway nesta fase.
 */
export const storeSubscriptions = sqliteTable(
  'store_subscriptions',
  {
    id: text('id').primaryKey(),
    storeId: text('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'restrict' }),
    planId: text('plan_id')
      .notNull()
      .references(() => plans.id, { onDelete: 'restrict' }),
    /** none | trial | active | past_due | canceled — espelha stores.subscription_status no vínculo vigente. */
    status: text('status').notNull().default('trial'),
    startsAt: text('starts_at').notNull(),
    endsAt: text('ends_at'),
    /** Limite de tolerância quando past_due. */
    graceEndsAt: text('grace_ends_at'),
    notes: text('notes'),
    activatedByUserId: text('activated_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    ...timestamps,
  },
  (table) => [
    index('store_subscriptions_store_idx').on(table.storeId),
    index('store_subscriptions_status_idx').on(table.status),
    index('store_subscriptions_plan_idx').on(table.planId),
  ]
);

export type StoreSubscriptionRow = typeof storeSubscriptions.$inferSelect;
export type NewStoreSubscriptionRow = typeof storeSubscriptions.$inferInsert;
