import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

import { timestamps } from './_helpers';

/**
 * Execuções de jobs agendados — chave de idempotência evita duplicidade.
 * Compatível com cron serverless (Vercel/etc.) via /api/internal/jobs/*.
 */
export const jobRuns = sqliteTable(
  'job_runs',
  {
    id: text('id').primaryKey(),
    /** availability_enforcement | privacy_retention | … */
    kind: text('kind').notNull(),
    /** Chave estável por janela (ex.: availability_enforcement:2026-10-21). */
    idempotencyKey: text('idempotency_key').notNull(),
    /** running | completed | failed */
    status: text('status').notNull().default('running'),
    startedAt: text('started_at').notNull(),
    finishedAt: text('finished_at'),
    processedCount: integer('processed_count').notNull().default(0),
    errorMessage: text('error_message'),
    resultJson: text('result_json'),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('job_runs_idempotency_uidx').on(table.idempotencyKey),
    index('job_runs_kind_started_idx').on(table.kind, table.startedAt),
  ]
);

export type JobRunRow = typeof jobRuns.$inferSelect;
export type NewJobRunRow = typeof jobRuns.$inferInsert;
