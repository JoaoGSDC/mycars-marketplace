import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { timestamps } from './_helpers';
import { stores } from './stores';
import { vehicles } from './vehicles';

/** Referências de mídia (URL/storage) — sem binário no banco. */
export const vehicleMedia = sqliteTable(
  'vehicle_media',
  {
    id: text('id').primaryKey(),
    storeId: text('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'cascade' }),
    vehicleId: text('vehicle_id')
      .notNull()
      .references(() => vehicles.id, { onDelete: 'cascade' }),
    /** URL principal (detail ou original). */
    url: text('url').notNull(),
    cardUrl: text('card_url'),
    detailUrl: text('detail_url'),
    storageKey: text('storage_key'),
    mediaAssetId: text('media_asset_id'),
    sortOrder: integer('sort_order').notNull().default(0),
    isPrimary: text('is_primary').notNull().default('false'),
    alt: text('alt'),
    width: integer('width'),
    height: integer('height'),
    mimeType: text('mime_type'),
    ...timestamps,
  },
  (table) => [
    index('vehicle_media_vehicle_idx').on(table.vehicleId),
    index('vehicle_media_store_idx').on(table.storeId),
    index('vehicle_media_vehicle_order_idx').on(table.vehicleId, table.sortOrder),
  ]
);

export type VehicleMediaRow = typeof vehicleMedia.$inferSelect;
export type NewVehicleMediaRow = typeof vehicleMedia.$inferInsert;
