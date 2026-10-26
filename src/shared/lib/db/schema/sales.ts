import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

import { timestamps } from './_helpers';
import { customers } from './customers';
import { opportunities } from './opportunities';
import { stores } from './stores';
import { users } from './users';
import { vehicles } from './vehicles';

/**
 * Venda comercial registrada (não implica pagamento recebido / NF-e).
 * No máximo uma venda `completed` por veículo.
 */
export const sales = sqliteTable(
  'sales',
  {
    id: text('id').primaryKey(),
    storeId: text('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'restrict' }),
    vehicleId: text('vehicle_id')
      .notNull()
      .references(() => vehicles.id, { onDelete: 'restrict' }),
    customerId: text('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'restrict' }),
    sellerUserId: text('seller_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    opportunityId: text('opportunity_id').references(() => opportunities.id, {
      onDelete: 'set null',
    }),
    soldAt: text('sold_at').notNull(),
    /** Preço de referência (anúncio ou pretendido). */
    listedPriceCents: integer('listed_price_cents'),
    negotiatedPriceCents: integer('negotiated_price_cents').notNull(),
    /** Snapshot dos custos no momento da venda. */
    costsCents: integer('costs_cents').notNull().default(0),
    costsIncomplete: text('costs_incomplete').notNull().default('false'),
    /** negotiated - costs; null quando incompleto/consignado sem base confiável. */
    grossResultCents: integer('gross_result_cents'),
    /** cash | financed | trade_in | mixed | other */
    modality: text('modality').notNull(),
    /** own | consigned — snapshot */
    ownership: text('ownership').notNull(),
    hasTradeIn: text('has_trade_in').notNull().default('false'),
    tradeInDescription: text('trade_in_description'),
    notes: text('notes'),
    /** completed | cancelled */
    status: text('status').notNull().default('completed'),
    cancelReason: text('cancel_reason'),
    cancelledAt: text('cancelled_at'),
    cancelledByUserId: text('cancelled_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    createdByUserId: text('created_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    ...timestamps,
  },
  (table) => [
    index('sales_store_idx').on(table.storeId),
    index('sales_store_status_idx').on(table.storeId, table.status),
    index('sales_store_sold_at_idx').on(table.storeId, table.soldAt),
    index('sales_store_seller_idx').on(table.storeId, table.sellerUserId),
    index('sales_vehicle_idx').on(table.vehicleId),
    uniqueIndex('sales_vehicle_completed_uidx')
      .on(table.vehicleId)
      .where(sql`${table.status} = 'completed'`),
  ]
);

export type SaleRow = typeof sales.$inferSelect;
export type NewSaleRow = typeof sales.$inferInsert;

export const saleEvents = sqliteTable(
  'sale_events',
  {
    id: text('id').primaryKey(),
    storeId: text('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'restrict' }),
    saleId: text('sale_id')
      .notNull()
      .references(() => sales.id, { onDelete: 'cascade' }),
    /** created | cancelled | note */
    type: text('type').notNull(),
    body: text('body').notNull(),
    actorUserId: text('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
    metadataJson: text('metadata_json'),
    ...timestamps,
  },
  (table) => [
    index('sale_events_sale_idx').on(table.saleId),
    index('sale_events_store_created_idx').on(table.storeId, table.createdAt),
  ]
);

export type SaleEventRow = typeof saleEvents.$inferSelect;
export type NewSaleEventRow = typeof saleEvents.$inferInsert;
