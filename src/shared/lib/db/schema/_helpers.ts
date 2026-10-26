import { sql } from 'drizzle-orm';
import { text } from 'drizzle-orm/sqlite-core';

/** Timestamps ISO-8601 em texto (compatível com SQLite/Turso). */
export const timestamps = {
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(datetime('now'))`),
};

export function createId(): string {
  return crypto.randomUUID();
}

export function nowIso(): string {
  return new Date().toISOString();
}
