import { index, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { timestamps } from './_helpers';
import { listings } from './listings';
import { stores } from './stores';
import { vehicles } from './vehicles';

/**
 * Interesse registrado a partir do detalhe público.
 * Não expõe dados privados do estoque (custos, preço mínimo, chassi).
 */
export const listingLeads = sqliteTable(
  'listing_leads',
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
    name: text('name').notNull(),
    email: text('email'),
    phone: text('phone').notNull(),
    message: text('message').notNull(),
    /** detail_form | whatsapp_click */
    source: text('source').notNull(),
    originPath: text('origin_path').notNull(),
    listingSlug: text('listing_slug').notNull(),
    ipHash: text('ip_hash'),
    userAgent: text('user_agent'),
    /** new_lead | … (OpportunityStatus) */
    status: text('status').notNull().default('new_lead'),
    ...timestamps,
  },
  (table) => [
    index('listing_leads_store_idx').on(table.storeId),
    index('listing_leads_listing_idx').on(table.listingId),
    index('listing_leads_store_created_idx').on(table.storeId, table.createdAt),
    index('listing_leads_ip_created_idx').on(table.ipHash, table.createdAt),
  ]
);

export type ListingLeadRow = typeof listingLeads.$inferSelect;
export type NewListingLeadRow = typeof listingLeads.$inferInsert;
