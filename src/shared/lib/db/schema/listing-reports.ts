import { index, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { timestamps } from './_helpers';
import { listings } from './listings';
import { stores } from './stores';
import { users } from './users';

/** Denúncia / sinalização de anúncio irregular. */
export const listingReports = sqliteTable(
  'listing_reports',
  {
    id: text('id').primaryKey(),
    storeId: text('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'restrict' }),
    listingId: text('listing_id')
      .notNull()
      .references(() => listings.id, { onDelete: 'cascade' }),
    reporterUserId: text('reporter_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    reporterEmail: text('reporter_email'),
    reason: text('reason').notNull(),
    /** open | reviewing | resolved | dismissed */
    status: text('status').notNull().default('open'),
    resolutionNotes: text('resolution_notes'),
    resolvedByUserId: text('resolved_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    resolvedAt: text('resolved_at'),
    ...timestamps,
  },
  (table) => [
    index('listing_reports_store_idx').on(table.storeId),
    index('listing_reports_listing_idx').on(table.listingId),
    index('listing_reports_status_idx').on(table.status),
  ]
);

export type ListingReportRow = typeof listingReports.$inferSelect;
export type NewListingReportRow = typeof listingReports.$inferInsert;
