import { index, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

import { stores } from './stores';

/** Redireciona `/lojas/{old_slug}` após alteração de slug. */
export const storeSlugRedirects = sqliteTable(
  'store_slug_redirects',
  {
    id: text('id').primaryKey(),
    storeId: text('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'cascade' }),
    oldSlug: text('old_slug').notNull(),
    createdAt: text('created_at')
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (table) => [
    uniqueIndex('store_slug_redirects_old_slug_uidx').on(table.oldSlug),
    index('store_slug_redirects_store_idx').on(table.storeId),
  ]
);

export type StoreSlugRedirectRow = typeof storeSlugRedirects.$inferSelect;
export type NewStoreSlugRedirectRow = typeof storeSlugRedirects.$inferInsert;
