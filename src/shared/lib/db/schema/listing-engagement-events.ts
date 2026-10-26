import { index, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { timestamps } from './_helpers';
import { listings } from './listings';
import { stores } from './stores';
import { vehicles } from './vehicles';

/**
 * Eventos de engajamento público (ex.: clique em WhatsApp).
 * Não cria lead/oportunidade — clique ≠ interesse confirmado.
 */
export const listingEngagementEvents = sqliteTable(
  'listing_engagement_events',
  {
    id: text('id').primaryKey(),
    storeId: text('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'restrict' }),
    listingId: text('listing_id')
      .notNull()
      .references(() => listings.id, { onDelete: 'restrict' }),
    vehicleId: text('vehicle_id')
      .notNull()
      .references(() => vehicles.id, { onDelete: 'restrict' }),
    listingSlug: text('listing_slug').notNull(),
    /** whatsapp_click */
    eventType: text('event_type').notNull(),
    originPath: text('origin_path').notNull(),
    ipHash: text('ip_hash'),
    userAgent: text('user_agent'),
    ...timestamps,
  },
  (table) => [
    index('listing_engagement_store_idx').on(table.storeId),
    index('listing_engagement_listing_idx').on(table.listingId),
    index('listing_engagement_ip_created_idx').on(table.ipHash, table.createdAt),
  ]
);

export type ListingEngagementEventRow = typeof listingEngagementEvents.$inferSelect;
export type NewListingEngagementEventRow = typeof listingEngagementEvents.$inferInsert;
