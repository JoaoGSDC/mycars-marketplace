import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

import { timestamps } from './_helpers';

/** Catálogo de planos comerciais do SaaS (sem gateway de pagamento). */
export const plans = sqliteTable(
  'plans',
  {
    id: text('id').primaryKey(),
    code: text('code').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    maxPublishedListings: integer('max_published_listings').notNull().default(10),
    maxVehicles: integer('max_vehicles').notNull().default(50),
    maxMembers: integer('max_members').notNull().default(5),
    gracePeriodDays: integer('grace_period_days').notNull().default(7),
    priceCentsMonthly: integer('price_cents_monthly').notNull().default(0),
    isActive: text('is_active').notNull().default('true'),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('plans_code_uidx').on(table.code),
    index('plans_active_idx').on(table.isActive),
  ]
);

export type PlanRow = typeof plans.$inferSelect;
export type NewPlanRow = typeof plans.$inferInsert;
