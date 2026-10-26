import { index, integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

import { timestamps } from './_helpers';
import { stores } from './stores';

/** Unidade física do estoque — pertence a uma loja (independente de anúncio). */
export const vehicles = sqliteTable(
  'vehicles',
  {
    id: text('id').primaryKey(),
    storeId: text('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'restrict' }),
    /** Código interno da loja (único por tenant). */
    internalCode: text('internal_code'),
    make: text('make').notNull(),
    makeSlug: text('make_slug').notNull(),
    model: text('model').notNull(),
    modelSlug: text('model_slug').notNull(),
    version: text('version').notNull(),
    /** new | seminew | used */
    condition: text('condition').notNull(),
    /** preparing | available | reserved | sold | withdrawn */
    status: text('status').notNull().default('preparing'),
    /** own | consigned */
    ownership: text('ownership').notNull().default('own'),
    enteredAt: text('entered_at').notNull(),
    mileageKm: integer('mileage_km').notNull().default(0),
    fuel: text('fuel').notNull(),
    transmission: text('transmission').notNull(),
    yearManufacture: integer('year_manufacture').notNull(),
    yearModel: integer('year_model').notNull(),
    bodyType: text('body_type').notNull(),
    color: text('color'),
    powerKw: real('power_kw'),
    drivetrain: text('drivetrain'),
    vin: text('vin'),
    plate: text('plate'),
    /** Preço pretendido interno (centavos) — não é preço público do listing. */
    askingPriceCents: integer('asking_price_cents'),
    consignorName: text('consignor_name'),
    consignorPhone: text('consignor_phone'),
    consignorDocument: text('consignor_document'),
    /** Rascunho de cadastro ainda incompleto. */
    isDraft: text('is_draft').notNull().default('false'),
    notesInternal: text('notes_internal'),
    notesCommercial: text('notes_commercial'),
    /** Última confirmação de disponibilidade (ISO). */
    availabilityConfirmedAt: text('availability_confirmed_at'),
    /** Próximo vencimento da confirmação (ISO). */
    availabilityDueAt: text('availability_due_at'),
    /**
     * Assistente de precificação — referência FIPE escolhida (painel privado).
     * unmatched | candidates | matched | stale | unavailable
     */
    fipeMatchStatus: text('fipe_match_status').notNull().default('unmatched'),
    fipeCode: text('fipe_code'),
    fipeYearId: text('fipe_year_id'),
    fipeFuel: text('fipe_fuel'),
    fipeBrandCode: text('fipe_brand_code'),
    fipeModelCode: text('fipe_model_code'),
    fipeProvider: text('fipe_provider'),
    fipeReferenceCode: text('fipe_reference_code'),
    fipeReferenceLabel: text('fipe_reference_label'),
    fipePriceCents: integer('fipe_price_cents'),
    fipeFetchedAt: text('fipe_fetched_at'),
    /** Margem bruta desejada em basis points (1500 = 15%). */
    desiredMarginBps: integer('desired_margin_bps'),
    ...timestamps,
  },
  (table) => [
    index('vehicles_store_idx').on(table.storeId),
    index('vehicles_store_status_idx').on(table.storeId, table.status),
    index('vehicles_make_model_idx').on(table.makeSlug, table.modelSlug),
    index('vehicles_store_plate_idx').on(table.storeId, table.plate),
    uniqueIndex('vehicles_store_internal_uidx').on(table.storeId, table.internalCode),
    index('vehicles_store_availability_due_idx').on(table.storeId, table.availabilityDueAt),
    index('vehicles_fipe_code_idx').on(table.fipeCode),
  ]
);

export type VehicleRow = typeof vehicles.$inferSelect;
export type NewVehicleRow = typeof vehicles.$inferInsert;
