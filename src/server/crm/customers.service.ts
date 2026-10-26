import {
  CUSTOMER_DATA_PURPOSES,
  type OpportunityOrigin,
} from '@app-types/crm';
import { PERMISSIONS } from '@app-types/permissions';
import type { CustomerRow } from '@lib/db';
import { nowIso } from '@lib/db';
import { authorizeStoreAction } from '@server/auth/access';
import * as auditRepo from '@server/repositories/audit-events.repository';
import * as customersRepo from '@server/repositories/customers.repository';
import * as opportunitiesRepo from '@server/repositories/opportunities.repository';
import { serviceError, serviceSuccess, type ServiceResult } from '@server/shared/service-result';
import { normalizePhone } from '@utils/phone';

import {
  createCustomerSchema,
  searchCustomersSchema,
  updateCustomerSchema,
  type CreateCustomerInput,
  type SearchCustomersInput,
  type UpdateCustomerInput,
} from './crm.validators';

export type CustomerDuplicateHint = {
  id: string;
  name: string;
  phone: string;
};

export async function createCustomer(
  raw: CreateCustomerInput,
  actorUserId: string
): Promise<ServiceResult<{ customer: CustomerRow; duplicates: CustomerDuplicateHint[] }>> {
  const parsed = createCustomerSchema.safeParse(raw);

  if (!parsed.success) {
    return serviceError('VALIDATION', parsed.error.issues[0]?.message ?? 'Dados inválidos');
  }

  const data = parsed.data;
  const access = await authorizeStoreAction(
    actorUserId,
    data.storeId,
    PERMISSIONS.CUSTOMERS_WRITE
  );

  if (!access.ok) {
    return access;
  }

  const phoneNormalized = normalizePhone(data.phone);
  const duplicates = await customersRepo.findCustomersByPhoneInStore(
    data.storeId,
    phoneNormalized
  );

  if (duplicates.length > 0 && !data.allowDuplicate) {
    return serviceError(
      'CONFLICT',
      'Já existe cliente com este telefone na loja. Confirme para cadastrar mesmo assim.'
    );
  }

  const customer = await customersRepo.insertCustomer({
    storeId: data.storeId,
    name: data.name,
    phone: data.phone.replace(/\s+/g, ''),
    phoneNormalized,
    email: data.email ?? null,
    notes: data.notes ?? null,
    source: data.source,
    dataPurpose: data.dataPurpose,
    collectedAt: nowIso(),
  });

  await auditRepo.insertAuditEvent({
    storeId: data.storeId,
    actorUserId,
    action: 'customer.created',
    entityType: 'customer',
    entityId: customer.id,
    payloadJson: JSON.stringify({
      source: data.source,
      dataPurpose: data.dataPurpose,
      duplicateOverride: data.allowDuplicate && duplicates.length > 0,
    }),
  });

  return serviceSuccess({
    customer,
    duplicates: duplicates.map((d) => ({ id: d.id, name: d.name, phone: d.phone })),
  });
}

/** Uso interno (lead público) — sem actor autenticado. */
export async function findOrCreateCustomerFromPublicLead(input: {
  storeId: string;
  name: string;
  phone: string;
  email?: string | null;
  source: OpportunityOrigin;
}): Promise<CustomerRow> {
  const phoneNormalized = normalizePhone(input.phone);
  const existing = await customersRepo.findCustomersByPhoneInStore(
    input.storeId,
    phoneNormalized
  );

  if (existing[0]) {
    return existing[0];
  }

  return customersRepo.insertCustomer({
    storeId: input.storeId,
    name: input.name,
    phone: input.phone.replace(/\s+/g, ''),
    phoneNormalized,
    email: input.email ?? null,
    notes: null,
    source: input.source,
    dataPurpose: CUSTOMER_DATA_PURPOSES.COMMERCIAL_CONTACT,
    collectedAt: nowIso(),
  });
}

export async function updateCustomer(
  raw: UpdateCustomerInput,
  actorUserId: string
): Promise<ServiceResult<CustomerRow>> {
  const parsed = updateCustomerSchema.safeParse(raw);

  if (!parsed.success) {
    return serviceError('VALIDATION', parsed.error.issues[0]?.message ?? 'Dados inválidos');
  }

  const data = parsed.data;
  const access = await authorizeStoreAction(
    actorUserId,
    data.storeId,
    PERMISSIONS.CUSTOMERS_WRITE
  );

  if (!access.ok) {
    return access;
  }

  const current = await customersRepo.findCustomerInStore(data.storeId, data.customerId);

  if (!current) {
    return serviceError('NOT_FOUND', 'Cliente não encontrado');
  }

  const patch: Parameters<typeof customersRepo.updateCustomer>[1] = {};

  if (data.name !== undefined) {
    patch.name = data.name;
  }

  if (data.phone !== undefined) {
    patch.phone = data.phone.replace(/\s+/g, '');
    patch.phoneNormalized = normalizePhone(data.phone);
  }

  if (data.email !== undefined) {
    patch.email = data.email && data.email.length > 0 ? data.email : null;
  }

  if (data.notes !== undefined) {
    patch.notes = data.notes;
  }

  if (data.dataPurpose !== undefined) {
    patch.dataPurpose = data.dataPurpose;
  }

  const updated = await customersRepo.updateCustomer(current.id, patch);

  await auditRepo.insertAuditEvent({
    storeId: data.storeId,
    actorUserId,
    action: 'customer.updated',
    entityType: 'customer',
    entityId: updated.id,
    payloadJson: JSON.stringify({ fields: Object.keys(patch) }),
  });

  return serviceSuccess(updated);
}

export async function searchCustomers(
  raw: SearchCustomersInput,
  actorUserId: string
): Promise<
  ServiceResult<{
    items: CustomerRow[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }>
> {
  const parsed = searchCustomersSchema.safeParse(raw);

  if (!parsed.success) {
    return serviceError('VALIDATION', parsed.error.issues[0]?.message ?? 'Dados inválidos');
  }

  const data = parsed.data;
  const access = await authorizeStoreAction(
    actorUserId,
    data.storeId,
    PERMISSIONS.CUSTOMERS_READ
  );

  if (!access.ok) {
    return access;
  }

  const result = await customersRepo.searchCustomersInStore(data);
  const totalPages = Math.max(1, Math.ceil(result.total / data.pageSize));

  return serviceSuccess({
    items: result.items,
    total: result.total,
    page: data.page,
    pageSize: data.pageSize,
    totalPages,
  });
}

export async function getCustomerDetail(
  storeId: string,
  customerId: string,
  actorUserId: string
): Promise<
  ServiceResult<{
    customer: CustomerRow;
    opportunities: Awaited<ReturnType<typeof opportunitiesRepo.listOpportunitiesByCustomer>>;
    possibleDuplicates: CustomerDuplicateHint[];
  }>
> {
  const access = await authorizeStoreAction(actorUserId, storeId, PERMISSIONS.CUSTOMERS_READ);

  if (!access.ok) {
    return access;
  }

  const customer = await customersRepo.findCustomerInStore(storeId, customerId);

  if (!customer) {
    return serviceError('NOT_FOUND', 'Cliente não encontrado');
  }

  const [opportunities, phonePeers] = await Promise.all([
    opportunitiesRepo.listOpportunitiesByCustomer(storeId, customerId),
    customersRepo.findCustomersByPhoneInStore(storeId, customer.phoneNormalized, customerId),
  ]);

  return serviceSuccess({
    customer,
    opportunities,
    possibleDuplicates: phonePeers.map((d) => ({
      id: d.id,
      name: d.name,
      phone: d.phone,
    })),
  });
}

export async function findDuplicateHints(
  storeId: string,
  phone: string,
  actorUserId: string,
  excludeId?: string
): Promise<ServiceResult<CustomerDuplicateHint[]>> {
  const access = await authorizeStoreAction(actorUserId, storeId, PERMISSIONS.CUSTOMERS_READ);

  if (!access.ok) {
    return access;
  }

  const peers = await customersRepo.findCustomersByPhoneInStore(
    storeId,
    normalizePhone(phone),
    excludeId
  );

  return serviceSuccess(peers.map((d) => ({ id: d.id, name: d.name, phone: d.phone })));
}
