import { sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

import { timestamps } from './_helpers';
import { stores } from './stores';

/** Identidade visual e dados públicos da vitrine (1:1 com loja). */
export const storefrontSettings = sqliteTable(
  'storefront_settings',
  {
    id: text('id').primaryKey(),
    storeId: text('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'cascade' }),
    logoUrl: text('logo_url'),
    coverImageUrl: text('cover_image_url'),
    primaryColor: text('primary_color'),
    /** integrated | split — composição controlada do hero. */
    heroVariant: text('hero_variant').default('integrated'),
    /** center | top | bottom — enquadramento da capa. */
    coverFocus: text('cover_focus').default('center'),
    tagline: text('tagline'),
    about: text('about'),
    /** JSON: [{ day, open, close }] ou texto livre estruturado. */
    businessHoursJson: text('business_hours_json').notNull().default('[]'),
    contactEmail: text('contact_email'),
    contactPhone: text('contact_phone'),
    whatsappNumber: text('whatsapp_number'),
    socialInstagram: text('social_instagram'),
    socialFacebook: text('social_facebook'),
    /** JSON do rascunho do editor (não afeta vitrine pública). */
    draftJson: text('draft_json'),
    draftUpdatedAt: text('draft_updated_at'),
    ...timestamps,
  },
  (table) => [uniqueIndex('storefront_settings_store_uidx').on(table.storeId)]
);

export type StorefrontSettingsRow = typeof storefrontSettings.$inferSelect;
export type NewStorefrontSettingsRow = typeof storefrontSettings.$inferInsert;
