import { index, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { timestamps } from './_helpers';
import { customers } from './customers';
import { listingLeads } from './listing-leads';
import { listings } from './listings';
import { stores } from './stores';
import { users } from './users';
import { vehicles } from './vehicles';

/**
 * Oportunidade comercial (funil). Mesma publicação marketplace/vitrine via vehicle/listing.
 */
export const opportunities = sqliteTable(
  'opportunities',
  {
    id: text('id').primaryKey(),
    storeId: text('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'restrict' }),
    customerId: text('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'restrict' }),
    vehicleId: text('vehicle_id').references(() => vehicles.id, { onDelete: 'set null' }),
    listingId: text('listing_id').references(() => listings.id, { onDelete: 'set null' }),
    listingLeadId: text('listing_lead_id').references(() => listingLeads.id, {
      onDelete: 'set null',
    }),
    /** marketplace | storefront | form | whatsapp_manual | walk_in | other */
    origin: text('origin').notNull(),
    /** new_lead | in_service | negotiating | won | lost | dismissed */
    stage: text('stage').notNull().default('new_lead'),
    /** Responsável atual (denormalizado; histórico em opportunity_assignments). */
    assigneeUserId: text('assignee_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    enteredAt: text('entered_at').notNull(),
    nextActionAt: text('next_action_at'),
    nextActionLabel: text('next_action_label'),
    notes: text('notes'),
    /** Resultado ao encerrar (ganho/perdido/dismissed). */
    resultNotes: text('result_notes'),
    closedAt: text('closed_at'),
    ...timestamps,
  },
  (table) => [
    index('opportunities_store_idx').on(table.storeId),
    index('opportunities_store_stage_idx').on(table.storeId, table.stage),
    index('opportunities_store_assignee_idx').on(table.storeId, table.assigneeUserId),
    index('opportunities_store_origin_idx').on(table.storeId, table.origin),
    index('opportunities_customer_idx').on(table.customerId),
    index('opportunities_store_next_action_idx').on(table.storeId, table.nextActionAt),
  ]
);

export type OpportunityRow = typeof opportunities.$inferSelect;
export type NewOpportunityRow = typeof opportunities.$inferInsert;
