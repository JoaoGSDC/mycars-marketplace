import {
  PRIVACY_REQUEST_STATUS,
  PRIVACY_REQUEST_TYPES,
  RETENTION_POLICY_DAYS,
} from '@app-types/privacy';
import { PERMISSIONS } from '@app-types/permissions';
import {
  customers,
  getDb,
  nowIso,
  sales,
  vehicleAvailabilityConfirmations,
  type CustomerRow,
} from '@lib/db';
import { and, desc, eq, lt } from 'drizzle-orm';
import { sanitizeAuditPayload } from '@server/audit/sanitize-audit-payload';
import { authorizeStoreAction } from '@server/auth/access';
import {
  privacyRequestSchema,
  type PrivacyRequestInput,
} from '@server/integrity/integrity.validators';
import * as auditRepo from '@server/repositories/audit-events.repository';
import * as customersRepo from '@server/repositories/customers.repository';
import * as listingsRepo from '@server/repositories/listings.repository';
import * as privacyRepo from '@server/repositories/privacy.repository';
import * as storesRepo from '@server/repositories/stores.repository';
import * as vehiclesRepo from '@server/repositories/vehicles.repository';
import { serviceError, serviceSuccess } from '@server/shared/service-result';

const MAX_PENDING_PRIVACY_REQUESTS = 5;

function addDays(iso: string, days: number): string {
  return new Date(new Date(iso).getTime() + days * 24 * 60 * 60 * 1000).toISOString();
}

function subtractDays(iso: string, days: number): string {
  return new Date(new Date(iso).getTime() - days * 24 * 60 * 60 * 1000).toISOString();
}

function publicCustomerSlice(row: CustomerRow) {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    source: row.source,
    dataPurpose: row.dataPurpose,
    collectedAt: row.collectedAt,
    createdAt: row.createdAt,
  };
}

/** Exportação da loja — dados comerciais mínimos, sem credenciais. */
export async function requestStoreDataExport(raw: PrivacyRequestInput, actorUserId: string) {
  const parsed = privacyRequestSchema.safeParse({ ...raw, type: PRIVACY_REQUEST_TYPES.EXPORT });

  if (!parsed.success) {
    return serviceError('VALIDATION', parsed.error.issues[0]?.message ?? 'Dados inválidos');
  }

  const access = await authorizeStoreAction(
    actorUserId,
    parsed.data.storeId,
    PERMISSIONS.STORE_WRITE
  );

  if (!access.ok) {
    return access;
  }

  const pending = await privacyRepo.listPrivacyRequestsByStore(parsed.data.storeId, 20);
  const openCount = pending.filter(
    (row) =>
      row.status === PRIVACY_REQUEST_STATUS.PENDING ||
      row.status === PRIVACY_REQUEST_STATUS.PROCESSING
  ).length;

  if (openCount >= MAX_PENDING_PRIVACY_REQUESTS) {
    return serviceError(
      'FORBIDDEN',
      'Limite de solicitações abertas atingido — aguarde o processamento'
    );
  }

  const request = await privacyRepo.insertPrivacyRequest({
    storeId: parsed.data.storeId,
    type: PRIVACY_REQUEST_TYPES.EXPORT,
    status: PRIVACY_REQUEST_STATUS.PROCESSING,
    requestedByUserId: actorUserId,
    reason: parsed.data.reason ?? null,
    resultJson: null,
    retentionHoldUntil: null,
    processedAt: null,
  });

  try {
    const store = await storesRepo.findStoreById(parsed.data.storeId);
    const customerPage = await customersRepo.searchCustomersInStore({
      storeId: parsed.data.storeId,
      page: 1,
      pageSize: 500,
    });
    const vehicleList = await vehiclesRepo.listVehiclesByStore(parsed.data.storeId);
    const listingList = await listingsRepo.listListingsByStore(parsed.data.storeId);
    const saleRows = await getDb()
      .select()
      .from(sales)
      .where(eq(sales.storeId, parsed.data.storeId))
      .orderBy(desc(sales.createdAt))
      .limit(500);

    const vehiclesExport = vehicleList.map((row) => ({
      id: row.id,
      make: row.make,
      model: row.model,
      yearModel: row.yearModel,
      status: row.status,
      plate: row.plate,
      enteredAt: row.enteredAt,
    }));

    const payload = sanitizeAuditPayload({
      exportedAt: nowIso(),
      store: store
        ? {
            id: store.id,
            publicName: store.publicName,
            tradeName: store.tradeName,
            slug: store.slug,
            city: store.city,
            state: store.state,
          }
        : null,
      customers: customerPage.items.map(publicCustomerSlice),
      vehicles: vehiclesExport,
      listings: listingList.map((row) => ({
        id: row.id,
        vehicleId: row.vehicleId,
        status: row.status,
        priceCents: row.priceCents,
        publishedAt: row.publishedAt,
      })),
      sales: saleRows.map((sale) => ({
        id: sale.id,
        vehicleId: sale.vehicleId,
        soldAt: sale.soldAt,
        status: sale.status,
      })),
      retentionPolicyDays: RETENTION_POLICY_DAYS,
      note: 'Exportação sem senhas, tokens ou dados de autenticação.',
    });

    const completed = await privacyRepo.updatePrivacyRequest(request.id, {
      status: PRIVACY_REQUEST_STATUS.COMPLETED,
      resultJson: JSON.stringify(payload),
      processedAt: nowIso(),
    });

    await auditRepo.insertAuditEvent({
      storeId: parsed.data.storeId,
      actorUserId,
      action: 'privacy.export_completed',
      entityType: 'privacy_request',
      entityId: completed.id,
      payload: {
        customerCount: customerPage.items.length,
        vehicleCount: vehiclesExport.length,
      },
    });

    return serviceSuccess(completed);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha na exportação';
    await privacyRepo.updatePrivacyRequest(request.id, {
      status: PRIVACY_REQUEST_STATUS.REJECTED,
      resultJson: JSON.stringify({ error: 'export_failed' }),
      processedAt: nowIso(),
    });

    await auditRepo.insertAuditEvent({
      storeId: parsed.data.storeId,
      actorUserId,
      action: 'privacy.export_failed',
      entityType: 'privacy_request',
      entityId: request.id,
      payload: { reason: message.slice(0, 200) },
    });

    return serviceError('INTERNAL', 'Não foi possível concluir a exportação. Tente novamente.');
  }
}

/**
 * Solicitação de exclusão: anonimiza clientes ociosos;
 * respeita retenção comercial (vendas/auditoria) via retention_hold.
 */
export async function requestStoreDataDeletion(raw: PrivacyRequestInput, actorUserId: string) {
  const parsed = privacyRequestSchema.safeParse({
    ...raw,
    type: PRIVACY_REQUEST_TYPES.DELETION,
  });

  if (!parsed.success) {
    return serviceError('VALIDATION', parsed.error.issues[0]?.message ?? 'Dados inválidos');
  }

  const access = await authorizeStoreAction(
    actorUserId,
    parsed.data.storeId,
    PERMISSIONS.STORE_WRITE
  );

  if (!access.ok) {
    return access;
  }

  const holdUntil = addDays(nowIso(), RETENTION_POLICY_DAYS.SALES);
  const request = await privacyRepo.insertPrivacyRequest({
    storeId: parsed.data.storeId,
    type: PRIVACY_REQUEST_TYPES.DELETION,
    status: PRIVACY_REQUEST_STATUS.RETENTION_HOLD,
    requestedByUserId: actorUserId,
    reason: parsed.data.reason ?? null,
    resultJson: null,
    retentionHoldUntil: holdUntil,
    processedAt: null,
  });

  const anonymized = await anonymizeIdleCustomers(parsed.data.storeId);

  const updated = await privacyRepo.updatePrivacyRequest(request.id, {
    resultJson: JSON.stringify({
      anonymizedCustomers: anonymized,
      retentionHoldUntil: holdUntil,
      note: 'Vendas e auditoria preservadas até o fim da retenção legal/comercial.',
    }),
    processedAt: nowIso(),
  });

  await auditRepo.insertAuditEvent({
    storeId: parsed.data.storeId,
    actorUserId,
    action: 'privacy.deletion_requested',
    entityType: 'privacy_request',
    entityId: request.id,
    payload: { anonymizedCustomers: anonymized, retentionHoldUntil: holdUntil },
  });

  return serviceSuccess(updated);
}

export async function listStorePrivacyRequests(storeId: string, actorUserId: string) {
  const access = await authorizeStoreAction(actorUserId, storeId, PERMISSIONS.STORE_WRITE);

  if (!access.ok) {
    return access;
  }

  const rows = await privacyRepo.listPrivacyRequestsByStore(storeId);

  /** Lista sem payload de export — evita vazamento LGPD para quem só tem STORE_READ. */
  return serviceSuccess(
    rows.map((row) => ({
      ...row,
      resultJson: null,
      hasResultPayload: Boolean(row.resultJson),
    }))
  );
}

async function anonymizeIdleCustomers(storeId: string): Promise<number> {
  const cutoff = subtractDays(nowIso(), RETENTION_POLICY_DAYS.CUSTOMER_IDLE);
  const page = await customersRepo.searchCustomersInStore({
    storeId,
    page: 1,
    pageSize: 500,
  });

  let count = 0;

  for (const customer of page.items) {
    if (customer.updatedAt > cutoff) {
      continue;
    }

    if (customer.name.startsWith('[anonimizado]')) {
      continue;
    }

    await customersRepo.updateCustomer(customer.id, {
      name: `[anonimizado] ${customer.id.slice(0, 8)}`,
      phone: '00000000000',
      phoneNormalized: '00000000000',
      email: null,
      notes: null,
      dataPurpose: 'anonymized',
    });
    count += 1;
  }

  return count;
}

/** Varredura de retenção — idempotente por lote (só toca registros elegíveis). */
export async function runPrivacyRetentionSweep(options: { storeId?: string } = {}) {
  const now = nowIso();
  const confirmCutoff = subtractDays(now, RETENTION_POLICY_DAYS.AVAILABILITY_CONFIRMATIONS);
  const db = getDb();

  const confirmConditions = [lt(vehicleAvailabilityConfirmations.confirmedAt, confirmCutoff)];

  if (options.storeId) {
    confirmConditions.push(eq(vehicleAvailabilityConfirmations.storeId, options.storeId));
  }

  const toPurge = await db
    .select({ id: vehicleAvailabilityConfirmations.id })
    .from(vehicleAvailabilityConfirmations)
    .where(and(...confirmConditions))
    .limit(500);

  let purgedConfirmations = 0;

  for (const row of toPurge) {
    await db
      .delete(vehicleAvailabilityConfirmations)
      .where(eq(vehicleAvailabilityConfirmations.id, row.id));
    purgedConfirmations += 1;
  }

  let anonymizedCustomers = 0;
  const storeIdRows = options.storeId
    ? [{ storeId: options.storeId }]
    : await db.select({ storeId: customers.storeId }).from(customers).groupBy(customers.storeId).limit(100);

  for (const row of storeIdRows) {
    anonymizedCustomers += await anonymizeIdleCustomers(row.storeId);
  }

  return { purgedConfirmations, anonymizedCustomers, ranAt: now };
}
