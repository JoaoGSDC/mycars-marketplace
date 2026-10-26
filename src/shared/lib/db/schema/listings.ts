import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

import { timestamps } from './_helpers';
import { stores } from './stores';
import { vehicles } from './vehicles';

/**
 * Publicação comercial de um veículo.
 * Um anúncio ↔ um veículo (vehicle_id único).
 */
export const listings = sqliteTable(
  'listings',
  {
    id: text('id').primaryKey(),
    storeId: text('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'restrict' }),
    vehicleId: text('vehicle_id')
      .notNull()
      .references(() => vehicles.id, { onDelete: 'restrict' }),
    slug: text('slug').notNull(),
    title: text('title').notNull(),
    description: text('description').notNull().default(''),
    /** Preço público em centavos. */
    priceCents: integer('price_cents').notNull(),
    previousPriceCents: integer('previous_price_cents'),
    /** draft | published | paused | suspended | closed */
    status: text('status').notNull().default('draft'),
    featured: text('featured').notNull().default('false'),
    /** IDs de vehicle_media selecionados para o anúncio (JSON array ordenado). */
    mediaIdsJson: text('media_ids_json').notNull().default('[]'),
    /** Opcionais/equipamentos públicos (JSON string[]). */
    featuresJson: text('features_json').notNull().default('[]'),
    publishedAt: text('published_at'),
    closedAt: text('closed_at'),
    /**
     * true quando pausado automaticamente por confirmação de estoque vencida.
     * Permite reativar após nova confirmação sem confundir com pausa manual.
     */
    availabilityHold: text('availability_hold').notNull().default('false'),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('listings_vehicle_uidx').on(table.vehicleId),
    uniqueIndex('listings_slug_uidx').on(table.slug),
    index('listings_store_idx').on(table.storeId),
    index('listings_store_status_idx').on(table.storeId, table.status),
    index('listings_status_published_idx').on(table.status, table.publishedAt),
    index('listings_availability_hold_idx').on(table.storeId, table.availabilityHold),
  ]
);

export type ListingRow = typeof listings.$inferSelect;
export type NewListingRow = typeof listings.$inferInsert;
