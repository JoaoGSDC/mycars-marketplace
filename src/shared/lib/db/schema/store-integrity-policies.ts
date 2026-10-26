import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { timestamps } from './_helpers';
import { stores } from './stores';

/** Política de confirmação de estoque por loja. */
export const storeIntegrityPolicies = sqliteTable('store_integrity_policies', {
  storeId: text('store_id')
    .primaryKey()
    .references(() => stores.id, { onDelete: 'cascade' }),
  /** Intervalo entre confirmações (dias). */
  confirmationIntervalDays: integer('confirmation_interval_days').notNull().default(14),
  /** Tolerância após o vencimento antes de pausar anúncio. */
  graceDays: integer('grace_days').notNull().default(3),
  /** Pausar anúncios publicados após expiração + tolerância. */
  autoPausePublished: text('auto_pause_published').notNull().default('true'),
  enabled: text('enabled').notNull().default('true'),
  ...timestamps,
});

export type StoreIntegrityPolicyRow = typeof storeIntegrityPolicies.$inferSelect;
export type NewStoreIntegrityPolicyRow = typeof storeIntegrityPolicies.$inferInsert;
