import { and, count, eq, inArray, like, or, sql, type SQL } from 'drizzle-orm';
import { unstable_cache } from 'next/cache';

import { STORE_STATUS } from '@app-types/status';
import type { PublicBodyType, StoreProfile, VehicleListing } from '@app-types/vehicle';
import type { CatalogMake } from '@fixtures/catalog';
import type { FixtureMarketStats } from '@fixtures/market-stats';
import { getDb, listings, stores, vehicles } from '@lib/db';
import { isPubliclyListable } from '@lib/catalog/is-publicly-listable';
import { mapListingBundleToVehicleListing } from '@server/listings/listing-mapper';
import { storeLocationSlug } from '@utils/slug';
import {
  STORE_DIRECTORY_PAGE_SIZE,
  type StoreDirectoryParams,
  type StoreDirectorySort,
} from '@utils/store-directory-params';
import type {
  VehicleSearchBody,
  VehicleSearchCondition,
  VehicleSearchParams,
} from '@utils/vehicle-search-params';

import * as repo from './public-search.repository';

export const PUBLIC_CATALOG_CACHE_TAG = 'public-catalog';
export const PAGE_SIZE = 12;
const HISTOGRAM_BINS = 24;

export type MakeFacet = {
  slug: string;
  name: string;
  count: number;
  models: { slug: string; name: string; count: number }[];
};

export type VehicleSearchResult = {
  items: VehicleListing[];
  total: number;
  pagina: number;
  totalPaginas: number;
  facets: {
    priceHistogram: number[];
    mileageHistogram: number[];
    priceMin: number;
    priceMax: number;
    mileageMin: number;
    mileageMax: number;
    yearMin: number;
    yearMax: number;
    makes: MakeFacet[];
  };
};

export type CategoryCount = {
  body: PublicBodyType;
  label: string;
  count: number;
  searchValue: VehicleSearchBody;
};

const BODY_META: Record<PublicBodyType, { label: string; searchValue: VehicleSearchBody }> = {
  hatch: { label: 'Hatch', searchValue: 'hatch' },
  sedan: { label: 'Sedã', searchValue: 'sedan' },
  suv: { label: 'SUV', searchValue: 'suv' },
  pickup: { label: 'Picape', searchValue: 'picape' },
  utility: { label: 'Utilitário', searchValue: 'utilitario' },
};

const CONDITION_DB: Record<VehicleSearchCondition, string> = {
  novo: 'new',
  seminovo: 'seminew',
  usado: 'used',
};

function minMax(values: number[]): { min: number; max: number } {
  if (values.length === 0) {
    return { min: 0, max: 0 };
  }

  return { min: Math.min(...values), max: Math.max(...values) };
}

function buildHistogramCounts(values: number[], min: number, max: number): number[] {
  const bins = Array.from({ length: HISTOGRAM_BINS }, () => 0);

  if (values.length === 0) {
    return bins;
  }

  if (min === max) {
    bins[0] = values.length;

    return bins;
  }

  const width = (max - min) / HISTOGRAM_BINS;

  for (const value of values) {
    let index = Math.floor((value - min) / width);

    if (index >= HISTOGRAM_BINS) {
      index = HISTOGRAM_BINS - 1;
    }

    if (index < 0) {
      index = 0;
    }

    bins[index] += 1;
  }

  return bins;
}

async function mapRowsToListings(rows: repo.PublicListingJoinRow[]): Promise<VehicleListing[]> {
  const mediaMap = await repo.selectPrimaryMediaForVehicles(rows.map((row) => row.vehicle.id));

  return rows
    .map((row) => {
      let media = mediaMap.get(row.vehicle.id) ?? [];

      try {
        const selected = JSON.parse(row.listing.mediaIdsJson || '[]') as string[];

        if (selected.length > 0) {
          const byId = new Map(media.map((item) => [item.id, item]));
          media = selected
            .map((id) => byId.get(id))
            .filter((item): item is NonNullable<typeof item> => Boolean(item));
        }
      } catch {
        // mantém ordem do estoque
      }

      return mapListingBundleToVehicleListing({
        listing: row.listing,
        vehicle: row.vehicle,
        store: row.store,
        media,
      });
    })
    .filter(isPubliclyListable);
}

export type SearchPublicVehiclesOptions = {
  pageSize?: number;
  storeId?: string;
};

/** Busca sem cache — usada por testes e pelo wrapper cached. */
export async function searchPublicVehiclesUncached(
  params: VehicleSearchParams,
  options: SearchPublicVehiclesOptions = {}
): Promise<VehicleSearchResult> {
  /** Lazy expiry: disponibilidade real respeita validade sem cron permanente. */
  const { expireDueReservations } = await import('@server/reservations/reservations.service');
  await expireDueReservations({
    storeId: options.storeId,
    limit: 50,
  });

  const pageSize = options.pageSize ?? PAGE_SIZE;
  const searchOpts = { storeId: options.storeId };
  const baseConditions = await repo.buildPublicSearchConditions(params, new Set(), searchOpts);
  const total = await repo.countPublicListings(baseConditions);
  const totalPaginas = Math.max(1, Math.ceil(total / pageSize));
  const pagina = Math.min(Math.max(1, params.pagina), totalPaginas);

  const pageRows = await repo.selectPublicListingPage(
    baseConditions,
    params.ordem,
    pagina,
    pageSize
  );
  const items = await mapRowsToListings(pageRows);

  const [priceConditions, mileageConditions, yearConditions, makeConditions] = await Promise.all([
    repo.buildPublicSearchConditions(params, new Set(['preco']), searchOpts),
    repo.buildPublicSearchConditions(params, new Set(['km']), searchOpts),
    repo.buildPublicSearchConditions(params, new Set(['ano']), searchOpts),
    repo.buildPublicSearchConditions(params, new Set(['marca', 'modelo']), searchOpts),
  ]);

  const [priceCents, mileageKm, yearModels, makeRows] = await Promise.all([
    repo.selectPublicPriceCents(priceConditions),
    repo.selectPublicMileageKm(mileageConditions),
    repo.selectPublicYearModels(yearConditions),
    repo.selectPublicMakeModelFacets(makeConditions),
  ]);

  const priceValues = priceCents.map((cents) => cents / 100);
  const priceBounds = minMax(priceValues);
  const mileageBounds = minMax(mileageKm);
  const yearBounds = minMax(yearModels);

  const makeMap = new Map<string, MakeFacet>();

  for (const row of makeRows) {
    let makeFacet = makeMap.get(row.makeSlug);

    if (!makeFacet) {
      makeFacet = { slug: row.makeSlug, name: row.make, count: 0, models: [] };
      makeMap.set(row.makeSlug, makeFacet);
    }

    makeFacet.count += row.value;
    makeFacet.models.push({
      slug: row.modelSlug,
      name: row.model,
      count: row.value,
    });
  }

  const makes = [...makeMap.values()]
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
    .map((make) => ({
      ...make,
      models: [...make.models].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
    }));

  return {
    items,
    total,
    pagina,
    totalPaginas,
    facets: {
      priceHistogram: buildHistogramCounts(priceValues, priceBounds.min, priceBounds.max),
      mileageHistogram: buildHistogramCounts(mileageKm, mileageBounds.min, mileageBounds.max),
      priceMin: priceBounds.min,
      priceMax: priceBounds.max,
      mileageMin: mileageBounds.min,
      mileageMax: mileageBounds.max,
      yearMin: yearBounds.min,
      yearMax: yearBounds.max,
      makes,
    },
  };
}

export async function searchPublicVehicles(
  params: VehicleSearchParams,
  options: SearchPublicVehiclesOptions = {}
): Promise<VehicleSearchResult> {
  const pageSize = options.pageSize ?? PAGE_SIZE;

  return unstable_cache(
    async () => searchPublicVehiclesUncached(params, { ...options, pageSize }),
    [
      'public-search',
      JSON.stringify(params),
      String(pageSize),
      options.storeId ?? '',
    ],
    { revalidate: 60, tags: [PUBLIC_CATALOG_CACHE_TAG] }
  )();
}

export async function getLatestPublicVehicles(
  condicao?: VehicleSearchCondition | 'all',
  limit = 6
): Promise<VehicleListing[]> {
  return unstable_cache(
    async () => {
      const condition =
        condicao && condicao !== 'all' ? CONDITION_DB[condicao] : null;
      const rows = await repo.selectPublicConditionLatest(condition, limit);

      return mapRowsToListings(rows);
    },
    ['public-latest', String(condicao ?? 'all'), String(limit)],
    { revalidate: 60, tags: [PUBLIC_CATALOG_CACHE_TAG] }
  )();
}

export async function getPublicCategoryCounts(): Promise<CategoryCount[]> {
  return unstable_cache(
    async () => {
      const rows = await repo.selectPublicBodyCounts();
      const byBody = new Map(rows.map((row) => [row.bodyType, row.value]));
      const bodies: PublicBodyType[] = ['hatch', 'sedan', 'suv', 'pickup', 'utility'];

      return bodies.map((body) => ({
        body,
        label: BODY_META[body].label,
        count: byBody.get(body) ?? 0,
        searchValue: BODY_META[body].searchValue,
      }));
    },
    ['public-categories'],
    { revalidate: 60, tags: [PUBLIC_CATALOG_CACHE_TAG] }
  )();
}

export async function getPublicCatalogMakes(): Promise<CatalogMake[]> {
  return unstable_cache(
    async () => {
      const rows = await repo.selectDistinctCatalogMakes();
      const map = new Map<string, CatalogMake>();

      for (const row of rows) {
        let make = map.get(row.makeSlug);

        if (!make) {
          make = { slug: row.makeSlug, name: row.make, models: [] };
          map.set(row.makeSlug, make);
        }

        if (!make.models.some((model) => model.slug === row.modelSlug)) {
          make.models.push({ slug: row.modelSlug, name: row.model });
        }
      }

      return [...map.values()]
        .map((make) => ({
          ...make,
          models: [...make.models].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
        }))
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    },
    ['public-catalog-makes'],
    { revalidate: 60, tags: [PUBLIC_CATALOG_CACHE_TAG] }
  )();
}

export type StoreDirectoryResult = {
  items: StoreProfile[];
  total: number;
  pagina: number;
  totalPaginas: number;
  cityOptions: Array<{ value: string; label: string }>;
};

function mapStoreRowToProfile(
  store: typeof stores.$inferSelect,
  extras: {
    vehicleCount: number;
    logoUrl?: string | null;
    coverImageUrl?: string | null;
    tagline?: string | null;
  }
): StoreProfile {
  return {
    id: store.id,
    slug: store.slug,
    name: store.publicName,
    city: store.city,
    state: store.state,
    neighborhood: store.neighborhood ?? undefined,
    storeStatus: store.status as StoreProfile['storeStatus'],
    vehicleCount: extras.vehicleCount,
    verified: store.verified === 'true',
    subdomain: store.subdomain,
    logoUrl: extras.logoUrl ?? undefined,
    coverImageUrl: extras.coverImageUrl ?? undefined,
    tagline: extras.tagline ?? undefined,
  };
}

async function resolveVerifiedStoreIdsByCity(cidade: string): Promise<string[]> {
  const db = getDb();
  const rows = await db
    .select({ id: stores.id, city: stores.city, state: stores.state })
    .from(stores)
    .where(and(eq(stores.status, STORE_STATUS.ACTIVE), eq(stores.verified, 'true')));

  return rows
    .filter((row) => storeLocationSlug(row.city, row.state) === cidade)
    .map((row) => row.id);
}

function sortStoreProfiles(items: StoreProfile[], ordem: StoreDirectorySort): StoreProfile[] {
  const sorted = [...items];

  if (ordem === 'nome') {
    sorted.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  } else if (ordem === 'anuncios') {
    sorted.sort((a, b) => {
      const byCount = b.vehicleCount - a.vehicleCount;

      return byCount !== 0 ? byCount : a.name.localeCompare(b.name, 'pt-BR');
    });
  } else {
    // relevância: mais anúncios públicos, depois nome
    sorted.sort((a, b) => {
      const byCount = b.vehicleCount - a.vehicleCount;

      return byCount !== 0 ? byCount : a.name.localeCompare(b.name, 'pt-BR');
    });
  }

  return sorted;
}

export async function searchPublicStoresUncached(
  params: StoreDirectoryParams,
  pageSize = STORE_DIRECTORY_PAGE_SIZE
): Promise<StoreDirectoryResult> {
  const db = getDb();
  const { storefrontSettings } = await import('@lib/db');

  const conditions: SQL[] = [
    eq(stores.status, STORE_STATUS.ACTIVE),
    eq(stores.verified, 'true'),
  ];

  const q = params.q?.trim();

  if (q) {
    const pattern = `%${q.toLowerCase()}%`;
    conditions.push(
      or(
        like(sql`lower(${stores.publicName})`, pattern),
        like(sql`lower(${stores.tradeName})`, pattern),
        like(sql`lower(${stores.slug})`, pattern)
      )!
    );
  }

  if (params.cidade) {
    const cityIds = await resolveVerifiedStoreIdsByCity(params.cidade);

    if (cityIds.length === 0) {
      const cityOptions = await getPublicStoreCityOptionsUncached();

      return {
        items: [],
        total: 0,
        pagina: 1,
        totalPaginas: 0,
        cityOptions,
      };
    }

    conditions.push(inArray(stores.id, cityIds));
  }

  const storeRows = await db
    .select({
      store: stores,
      logoUrl: storefrontSettings.logoUrl,
      coverImageUrl: storefrontSettings.coverImageUrl,
      tagline: storefrontSettings.tagline,
    })
    .from(stores)
    .leftJoin(storefrontSettings, eq(storefrontSettings.storeId, stores.id))
    .where(and(...conditions));

  const counts = await db
    .select({
      storeId: listings.storeId,
      value: count(),
    })
    .from(listings)
    .innerJoin(vehicles, eq(listings.vehicleId, vehicles.id))
    .innerJoin(stores, eq(listings.storeId, stores.id))
    .where(repo.publicEligibilitySql())
    .groupBy(listings.storeId);

  const countMap = new Map(counts.map((row) => [row.storeId, Number(row.value)]));

  const profiles = sortStoreProfiles(
    storeRows.map(({ store, logoUrl, coverImageUrl, tagline }) =>
      mapStoreRowToProfile(store, {
        vehicleCount: countMap.get(store.id) ?? 0,
        logoUrl,
        coverImageUrl,
        tagline,
      })
    ),
    params.ordem
  );

  const total = profiles.length;
  const totalPaginas = total === 0 ? 0 : Math.ceil(total / pageSize);
  const pagina = Math.min(Math.max(params.pagina, 1), Math.max(totalPaginas, 1));
  const start = (pagina - 1) * pageSize;
  const items = profiles.slice(start, start + pageSize);
  const cityOptions = await getPublicStoreCityOptionsUncached();

  return { items, total, pagina, totalPaginas, cityOptions };
}

export async function searchPublicStores(
  params: StoreDirectoryParams,
  pageSize = STORE_DIRECTORY_PAGE_SIZE
): Promise<StoreDirectoryResult> {
  return unstable_cache(
    async () => searchPublicStoresUncached(params, pageSize),
    ['public-store-directory', JSON.stringify(params), String(pageSize)],
    { revalidate: 60, tags: [PUBLIC_CATALOG_CACHE_TAG] }
  )();
}

async function getPublicStoreCityOptionsUncached(): Promise<Array<{ value: string; label: string }>> {
  const db = getDb();
  const rows = await db
    .select({ city: stores.city, state: stores.state })
    .from(stores)
    .where(and(eq(stores.status, STORE_STATUS.ACTIVE), eq(stores.verified, 'true')))
    .groupBy(stores.city, stores.state);

  const options = rows.map((row) => ({
    value: storeLocationSlug(row.city, row.state),
    label: `${row.city}, ${row.state}`,
  }));

  options.sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));

  return [{ value: 'all', label: 'Todas as cidades' }, ...options];
}

export async function getPublicStoreCityOptions(): Promise<Array<{ value: string; label: string }>> {
  return unstable_cache(
    async () => getPublicStoreCityOptionsUncached(),
    ['public-store-city-options'],
    { revalidate: 60, tags: [PUBLIC_CATALOG_CACHE_TAG] }
  )();
}

export async function getPublicVerifiedStores(): Promise<StoreProfile[]> {
  return unstable_cache(
    async () => {
      const result = await searchPublicStoresUncached(
        {
          ordem: 'nome',
          pagina: 1,
        },
        10_000
      );

      return result.items;
    },
    ['public-verified-stores'],
    { revalidate: 60, tags: [PUBLIC_CATALOG_CACHE_TAG] }
  )();
}

export async function getPublicMarketStats(): Promise<FixtureMarketStats> {
  return unstable_cache(
    async () => repo.selectPublicMarketStats(),
    ['public-market-stats'],
    { revalidate: 60, tags: [PUBLIC_CATALOG_CACHE_TAG] }
  )();
}

export async function getPublicVehicleBySlug(slug: string): Promise<VehicleListing | undefined> {
  return unstable_cache(
    async () => {
      const row = await repo.findPublicListingBySlug(slug);

      if (!row) {
        return undefined;
      }

      const [mapped] = await mapRowsToListings([row]);

      return mapped;
    },
    ['public-vehicle', slug],
    { revalidate: 60, tags: [PUBLIC_CATALOG_CACHE_TAG] }
  )();
}

export async function getPublicVehiclesByStoreSlug(storeSlug: string): Promise<VehicleListing[]> {
  return unstable_cache(
    async () => {
      const rows = await repo.selectPublicByStoreSlug(storeSlug);

      return mapRowsToListings(rows);
    },
    ['public-store-vehicles', storeSlug],
    { revalidate: 60, tags: [PUBLIC_CATALOG_CACHE_TAG] }
  )();
}

export async function getPublicCityOptions(): Promise<Array<{ value: string; label: string }>> {
  return unstable_cache(
    async () => repo.selectPublicCityOptions(),
    ['public-city-options'],
    { revalidate: 60, tags: [PUBLIC_CATALOG_CACHE_TAG] }
  )();
}

export async function getPublicStoreBySlug(slug: string): Promise<StoreProfile | undefined> {
  return unstable_cache(
    async () => {
      const db = getDb();
      const [store] = await db.select().from(stores).where(eq(stores.slug, slug)).limit(1);

      if (!store || store.status !== STORE_STATUS.ACTIVE) {
        return undefined;
      }

      const [countRow] = await db
        .select({ value: count() })
        .from(listings)
        .innerJoin(vehicles, eq(listings.vehicleId, vehicles.id))
        .innerJoin(stores, eq(listings.storeId, stores.id))
        .where(and(eq(listings.storeId, store.id), repo.publicEligibilitySql()));

      return {
        id: store.id,
        slug: store.slug,
        name: store.publicName,
        city: store.city,
        state: store.state,
        neighborhood: store.neighborhood ?? undefined,
        storeStatus: store.status as StoreProfile['storeStatus'],
        vehicleCount: countRow?.value ?? 0,
        verified: store.verified === 'true',
      };
    },
    ['public-store', slug],
    { revalidate: 60, tags: [PUBLIC_CATALOG_CACHE_TAG] }
  )();
}
