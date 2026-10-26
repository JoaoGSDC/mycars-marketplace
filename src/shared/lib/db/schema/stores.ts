import { index, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

import { timestamps } from './_helpers';

/** Tenant comercial — loja / solicitação de onboarding. */
export const stores = sqliteTable(
  'stores',
  {
    id: text('id').primaryKey(),
    legalName: text('legal_name').notNull(),
    tradeName: text('trade_name').notNull(),
    publicName: text('public_name').notNull(),
    slug: text('slug').notNull(),
    /** Subdomínio exclusivo da vitrine (único quando preenchido). */
    subdomain: text('subdomain'),
    /** CNPJ só dígitos (14). */
    document: text('document'),
    email: text('email'),
    phone: text('phone'),
    whatsapp: text('whatsapp'),
    street: text('street'),
    addressNumber: text('address_number'),
    complement: text('complement'),
    zipCode: text('zip_code'),
    city: text('city').notNull(),
    state: text('state').notNull(),
    neighborhood: text('neighborhood'),
    /** Texto institucional enviado no onboarding. */
    institutionalInfo: text('institutional_info'),
    responsibleName: text('responsible_name'),
    responsibleEmail: text('responsible_email'),
    responsiblePhone: text('responsible_phone'),
    /** pending | active | rejected | suspended | closed */
    status: text('status').notNull().default('pending'),
    verified: text('verified').notNull().default('false'),
    /** none | trial | active | past_due | canceled — independente do cadastro. */
    subscriptionStatus: text('subscription_status').notNull().default('none'),
    rejectionReason: text('rejection_reason'),
    reviewedAt: text('reviewed_at'),
    reviewedByUserId: text('reviewed_by_user_id'),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('stores_slug_uidx').on(table.slug),
    uniqueIndex('stores_subdomain_uidx').on(table.subdomain),
    uniqueIndex('stores_document_uidx').on(table.document),
    index('stores_status_idx').on(table.status),
  ]
);

export type StoreRow = typeof stores.$inferSelect;
export type NewStoreRow = typeof stores.$inferInsert;
