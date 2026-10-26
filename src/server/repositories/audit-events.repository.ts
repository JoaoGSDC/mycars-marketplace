import { and, count, desc, eq, like, or, type SQL } from 'drizzle-orm';

import {
  auditEvents,
  createId,
  getDb,
  users,
  type AuditEventRow,
  type NewAuditEventRow,
} from '@lib/db';
import { toAuditPayloadJson } from '@server/audit/sanitize-audit-payload';

export async function insertAuditEvent(
  input: Omit<NewAuditEventRow, 'id' | 'createdAt'> & { id?: string; payload?: unknown }
): Promise<AuditEventRow> {
  const db = getDb();
  const id = input.id ?? createId();
  const { payload, payloadJson, ...rest } = input as typeof input & {
    payload?: unknown;
  };

  let safePayloadJson = payloadJson ?? '{}';

  if (payload !== undefined) {
    safePayloadJson = toAuditPayloadJson(payload);
  } else if (payloadJson) {
    try {
      safePayloadJson = toAuditPayloadJson(JSON.parse(payloadJson));
    } catch {
      safePayloadJson = '{}';
    }
  }

  await db.insert(auditEvents).values({
    ...rest,
    payloadJson: safePayloadJson,
    id,
  });

  const rows = await db.select().from(auditEvents).where(eq(auditEvents.id, id)).limit(1);
  const row = rows[0];

  if (!row) {
    throw new Error('Falha ao inserir evento de auditoria');
  }

  return row;
}

export async function listAuditEventsByStore(storeId: string, limit = 50): Promise<AuditEventRow[]> {
  const db = getDb();

  return db
    .select()
    .from(auditEvents)
    .where(eq(auditEvents.storeId, storeId))
    .orderBy(desc(auditEvents.createdAt))
    .limit(limit);
}

export type PlatformAuditItem = AuditEventRow & {
  actorName: string | null;
};

export async function searchPlatformAuditEvents(params: {
  actionPrefix?: string;
  storeId?: string;
  q?: string;
  page: number;
  pageSize: number;
}): Promise<{ items: PlatformAuditItem[]; total: number }> {
  const db = getDb();
  const conditions: SQL[] = [];

  if (params.storeId) {
    conditions.push(eq(auditEvents.storeId, params.storeId));
  }

  if (params.actionPrefix) {
    conditions.push(like(auditEvents.action, `${params.actionPrefix}%`));
  }

  const q = params.q?.trim();

  if (q) {
    const pattern = `%${q}%`;
    conditions.push(
      or(like(auditEvents.action, pattern), like(auditEvents.entityType, pattern))!
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const [totalRow] = await db.select({ value: count() }).from(auditEvents).where(where);

  const rows = await db
    .select({
      event: auditEvents,
      actorName: users.name,
    })
    .from(auditEvents)
    .leftJoin(users, eq(auditEvents.actorUserId, users.id))
    .where(where)
    .orderBy(desc(auditEvents.createdAt))
    .limit(params.pageSize)
    .offset((params.page - 1) * params.pageSize);

  return {
    total: Number(totalRow?.value ?? 0),
    items: rows.map((row) => ({ ...row.event, actorName: row.actorName ?? null })),
  };
}
