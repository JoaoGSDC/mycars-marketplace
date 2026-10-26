import { index, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { timestamps } from './_helpers';
import { opportunities } from './opportunities';
import { stores } from './stores';
import { users } from './users';

/**
 * Retorno / próxima ação agendada vinculada à oportunidade.
 */
export const followUpTasks = sqliteTable(
  'follow_up_tasks',
  {
    id: text('id').primaryKey(),
    storeId: text('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'restrict' }),
    opportunityId: text('opportunity_id')
      .notNull()
      .references(() => opportunities.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    dueAt: text('due_at').notNull(),
    /** pending | done | cancelled */
    status: text('status').notNull().default('pending'),
    completedAt: text('completed_at'),
    createdByUserId: text('created_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    assignedToUserId: text('assigned_to_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    ...timestamps,
  },
  (table) => [
    index('follow_up_tasks_opp_idx').on(table.opportunityId),
    index('follow_up_tasks_store_due_idx').on(table.storeId, table.dueAt),
    index('follow_up_tasks_store_status_idx').on(table.storeId, table.status),
  ]
);

export type FollowUpTaskRow = typeof followUpTasks.$inferSelect;
export type NewFollowUpTaskRow = typeof followUpTasks.$inferInsert;
