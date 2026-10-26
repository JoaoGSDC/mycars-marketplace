import type { PublicStorefront } from '@app-types/vehicle';
import type { VehicleSearchParams } from '@utils/vehicle-search-params';
import type { VehicleSearchResult } from './vehicle-search.services';

export async function getStorefrontBySlug(
  slug: string,
  mode: 'path' | 'subdomain' = 'path'
): Promise<PublicStorefront | undefined> {
  const { getPublicStorefrontBySlug } = await import('@server/storefront/public-storefront.service');

  return getPublicStorefrontBySlug(slug, mode);
}

export async function getStorefrontBySubdomain(
  subdomain: string
): Promise<PublicStorefront | undefined> {
  const { getPublicStorefrontBySubdomain } = await import(
    '@server/storefront/public-storefront.service'
  );

  return getPublicStorefrontBySubdomain(subdomain);
}

export async function resolveSlugRedirect(oldSlug: string): Promise<string | undefined> {
  const { resolveSlugRedirect: resolve } = await import(
    '@server/storefront/public-storefront.service'
  );

  return resolve(oldSlug);
}

export async function searchStoreVehicles(
  storeId: string,
  params: VehicleSearchParams,
  pageSize?: number
): Promise<VehicleSearchResult> {
  const { searchStorefrontVehicles } = await import('@server/storefront/public-storefront.service');

  return searchStorefrontVehicles(storeId, params, pageSize);
}

export async function resolveFromRequest(
  previewStoreId?: string,
  options?: { useDraft?: boolean }
) {
  const { resolveStorefrontFromRequest } = await import(
    '@server/storefront/public-storefront.service'
  );

  return resolveStorefrontFromRequest({
    previewStoreId,
    useDraft: options?.useDraft,
  });
}
