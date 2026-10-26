import * as auditRepo from '@server/repositories/audit-events.repository';
import * as storefrontRepo from '@server/repositories/storefront-settings.repository';
import * as storesRepo from '@server/repositories/stores.repository';
import { serviceError, serviceSuccess, type ServiceResult } from '@server/shared/service-result';
import type { StoreRow } from '@lib/db';

import { createStoreSchema, type CreateStoreInput } from './stores.validators';

function boolToText(value: boolean): string {
  return value ? 'true' : 'false';
}

export async function createStore(raw: CreateStoreInput): Promise<ServiceResult<StoreRow>> {
  const parsed = createStoreSchema.safeParse(raw);

  if (!parsed.success) {
    return serviceError('VALIDATION', parsed.error.issues[0]?.message ?? 'Dados inválidos');
  }

  const data = parsed.data;

  const existingSlug = await storesRepo.findStoreBySlug(data.slug);

  if (existingSlug) {
    return serviceError('CONFLICT', 'Slug de loja já em uso');
  }

  if (data.subdomain) {
    const existingSub = await storesRepo.findStoreBySubdomain(data.subdomain);

    if (existingSub) {
      return serviceError('CONFLICT', 'Subdomínio já em uso');
    }
  }

  const store = await storesRepo.insertStore({
    legalName: data.legalName,
    tradeName: data.tradeName,
    publicName: data.publicName,
    slug: data.slug,
    subdomain: data.subdomain ?? null,
    document: data.document ?? null,
    email: data.email ?? null,
    phone: data.phone ?? null,
    city: data.city,
    state: data.state.toUpperCase(),
    neighborhood: data.neighborhood ?? null,
    status: data.status,
    verified: boolToText(data.verified),
    subscriptionStatus: 'none',
  });

  await storefrontRepo.upsertStorefrontSettings({
    storeId: store.id,
    contactEmail: data.email ?? null,
    contactPhone: data.phone ?? null,
  });

  await auditRepo.insertAuditEvent({
    storeId: store.id,
    actorUserId: null,
    action: 'store.created',
    entityType: 'store',
    entityId: store.id,
    payloadJson: JSON.stringify({ slug: store.slug }),
  });

  return serviceSuccess(store);
}

export async function getStoreBySlug(slug: string): Promise<ServiceResult<StoreRow>> {
  const store = await storesRepo.findStoreBySlug(slug);

  if (!store) {
    return serviceError('NOT_FOUND', 'Loja não encontrada');
  }

  return serviceSuccess(store);
}
