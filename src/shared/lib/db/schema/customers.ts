import { index, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { timestamps } from './_helpers';
import { stores } from './stores';

/**
 * Contato comercial isolado por loja (LGPD: mínimo necessário + finalidade).
 * Duplicados: detecção por telefone na mesma loja (sem unique — permite override consciente).
 */
export const customers = sqliteTable(
  'customers',
  {
    id: text('id').primaryKey(),
    storeId: text('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'restrict' }),
    name: text('name').notNull(),
    phone: text('phone').notNull(),
    /** Dígitos apenas — busca e detecção de duplicados na loja. */
    phoneNormalized: text('phone_normalized').notNull(),
    email: text('email'),
    notes: text('notes'),
    /** Origem do primeiro cadastro (OpportunityOrigin ou listing_lead). */
    source: text('source').notNull(),
    /** Finalidade do tratamento (LGPD). */
    dataPurpose: text('data_purpose').notNull().default('commercial_contact'),
    /** ISO — registro de ciência/coleta (não inventa consentimento externo). */
    collectedAt: text('collected_at').notNull(),
    ...timestamps,
  },
  (table) => [
    index('customers_store_idx').on(table.storeId),
    index('customers_store_phone_idx').on(table.storeId, table.phoneNormalized),
    index('customers_store_name_idx').on(table.storeId, table.name),
  ]
);

export type CustomerRow = typeof customers.$inferSelect;
export type NewCustomerRow = typeof customers.$inferInsert;
