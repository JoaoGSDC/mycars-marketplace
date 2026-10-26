import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { timestamps } from './_helpers';
import { stores } from './stores';

/**
 * Metadados de objetos no storage — sem binário.
 * status=pending até anexar à entidade; órfãos são limpos periodicamente.
 */
export const mediaAssets = sqliteTable(
  'media_assets',
  {
    id: text('id').primaryKey(),
    storeId: text('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'cascade' }),
    /** vehicle_photo | store_logo | store_cover */
    purpose: text('purpose').notNull(),
    /** pending | attached | orphaned | deleted */
    status: text('status').notNull().default('pending'),
    entityType: text('entity_type'),
    entityId: text('entity_id'),
    storageKey: text('storage_key').notNull(),
    url: text('url').notNull(),
    cardUrl: text('card_url'),
    detailUrl: text('detail_url'),
    mimeType: text('mime_type').notNull(),
    byteSize: integer('byte_size').notNull().default(0),
    width: integer('width'),
    height: integer('height'),
    /** JSON: chaves das variantes para delete. */
    variantKeysJson: text('variant_keys_json').notNull().default('[]'),
    uploadedByUserId: text('uploaded_by_user_id'),
    ...timestamps,
  },
  (table) => [
    index('media_assets_store_idx').on(table.storeId),
    index('media_assets_status_idx').on(table.status),
    index('media_assets_entity_idx').on(table.entityType, table.entityId),
    index('media_assets_key_idx').on(table.storageKey),
  ]
);

export type MediaAssetRow = typeof mediaAssets.$inferSelect;
export type NewMediaAssetRow = typeof mediaAssets.$inferInsert;
