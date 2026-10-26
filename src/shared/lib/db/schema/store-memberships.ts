import { index, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

import { timestamps } from './_helpers';
import { stores } from './stores';
import { users } from './users';

/**
 * Vínculo usuário ↔ loja (multi-tenant).
 * permissions: JSON array de strings (ex.: ["vehicles:write","listings:publish"]).
 */
export const storeMemberships = sqliteTable(
  'store_memberships',
  {
    id: text('id').primaryKey(),
    storeId: text('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** owner | manager | seller | operator */
    role: text('role').notNull(),
    permissionsJson: text('permissions_json').notNull().default('[]'),
    /** active | invited | revoked */
    status: text('status').notNull().default('active'),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('store_memberships_store_user_uidx').on(table.storeId, table.userId),
    index('store_memberships_user_idx').on(table.userId),
    index('store_memberships_store_idx').on(table.storeId),
  ]
);

export type StoreMembershipRow = typeof storeMemberships.$inferSelect;
export type NewStoreMembershipRow = typeof storeMemberships.$inferInsert;
