import { index, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

import { timestamps } from './_helpers';
import { stores } from './stores';
import { users } from './users';

/**
 * Convites para vincular usuário a uma loja.
 * tokenHash — hash do token enviado por e-mail (nunca armazenar plaintext).
 */
export const storeInvites = sqliteTable(
  'store_invites',
  {
    id: text('id').primaryKey(),
    storeId: text('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    /** owner | manager | seller | operator */
    role: text('role').notNull(),
    tokenHash: text('token_hash').notNull(),
    /** pending | accepted | revoked | expired */
    status: text('status').notNull().default('pending'),
    expiresAt: text('expires_at').notNull(),
    invitedByUserId: text('invited_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    acceptedAt: text('accepted_at'),
    acceptedUserId: text('accepted_user_id').references(() => users.id, { onDelete: 'set null' }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('store_invites_token_uidx').on(table.tokenHash),
    index('store_invites_store_idx').on(table.storeId),
    index('store_invites_email_idx').on(table.email),
    index('store_invites_status_idx').on(table.status),
  ]
);

export type StoreInviteRow = typeof storeInvites.$inferSelect;
export type NewStoreInviteRow = typeof storeInvites.$inferInsert;
