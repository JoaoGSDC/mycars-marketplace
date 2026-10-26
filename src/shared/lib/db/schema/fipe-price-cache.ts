import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

import { timestamps } from './_helpers';

/**
 * Cache compartilhado de cotações FIPE (entre lojas).
 * Chave lógica: provider + fipeCode + yearId + referenceCode.
 */
export const fipePriceCache = sqliteTable(
  'fipe_price_cache',
  {
    id: text('id').primaryKey(),
    provider: text('provider').notNull(),
    vehicleType: text('vehicle_type').notNull().default('cars'),
    fipeCode: text('fipe_code').notNull(),
    yearId: text('year_id').notNull(),
    referenceCode: text('reference_code').notNull(),
    referenceLabel: text('reference_label').notNull(),
    brandCode: text('brand_code').notNull(),
    brandName: text('brand_name').notNull(),
    modelCode: text('model_code').notNull(),
    modelName: text('model_name').notNull(),
    fuel: text('fuel').notNull(),
    modelYear: integer('model_year').notNull(),
    priceCents: integer('price_cents').notNull(),
    fetchedAt: text('fetched_at').notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('fipe_price_cache_key_uidx').on(
      table.provider,
      table.fipeCode,
      table.yearId,
      table.referenceCode
    ),
    index('fipe_price_cache_code_idx').on(table.fipeCode),
  ]
);

export type FipePriceCacheRow = typeof fipePriceCache.$inferSelect;
export type NewFipePriceCacheRow = typeof fipePriceCache.$inferInsert;
