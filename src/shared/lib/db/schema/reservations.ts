import { index, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

import { timestamps } from './_helpers';
import { customers } from './customers';
import { opportunities } from './opportunities';
import { stores } from './stores';
import { users } from './users';
import { vehicles } from './vehicles';

/**
 * Reserva temporária de unidade.
 * No máximo uma reserva `active` por veículo (índice parcial único).
 */
export const reservations = sqliteTable(
  'reservations',
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
    opportunityId: text('opportunity_id').references(() => opportunities.id, {
      onDelete: 'set null',
    }),
    assigneeUserId: text('assignee_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    startsAt: text('starts_at').notNull(),
    expiresAt: text('expires_at').notNull(),
    /** active | completed | cancelled | expired */
    status: text('status').notNull().default('active'),
    notes: text('notes'),
    createdByUserId: text('created_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    ...timestamps,
  },
  (table) => [
    index('reservations_store_idx').on(table.storeId),
    index('reservations_store_status_idx').on(table.storeId, table.status),
    index('reservations_vehicle_idx').on(table.vehicleId),
    index('reservations_expires_idx').on(table.expiresAt),
    /** Garante uma única reserva ativa por veículo (concorrência no banco). */
    uniqueIndex('reservations_vehicle_active_uidx')
      .on(table.vehicleId)
      .where(sql`${table.status} = 'active'`),
  ]
);

export type ReservationRow = typeof reservations.$inferSelect;
export type NewReservationRow = typeof reservations.$inferInsert;

export const reservationEvents = sqliteTable(
  'reservation_events',
  {
    id: text('id').primaryKey(),
    storeId: text('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'restrict' }),
    reservationId: text('reservation_id')
      .notNull()
      .references(() => reservations.id, { onDelete: 'cascade' }),
    /** created | extended | cancelled | expired | completed | note */
    type: text('type').notNull(),
    body: text('body').notNull(),
    actorUserId: text('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
    metadataJson: text('metadata_json'),
    ...timestamps,
  },
  (table) => [
    index('reservation_events_reservation_idx').on(table.reservationId),
    index('reservation_events_store_created_idx').on(table.storeId, table.createdAt),
  ]
);

export type ReservationEventRow = typeof reservationEvents.$inferSelect;
export type NewReservationEventRow = typeof reservationEvents.$inferInsert;
