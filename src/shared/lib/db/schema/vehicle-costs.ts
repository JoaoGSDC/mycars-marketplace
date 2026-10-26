import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { timestamps } from './_helpers';
import { stores } from './stores';
import { vehicles } from './vehicles';

/** Custos privados do veículo — nunca expor no marketplace. */
export const vehicleCosts = sqliteTable(
  'vehicle_costs',
  {
    id: text('id').primaryKey(),
    storeId: text('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'cascade' }),
    vehicleId: text('vehicle_id')
      .notNull()
      .references(() => vehicles.id, { onDelete: 'cascade' }),
    /** acquisition | transport | repair | detailing | other */
    type: text('type').notNull(),
    /** Valor em centavos (inteiro) para evitar float. */
    amountCents: integer('amount_cents').notNull(),
    incurredAt: text('incurred_at').notNull(),
    description: text('description'),
    ...timestamps,
  },
  (table) => [
    index('vehicle_costs_store_idx').on(table.storeId),
    index('vehicle_costs_vehicle_idx').on(table.vehicleId),
  ]
);

export type VehicleCostRow = typeof vehicleCosts.$inferSelect;
export type NewVehicleCostRow = typeof vehicleCosts.$inferInsert;
