import { index, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { timestamps } from './_helpers';
import { opportunities } from './opportunities';
import { stores } from './stores';
import { users } from './users';

/**
 * Histórico de atribuição de responsável.
 * O responsável vigente também fica em opportunities.assignee_user_id.
 */
export const opportunityAssignments = sqliteTable(
  'opportunity_assignments',
  {
    id: text('id').primaryKey(),
    storeId: text('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'restrict' }),
    opportunityId: text('opportunity_id')
      .notNull()
      .references(() => opportunities.id, { onDelete: 'cascade' }),
    assigneeUserId: text('assignee_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    assignedByUserId: text('assigned_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    assignedAt: text('assigned_at').notNull(),
    /** Preenchido quando outro responsável assume. */
    endedAt: text('ended_at'),
    ...timestamps,
  },
  (table) => [
    index('opportunity_assignments_opp_idx').on(table.opportunityId),
    index('opportunity_assignments_store_assignee_idx').on(table.storeId, table.assigneeUserId),
  ]
);

export type OpportunityAssignmentRow = typeof opportunityAssignments.$inferSelect;
export type NewOpportunityAssignmentRow = typeof opportunityAssignments.$inferInsert;
