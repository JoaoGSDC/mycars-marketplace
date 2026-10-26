import { index, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { timestamps } from './_helpers';
import { stores } from './stores';
import { users } from './users';

/** Solicitações de exportação / exclusão de dados da loja. */
export const privacyRequests = sqliteTable(
  'privacy_requests',
  {
    id: text('id').primaryKey(),
    storeId: text('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'restrict' }),
    /** export | deletion */
    type: text('type').notNull(),
    /** pending | processing | completed | rejected | retention_hold */
    status: text('status').notNull().default('pending'),
    requestedByUserId: text('requested_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    reason: text('reason'),
    /** Payload de exportação ou notas de retenção (JSON). Sem segredos. */
    resultJson: text('result_json'),
    retentionHoldUntil: text('retention_hold_until'),
    processedAt: text('processed_at'),
    ...timestamps,
  },
  (table) => [
    index('privacy_requests_store_idx').on(table.storeId),
    index('privacy_requests_status_idx').on(table.status),
  ]
);

export type PrivacyRequestRow = typeof privacyRequests.$inferSelect;
export type NewPrivacyRequestRow = typeof privacyRequests.$inferInsert;
