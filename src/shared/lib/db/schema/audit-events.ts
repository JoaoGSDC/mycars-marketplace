import { index, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { sql } from 'drizzle-orm';

import { stores } from './stores';
import { users } from './users';

/**
 * Auditoria de operações comerciais relevantes.
 * Não apagar automaticamente — retenção por política futura.
 */
export const auditEvents = sqliteTable(
  'audit_events',
  {
    id: text('id').primaryKey(),
    storeId: text('store_id').references(() => stores.id, { onDelete: 'set null' }),
    actorUserId: text('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
    action: text('action').notNull(),
    entityType: text('entity_type').notNull(),
    entityId: text('entity_id'),
    payloadJson: text('payload_json').notNull().default('{}'),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [
    index('audit_events_store_idx').on(table.storeId),
    index('audit_events_entity_idx').on(table.entityType, table.entityId),
    index('audit_events_created_idx').on(table.createdAt),
  ]
);

export type AuditEventRow = typeof auditEvents.$inferSelect;
export type NewAuditEventRow = typeof auditEvents.$inferInsert;
