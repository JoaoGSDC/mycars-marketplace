import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

import { timestamps } from './_helpers';

/**
 * Identidade de conta — compatível com Better Auth (`user` model → tabela `users`).
 * Campos extras (phone, status) via additionalFields.
 */
export const users = sqliteTable(
  'users',
  {
    id: text('id').primaryKey(),
    email: text('email').notNull(),
    name: text('name').notNull(),
    emailVerified: integer('email_verified', { mode: 'boolean' }).notNull().default(false),
    /** Avatar — Better Auth field `image`. */
    image: text('image'),
    phone: text('phone'),
    /** active | invited | disabled */
    status: text('status').notNull().default('active'),
    /** user | admin — papel na plataforma (não confundir com store role). */
    platformRole: text('platform_role').notNull().default('user'),
    ...timestamps,
  },
  (table) => [uniqueIndex('users_email_uidx').on(table.email)]
);

export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;
