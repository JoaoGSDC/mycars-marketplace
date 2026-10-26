import type { CatalogMake } from '@fixtures/catalog';
import type { FixtureMarketStats } from '@fixtures/market-stats';
import type { PublicBodyType, StoreProfile, VehicleListing } from '@app-types/vehicle';
import type { VehicleSearchBody, VehicleSearchCondition } from '@utils/vehicle-search-params';

/**
 * Catálogo público do marketplace.
 * Dados persistidos (Turso) via `@server/catalog/public-catalog.service`.
 * Somente anúncios elegíveis (`isPubliclyListable` / SQL de elegibilidade).
 */

export type CategoryCount = {
  body: PublicBodyType;
  label: string;
  count: number;
  searchValue: VehicleSearchBody;
};

export async function getCatalog(): Promise<CatalogMake[]> {
  const { getPublicCatalogMakes } = await import('@server/catalog/public-catalog.service');

  return getPublicCatalogMakes();
}

export async function getLatestVehicles(
  condicao?: VehicleSearchCondition | 'all',
  limit = 6
): Promise<VehicleListing[]> {
  const { getLatestPublicVehicles } = await import('@server/catalog/public-catalog.service');

  return getLatestPublicVehicles(condicao, limit);
}

export async function getCategoryCountsWithSearch(): Promise<CategoryCount[]> {
  const { getPublicCategoryCounts } = await import('@server/catalog/public-catalog.service');

  return getPublicCategoryCounts();
}

/** Alias estável para listagens futuras. */
export const getCategoryCounts = getCategoryCountsWithSearch;

export async function getVerifiedStores(): Promise<StoreProfile[]> {
  const { getPublicVerifiedStores } = await import('@server/catalog/public-catalog.service');

  return getPublicVerifiedStores();
}

export async function searchStores(params: import('@utils/store-directory-params').StoreDirectoryParams) {
  const { searchPublicStores } = await import('@server/catalog/public-catalog.service');

  return searchPublicStores(params);
}

export async function getStoreCityOptions(): Promise<Array<{ value: string; label: string }>> {
  const { getPublicStoreCityOptions } = await import('@server/catalog/public-catalog.service');

  return getPublicStoreCityOptions();
}

export async function getMarketStats(): Promise<FixtureMarketStats> {
  const { getPublicMarketStats } = await import('@server/catalog/public-catalog.service');

  return getPublicMarketStats();
}

export async function getVehicleBySlug(slug: string): Promise<VehicleListing | undefined> {
  const { getPublicVehicleBySlug } = await import('@server/catalog/public-catalog.service');

  return getPublicVehicleBySlug(slug);
}

export async function getVehicleDetail(slug: string) {
  const { getPublicVehicleDetail } = await import('@server/catalog/public-detail.service');

  return getPublicVehicleDetail(slug);
}

export async function getPublicVehiclesByStoreSlug(storeSlug: string): Promise<VehicleListing[]> {
  const { getPublicVehiclesByStoreSlug: load } = await import(
    '@server/catalog/public-catalog.service'
  );

  return load(storeSlug);
}

export async function getCityOptions(): Promise<Array<{ value: string; label: string }>> {
  const { getPublicCityOptions } = await import('@server/catalog/public-catalog.service');

  return getPublicCityOptions();
}

export async function getStoreBySlug(slug: string): Promise<StoreProfile | undefined> {
  const { getPublicStoreBySlug } = await import('@server/catalog/public-catalog.service');

  return getPublicStoreBySlug(slug);
}
