import { index, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { timestamps } from './_helpers';
import { stores } from './stores';
import { users } from './users';
import { vehicles } from './vehicles';

/** Histórico de confirmações de disponibilidade (não apagar silenciosamente). */
export const vehicleAvailabilityConfirmations = sqliteTable(
  'vehicle_availability_confirmations',
  {
    id: text('id').primaryKey(),
    storeId: text('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'restrict' }),
    vehicleId: text('vehicle_id')
      .notNull()
      .references(() => vehicles.id, { onDelete: 'cascade' }),
    confirmedAt: text('confirmed_at').notNull(),
    dueAt: text('due_at').notNull(),
    /** manual | batch | system */
    source: text('source').notNull().default('manual'),
    actorUserId: text('actor_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    notes: text('notes'),
    ...timestamps,
  },
  (table) => [
    index('vac_store_idx').on(table.storeId),
    index('vac_vehicle_idx').on(table.vehicleId),
    index('vac_store_confirmed_idx').on(table.storeId, table.confirmedAt),
  ]
);

export type VehicleAvailabilityConfirmationRow =
  typeof vehicleAvailabilityConfirmations.$inferSelect;
export type NewVehicleAvailabilityConfirmationRow =
  typeof vehicleAvailabilityConfirmations.$inferInsert;
