import { and, count, eq } from 'drizzle-orm';
import { unstable_cache } from 'next/cache';
import { headers } from 'next/headers';

import { STORE_STATUS } from '@app-types/status';
import type { PublicStorefront, StoreProfile } from '@app-types/vehicle';
import {
  STOREFRONT_RESOLVED_HEADER,
  STOREFRONT_SUBDOMAIN_HEADER,
  getRootDomain,
  getSiteOrigin,
} from '@config/site';
import { getDb, listings, stores, storefrontSettings, vehicles } from '@lib/db';
import {
  PAGE_SIZE,
  PUBLIC_CATALOG_CACHE_TAG,
  searchPublicVehicles,
  searchPublicVehiclesUncached,
  type VehicleSearchResult,
} from '@server/catalog/public-catalog.service';
import { publicEligibilitySql } from '@server/catalog/public-search.repository';
import { storefrontDraftSchema } from '@server/onboarding/onboarding.validators';
import * as storesRepo from '@server/repositories/stores.repository';
import * as slugRedirectsRepo from '@server/repositories/store-slug-redirects.repository';
import { buildStorefrontOrigin } from '@utils/tenant-host';
import type { VehicleSearchParams } from '@utils/vehicle-search-params';

function parseBusinessHours(raw: string | null | undefined) {
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function buildCanonicalAndBase(
  store: { slug: string; subdomain: string | null },
  mode: 'path' | 'subdomain'
): { canonicalUrl: string; basePath: string } {
  const root = getRootDomain();
  const siteOrigin = getSiteOrigin();

  if (store.subdomain && mode === 'subdomain') {
    return {
      canonicalUrl: `${buildStorefrontOrigin(store.subdomain, root)}/`,
      basePath: '',
    };
  }

  if (store.subdomain) {
    return {
      canonicalUrl: `${buildStorefrontOrigin(store.subdomain, root)}/`,
      basePath: `/lojas/${store.slug}`,
    };
  }

  return {
    canonicalUrl: `${siteOrigin}/lojas/${store.slug}`,
    basePath: `/lojas/${store.slug}`,
  };
}

export async function mapStoreToPublicStorefront(
  storeId: string,
  mode: 'path' | 'subdomain',
  options?: { useDraft?: boolean }
): Promise<PublicStorefront | undefined> {
  const db = getDb();
  const [store] = await db.select().from(stores).where(eq(stores.id, storeId)).limit(1);

  if (!store || store.status !== STORE_STATUS.ACTIVE) {
    return undefined;
  }

  const [settings] = await db
    .select()
    .from(storefrontSettings)
    .where(eq(storefrontSettings.storeId, store.id))
    .limit(1);

  const [countRow] = await db
    .select({ value: count() })
    .from(listings)
    .innerJoin(vehicles, eq(listings.vehicleId, vehicles.id))
    .innerJoin(stores, eq(listings.storeId, stores.id))
    .where(and(eq(listings.storeId, store.id), publicEligibilitySql()));

  let draft: ReturnType<typeof parseDraftPayload> = null;

  if (options?.useDraft && settings?.draftJson) {
    draft = parseDraftPayload(settings.draftJson);
  }

  const slug = draft?.slug ?? store.slug;
  const subdomain = draft?.subdomain ?? store.subdomain;
  const urls = buildCanonicalAndBase({ slug, subdomain }, mode);

  return {
    id: store.id,
    slug,
    name: draft?.publicName ?? store.publicName,
    city: store.city,
    state: store.state,
    neighborhood: store.neighborhood ?? undefined,
    storeStatus: store.status as StoreProfile['storeStatus'],
    vehicleCount: countRow?.value ?? 0,
    verified: store.verified === 'true',
    subdomain,
    logoUrl: (draft?.logoUrl || settings?.logoUrl) ?? undefined,
    coverImageUrl: (draft?.coverImageUrl || settings?.coverImageUrl) ?? undefined,
    tagline: (draft?.tagline ?? settings?.tagline) ?? undefined,
    about: (draft?.about ?? settings?.about) ?? undefined,
    primaryColor: draft?.primaryColor ?? settings?.primaryColor ?? undefined,
    heroVariant:
      draft?.heroVariant === 'split' || draft?.heroVariant === 'integrated'
        ? draft.heroVariant
        : settings?.heroVariant === 'split' || settings?.heroVariant === 'integrated'
          ? settings.heroVariant
          : 'integrated',
    coverFocus:
      draft?.coverFocus === 'top' ||
      draft?.coverFocus === 'bottom' ||
      draft?.coverFocus === 'center'
        ? draft.coverFocus
        : settings?.coverFocus === 'top' ||
            settings?.coverFocus === 'bottom' ||
            settings?.coverFocus === 'center'
          ? settings.coverFocus
          : 'center',
    whatsappNumber:
      (draft?.whatsappNumber || settings?.whatsappNumber || store.whatsapp) ?? undefined,
    contactPhone:
      (draft?.contactPhone || settings?.contactPhone || store.phone) ?? undefined,
    contactEmail:
      (draft?.contactEmail || settings?.contactEmail || store.email) ?? undefined,
    socialInstagram:
      (draft?.socialInstagram ?? settings?.socialInstagram) ?? undefined,
    socialFacebook: (draft?.socialFacebook ?? settings?.socialFacebook) ?? undefined,
    businessHours: parseBusinessHours(
      draft?.businessHoursJson ?? settings?.businessHoursJson
    ),
    street: store.street ?? undefined,
    addressNumber: store.addressNumber ?? undefined,
    zipCode: store.zipCode ?? undefined,
    canonicalUrl: urls.canonicalUrl,
    basePath: urls.basePath,
  };
}

function parseDraftPayload(raw: string) {
  try {
    const parsed = storefrontDraftSchema.safeParse(JSON.parse(raw));

    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export async function getPublicStorefrontBySlug(
  slug: string,
  mode: 'path' | 'subdomain' = 'path'
): Promise<PublicStorefront | undefined> {
  return unstable_cache(
    async () => {
      const store = await storesRepo.findStoreBySlug(slug);

      if (!store) {
        return undefined;
      }

      return mapStoreToPublicStorefront(store.id, mode);
    },
    ['public-storefront-slug', slug, mode],
    { revalidate: 60, tags: [PUBLIC_CATALOG_CACHE_TAG] }
  )();
}

export async function getPublicStorefrontBySubdomain(
  subdomain: string
): Promise<PublicStorefront | undefined> {
  return unstable_cache(
    async () => {
      const store = await storesRepo.findStoreBySubdomain(subdomain);

      if (!store) {
        return undefined;
      }

      return mapStoreToPublicStorefront(store.id, 'subdomain');
    },
    ['public-storefront-sub', subdomain],
    { revalidate: 60, tags: [PUBLIC_CATALOG_CACHE_TAG] }
  )();
}

export async function resolveSlugRedirect(oldSlug: string): Promise<string | undefined> {
  const redirect = await slugRedirectsRepo.findRedirectByOldSlug(oldSlug);

  if (!redirect) {
    return undefined;
  }

  const store = await storesRepo.findStoreById(redirect.storeId);

  return store?.slug;
}

export async function searchStorefrontVehicles(
  storeId: string,
  params: VehicleSearchParams,
  pageSize = PAGE_SIZE
): Promise<VehicleSearchResult> {
  return searchPublicVehicles(params, { storeId, pageSize });
}

export async function searchStorefrontVehiclesUncached(
  storeId: string,
  params: VehicleSearchParams,
  pageSize = PAGE_SIZE
): Promise<VehicleSearchResult> {
  return searchPublicVehiclesUncached(params, { storeId, pageSize });
}

/**
 * Resolve a vitrine a partir do request atual.
 * - Header do proxy (subdomínio) tem prioridade.
 * - Sem header: preview autenticado usa storeId explícito.
 */
export async function resolveStorefrontFromRequest(options?: {
  previewStoreId?: string;
  /** Só para preview autenticado — nunca em subdomínio público. */
  useDraft?: boolean;
}): Promise<
  | { mode: 'subdomain'; storefront: PublicStorefront }
  | { mode: 'preview'; storefront: PublicStorefront }
  | { mode: 'missing_subdomain'; subdomain: string }
  | { mode: 'none' }
> {
  const headerStore = await headers();
  const resolved = headerStore.get(STOREFRONT_RESOLVED_HEADER);
  const subdomain = headerStore.get(STOREFRONT_SUBDOMAIN_HEADER);

  if (resolved === '1' && subdomain) {
    const storefront = await getPublicStorefrontBySubdomain(subdomain);

    if (!storefront) {
      return { mode: 'missing_subdomain', subdomain };
    }

    return { mode: 'subdomain', storefront };
  }

  if (options?.previewStoreId) {
    const storefront = await mapStoreToPublicStorefront(options.previewStoreId, 'path', {
      useDraft: options.useDraft === true,
    });

    if (!storefront) {
      return { mode: 'none' };
    }

    return { mode: 'preview', storefront };
  }

  return { mode: 'none' };
}
