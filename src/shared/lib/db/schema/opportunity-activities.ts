import { index, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { timestamps } from './_helpers';
import { opportunities } from './opportunities';
import { stores } from './stores';
import { users } from './users';

/**
 * Histórico de atendimento — apenas o que foi registrado (sem inventar resultados).
 */
export const opportunityActivities = sqliteTable(
  'opportunity_activities',
  {
    id: text('id').primaryKey(),
    storeId: text('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'restrict' }),
    opportunityId: text('opportunity_id')
      .notNull()
      .references(() => opportunities.id, { onDelete: 'cascade' }),
    /** contact | contact_attempt | note | stage_change | assignment | task_* | system */
    type: text('type').notNull(),
    body: text('body').notNull(),
    actorUserId: text('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
    metadataJson: text('metadata_json'),
    ...timestamps,
  },
  (table) => [
    index('opportunity_activities_opp_idx').on(table.opportunityId),
    index('opportunity_activities_store_created_idx').on(table.storeId, table.createdAt),
  ]
);

export type OpportunityActivityRow = typeof opportunityActivities.$inferSelect;
export type NewOpportunityActivityRow = typeof opportunityActivities.$inferInsert;
