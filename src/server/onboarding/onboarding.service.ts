import { STORE_ROLES } from '@app-types/membership';
import { PERMISSIONS } from '@app-types/permissions';
import { STORE_STATUS } from '@app-types/status';
import { SUBSCRIPTION_STATUS } from '@app-types/subscription';
import type { StorefrontSettingsRow, StoreRow } from '@lib/db';
import { nowIso } from '@lib/db';
import { authorizeStoreAction, requireSession } from '@server/auth/access';
import { requirePlatformAdmin } from '@server/auth/platform-admin';
import * as auditRepo from '@server/repositories/audit-events.repository';
import * as membershipsRepo from '@server/repositories/store-memberships.repository';
import * as storefrontRepo from '@server/repositories/storefront-settings.repository';
import * as storesRepo from '@server/repositories/stores.repository';
import { serviceError, serviceSuccess, type ServiceResult } from '@server/shared/service-result';
import { addStoreMember } from '@server/users/users.service';

import {
  reviewApplicationSchema,
  storeApplicationSchema,
  storefrontDraftSaveSchema,
  storefrontDraftSchema,
  storefrontSetupSchema,
  storefrontStoreIdSchema,
  type ReviewApplicationInput,
  type StoreApplicationInput,
  type StorefrontDraftPayload,
  type StorefrontDraftSaveInput,
  type StorefrontSetupInput,
} from './onboarding.validators';

function boolToText(value: boolean): string {
  return value ? 'true' : 'false';
}

export async function submitStoreApplication(
  raw: StoreApplicationInput,
  actorUserId?: string
): Promise<ServiceResult<StoreRow>> {
  const parsed = storeApplicationSchema.safeParse(raw);

  if (!parsed.success) {
    return serviceError('VALIDATION', parsed.error.issues[0]?.message ?? 'Dados inválidos');
  }

  let userId = actorUserId;

  if (!userId) {
    const session = await requireSession();

    if (!session.ok) {
      return session;
    }

    userId = session.data.userId;
  }

  const data = parsed.data;
  const existingDoc = await storesRepo.findStoreByDocument(data.document);

  if (existingDoc && existingDoc.status !== STORE_STATUS.REJECTED) {
    return serviceError('CONFLICT', 'Já existe uma empresa cadastrada com este CNPJ');
  }

  if (existingDoc && existingDoc.status === STORE_STATUS.REJECTED) {
    const memberships = await membershipsRepo.listActiveMembershipsByUser(userId);
    const ownsRejected = memberships.some((m) => m.storeId === existingDoc.id);

    if (!ownsRejected) {
      return serviceError('CONFLICT', 'Já existe uma empresa cadastrada com este CNPJ');
    }

    const updated = await storesRepo.updateStore(existingDoc.id, {
      legalName: data.legalName,
      tradeName: data.tradeName,
      publicName: data.publicName,
      slug: data.slug,
      subdomain: data.subdomain,
      email: data.email.toLowerCase(),
      phone: data.phone,
      whatsapp: data.whatsapp,
      street: data.street,
      addressNumber: data.addressNumber,
      complement: data.complement ?? null,
      zipCode: data.zipCode,
      city: data.city,
      state: data.state,
      neighborhood: data.neighborhood,
      institutionalInfo: data.institutionalInfo,
      responsibleName: data.responsibleName,
      responsibleEmail: data.responsibleEmail.toLowerCase(),
      responsiblePhone: data.responsiblePhone,
      status: STORE_STATUS.PENDING,
      verified: boolToText(false),
      rejectionReason: null,
      reviewedAt: null,
      reviewedByUserId: null,
    });

    await auditRepo.insertAuditEvent({
      storeId: updated.id,
      actorUserId: userId,
      action: 'store.application_resubmitted',
      entityType: 'store',
      entityId: updated.id,
      payloadJson: JSON.stringify({ slug: updated.slug }),
    });

    return serviceSuccess(updated);
  }

  const existingSlug = await storesRepo.findStoreBySlug(data.slug);

  if (existingSlug) {
    return serviceError('CONFLICT', 'Slug já em uso');
  }

  const existingSub = await storesRepo.findStoreBySubdomain(data.subdomain);

  if (existingSub) {
    return serviceError('CONFLICT', 'Subdomínio já em uso');
  }

  const activeMemberships = await membershipsRepo.listActiveMembershipsByUser(userId);

  for (const m of activeMemberships) {
    const store = await storesRepo.findStoreById(m.storeId);

    if (store && (store.status === STORE_STATUS.PENDING || store.status === STORE_STATUS.ACTIVE)) {
      return serviceError(
        'CONFLICT',
        'Você já possui uma solicitação ou loja ativa. Acompanhe o status no painel.'
      );
    }
  }

  const store = await storesRepo.insertStore({
    legalName: data.legalName,
    tradeName: data.tradeName,
    publicName: data.publicName,
    slug: data.slug,
    subdomain: data.subdomain,
    document: data.document,
    email: data.email.toLowerCase(),
    phone: data.phone,
    whatsapp: data.whatsapp,
    street: data.street,
    addressNumber: data.addressNumber,
    complement: data.complement ?? null,
    zipCode: data.zipCode,
    city: data.city,
    state: data.state,
    neighborhood: data.neighborhood,
    institutionalInfo: data.institutionalInfo,
    responsibleName: data.responsibleName,
    responsibleEmail: data.responsibleEmail.toLowerCase(),
    responsiblePhone: data.responsiblePhone,
    status: STORE_STATUS.PENDING,
    verified: boolToText(false),
    subscriptionStatus: SUBSCRIPTION_STATUS.NONE,
    rejectionReason: null,
    reviewedAt: null,
    reviewedByUserId: null,
  });

  const membership = await addStoreMember({
    storeId: store.id,
    userId,
    role: STORE_ROLES.OWNER,
    permissions: ['*'],
  });

  if (!membership.ok) {
    return membership;
  }

  await storefrontRepo.upsertStorefrontSettings({
    storeId: store.id,
    about: data.institutionalInfo,
    contactEmail: data.email.toLowerCase(),
    contactPhone: data.phone,
    whatsappNumber: data.whatsapp,
    tagline: data.tradeName,
  });

  await auditRepo.insertAuditEvent({
    storeId: store.id,
    actorUserId: userId,
    action: 'store.application_submitted',
    entityType: 'store',
    entityId: store.id,
    payloadJson: JSON.stringify({ slug: store.slug, document: store.document }),
  });

  return serviceSuccess(store);
}

export async function reviewStoreApplication(
  raw: ReviewApplicationInput,
  actorUserId?: string
): Promise<ServiceResult<StoreRow>> {
  const parsed = reviewApplicationSchema.safeParse(raw);

  if (!parsed.success) {
    return serviceError('VALIDATION', parsed.error.issues[0]?.message ?? 'Dados inválidos');
  }

  let adminId = actorUserId;

  if (!adminId) {
    const admin = await requirePlatformAdmin();

    if (!admin.ok) {
      return admin;
    }

    adminId = admin.data.userId;
  }

  if (parsed.data.decision === 'reject' && !parsed.data.rejectionReason) {
    return serviceError('VALIDATION', 'Informe o motivo da rejeição');
  }

  const store = await storesRepo.findStoreById(parsed.data.storeId);

  if (!store) {
    return serviceError('NOT_FOUND', 'Solicitação não encontrada');
  }

  if (store.status !== STORE_STATUS.PENDING) {
    return serviceError('CONFLICT', 'Solicitação já foi analisada');
  }

  const stamp = nowIso();

  if (parsed.data.decision === 'approve') {
    const updated = await storesRepo.updateStore(store.id, {
      status: STORE_STATUS.ACTIVE,
      verified: boolToText(true),
      rejectionReason: null,
      reviewedAt: stamp,
      reviewedByUserId: adminId,
      subscriptionStatus: store.subscriptionStatus || SUBSCRIPTION_STATUS.NONE,
    });

    await auditRepo.insertAuditEvent({
      storeId: store.id,
      actorUserId: adminId,
      action: 'store.application_approved',
      entityType: 'store',
      entityId: store.id,
      payloadJson: JSON.stringify({ previousStatus: store.status }),
    });

    return serviceSuccess(updated);
  }

  const updated = await storesRepo.updateStore(store.id, {
    status: STORE_STATUS.REJECTED,
    verified: boolToText(false),
    rejectionReason: parsed.data.rejectionReason ?? null,
    reviewedAt: stamp,
    reviewedByUserId: adminId,
  });

  await auditRepo.insertAuditEvent({
    storeId: store.id,
    actorUserId: adminId,
    action: 'store.application_rejected',
    entityType: 'store',
    entityId: store.id,
    payloadJson: JSON.stringify({ reason: parsed.data.rejectionReason }),
  });

  return serviceSuccess(updated);
}

export async function suspendStore(
  storeId: string,
  reason: string,
  actorUserId?: string
): Promise<ServiceResult<StoreRow>> {
  let adminId = actorUserId;

  if (!adminId) {
    const admin = await requirePlatformAdmin();

    if (!admin.ok) {
      return admin;
    }

    adminId = admin.data.userId;
  }

  const store = await storesRepo.findStoreById(storeId);

  if (!store) {
    return serviceError('NOT_FOUND', 'Loja não encontrada');
  }

  const updated = await storesRepo.updateStore(storeId, {
    status: STORE_STATUS.SUSPENDED,
    rejectionReason: reason,
    reviewedAt: nowIso(),
    reviewedByUserId: adminId,
  });

  await auditRepo.insertAuditEvent({
    storeId,
    actorUserId: adminId,
    action: 'store.suspended',
    entityType: 'store',
    entityId: storeId,
    payloadJson: JSON.stringify({ reason }),
  });

  const { suspendListingsForStore } = await import('@server/listings/listings.service');
  await suspendListingsForStore(storeId, adminId);

  return serviceSuccess(updated);
}

export async function updateStorefrontSetup(
  raw: StorefrontSetupInput,
  actorUserId?: string
): Promise<ServiceResult<{ store: StoreRow; storefront: StorefrontSettingsRow }>> {
  const parsed = storefrontSetupSchema.safeParse(raw);

  if (!parsed.success) {
    return serviceError('VALIDATION', parsed.error.issues[0]?.message ?? 'Dados inválidos');
  }

  let userId = actorUserId;

  if (!userId) {
    const session = await requireSession();

    if (!session.ok) {
      return session;
    }

    userId = session.data.userId;
  }

  const access = await authorizeStoreAction(
    userId,
    parsed.data.storeId,
    PERMISSIONS.STOREFRONT_WRITE
  );

  if (!access.ok) {
    return access;
  }

  const store = access.data.store;

  if (store.status !== STORE_STATUS.ACTIVE) {
    return serviceError('FORBIDDEN', 'Configure a vitrine após a aprovação do cadastro');
  }

  const data = parsed.data;

  if (data.slug !== store.slug) {
    const clash = await storesRepo.findStoreBySlug(data.slug);

    if (clash && clash.id !== store.id) {
      return serviceError('CONFLICT', 'Slug já em uso');
    }
  }

  if (data.subdomain && data.subdomain !== store.subdomain) {
    const clash = await storesRepo.findStoreBySubdomain(data.subdomain);

    if (clash && clash.id !== store.id) {
      return serviceError('CONFLICT', 'Subdomínio já em uso');
    }
  }

  if (data.slug !== store.slug) {
    const slugRedirectsRepo = await import('@server/repositories/store-slug-redirects.repository');
    await slugRedirectsRepo.insertSlugRedirect(store.id, store.slug);
  }

  const updatedStore = await storesRepo.updateStore(store.id, {
    publicName: data.publicName,
    slug: data.slug,
    subdomain: data.subdomain,
  });

  const emptyToNull = (v: string | null | undefined) => (!v ? null : v);

  const storefront = await storefrontRepo.upsertStorefrontSettings({
    storeId: store.id,
    logoUrl: emptyToNull(data.logoUrl),
    coverImageUrl: emptyToNull(data.coverImageUrl),
    primaryColor: data.primaryColor,
    heroVariant: data.heroVariant,
    coverFocus: data.coverFocus,
    tagline: emptyToNull(data.tagline),
    about: emptyToNull(data.about),
    businessHoursJson: data.businessHoursJson,
    socialInstagram: emptyToNull(data.socialInstagram),
    socialFacebook: emptyToNull(data.socialFacebook),
    whatsappNumber: emptyToNull(data.whatsappNumber),
    contactEmail: emptyToNull(data.contactEmail),
    contactPhone: emptyToNull(data.contactPhone),
    draftJson: null,
    draftUpdatedAt: null,
  });

  await auditRepo.insertAuditEvent({
    storeId: store.id,
    actorUserId: userId,
    action: 'storefront.updated',
    entityType: 'storefront',
    entityId: storefront.id,
    payloadJson: JSON.stringify({
      publicName: data.publicName,
      slug: data.slug,
      subdomain: data.subdomain,
      primaryColor: data.primaryColor,
    }),
  });

  return serviceSuccess({ store: updatedStore, storefront });
}

export function parseStorefrontDraft(
  raw: string | null | undefined
): StorefrontDraftPayload | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = storefrontDraftSchema.safeParse(JSON.parse(raw));

    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export async function saveStorefrontDraft(
  raw: StorefrontDraftSaveInput,
  actorUserId?: string
): Promise<ServiceResult<{ draftUpdatedAt: string }>> {
  const parsed = storefrontDraftSaveSchema.safeParse(raw);

  if (!parsed.success) {
    return serviceError('VALIDATION', parsed.error.issues[0]?.message ?? 'Dados inválidos');
  }

  let userId = actorUserId;

  if (!userId) {
    const session = await requireSession();

    if (!session.ok) {
      return session;
    }

    userId = session.data.userId;
  }

  const access = await authorizeStoreAction(
    userId,
    parsed.data.storeId,
    PERMISSIONS.STOREFRONT_WRITE
  );

  if (!access.ok) {
    return access;
  }

  if (access.data.store.status !== STORE_STATUS.ACTIVE) {
    return serviceError('FORBIDDEN', 'Configure a vitrine após a aprovação do cadastro');
  }

  const stamp = nowIso();
  const existing = await storefrontRepo.findStorefrontByStoreId(parsed.data.storeId);

  await storefrontRepo.upsertStorefrontSettings({
    storeId: parsed.data.storeId,
    logoUrl: existing?.logoUrl ?? null,
    coverImageUrl: existing?.coverImageUrl ?? null,
    primaryColor: existing?.primaryColor ?? null,
    heroVariant: existing?.heroVariant ?? 'integrated',
    coverFocus: existing?.coverFocus ?? 'center',
    tagline: existing?.tagline ?? null,
    about: existing?.about ?? null,
    businessHoursJson: existing?.businessHoursJson ?? '[]',
    socialInstagram: existing?.socialInstagram ?? null,
    socialFacebook: existing?.socialFacebook ?? null,
    whatsappNumber: existing?.whatsappNumber ?? null,
    contactEmail: existing?.contactEmail ?? null,
    contactPhone: existing?.contactPhone ?? null,
    draftJson: JSON.stringify(parsed.data.draft),
    draftUpdatedAt: stamp,
  });

  await auditRepo.insertAuditEvent({
    storeId: parsed.data.storeId,
    actorUserId: userId,
    action: 'storefront.draft_saved',
    entityType: 'storefront',
    entityId: parsed.data.storeId,
    payloadJson: JSON.stringify({ draftUpdatedAt: stamp }),
  });

  return serviceSuccess({ draftUpdatedAt: stamp });
}

export async function discardStorefrontDraft(
  raw: { storeId: string },
  actorUserId?: string
): Promise<ServiceResult<{ cleared: true }>> {
  const parsed = storefrontStoreIdSchema.safeParse(raw);

  if (!parsed.success) {
    return serviceError('VALIDATION', parsed.error.issues[0]?.message ?? 'Dados inválidos');
  }

  let userId = actorUserId;

  if (!userId) {
    const session = await requireSession();

    if (!session.ok) {
      return session;
    }

    userId = session.data.userId;
  }

  const access = await authorizeStoreAction(
    userId,
    parsed.data.storeId,
    PERMISSIONS.STOREFRONT_WRITE
  );

  if (!access.ok) {
    return access;
  }

  const existing = await storefrontRepo.findStorefrontByStoreId(parsed.data.storeId);

  if (!existing) {
    return serviceSuccess({ cleared: true });
  }

  await storefrontRepo.upsertStorefrontSettings({
    storeId: parsed.data.storeId,
    logoUrl: existing.logoUrl,
    coverImageUrl: existing.coverImageUrl,
    primaryColor: existing.primaryColor,
    heroVariant: existing.heroVariant,
    coverFocus: existing.coverFocus,
    tagline: existing.tagline,
    about: existing.about,
    businessHoursJson: existing.businessHoursJson,
    socialInstagram: existing.socialInstagram,
    socialFacebook: existing.socialFacebook,
    whatsappNumber: existing.whatsappNumber,
    contactEmail: existing.contactEmail,
    contactPhone: existing.contactPhone,
    draftJson: null,
    draftUpdatedAt: null,
  });

  await auditRepo.insertAuditEvent({
    storeId: parsed.data.storeId,
    actorUserId: userId,
    action: 'storefront.draft_discarded',
    entityType: 'storefront',
    entityId: existing.id,
    payloadJson: '{}',
  });

  return serviceSuccess({ cleared: true });
}

export async function listPendingApplications(
  actorUserId?: string
): Promise<ServiceResult<StoreRow[]>> {
  if (!actorUserId) {
    const admin = await requirePlatformAdmin();

    if (!admin.ok) {
      return admin;
    }
  }

  const list = await storesRepo.listStoresByStatus(STORE_STATUS.PENDING);

  return serviceSuccess(list);
}

export async function getStoreApplicationForUser(
  userId: string
): Promise<ServiceResult<StoreRow | null>> {
  const memberships = await membershipsRepo.listActiveMembershipsByUser(userId);

  if (memberships.length === 0) {
    return serviceSuccess(null);
  }

  for (const m of memberships) {
    if (m.role !== STORE_ROLES.OWNER) {
      continue;
    }

    const store = await storesRepo.findStoreById(m.storeId);

    if (store) {
      return serviceSuccess(store);
    }
  }

  const first = await storesRepo.findStoreById(memberships[0]!.storeId);

  return serviceSuccess(first ?? null);
}
