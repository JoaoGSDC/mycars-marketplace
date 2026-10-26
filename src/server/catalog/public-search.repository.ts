import { and, asc, count, desc, eq, gte, inArray, like, lte, or, sql, type SQL } from 'drizzle-orm';

import { LISTING_STATUS, STORE_STATUS, VEHICLE_STATUS } from '@app-types/status';
import {
  getDb,
  listings,
  stores,
  vehicleMedia,
  vehicles,
  type ListingRow,
  type StoreRow,
  type VehicleMediaRow,
  type VehicleRow,
} from '@lib/db';
import { storeLocationSlug } from '@utils/slug';
import type { VehicleSearchParams } from '@utils/vehicle-search-params';

export type PublicListingJoinRow = {
  listing: ListingRow;
  vehicle: VehicleRow;
  store: StoreRow;
};

/** Elegibilidade pública no SQL — espelha isPubliclyListable. */
export function publicEligibilitySql(): SQL {
  return and(
    eq(listings.status, LISTING_STATUS.PUBLISHED),
    inArray(vehicles.status, [VEHICLE_STATUS.AVAILABLE, VEHICLE_STATUS.RESERVED]),
    eq(stores.status, STORE_STATUS.ACTIVE)
  )!;
}

export type SearchFilterSkip =
  | 'q'
  | 'condicao'
  | 'marca'
  | 'modelo'
  | 'preco'
  | 'km'
  | 'ano'
  | 'combustivel'
  | 'cambio'
  | 'carroceria'
  | 'local';

const FUEL_MAP: Record<string, string> = {
  gasolina: 'gasoline',
  etanol: 'ethanol',
  flex: 'flex',
  diesel: 'diesel',
  eletrico: 'electric',
  hibrido: 'hybrid',
};

const TRANSMISSION_MAP: Record<string, string> = {
  manual: 'manual',
  automatico: 'automatic',
  cvt: 'cvt',
  automatizado: 'automated',
};

const BODY_MAP: Record<string, string> = {
  hatch: 'hatch',
  sedan: 'sedan',
  suv: 'suv',
  picape: 'pickup',
  utilitario: 'utility',
};

const CONDITION_MAP: Record<string, string> = {
  novo: 'new',
  seminovo: 'seminew',
  usado: 'used',
};

async function resolveLocalStoreIds(local: string): Promise<string[]> {
  const db = getDb();
  const rows = await db
    .select({ id: stores.id, city: stores.city, state: stores.state })
    .from(stores)
    .where(eq(stores.status, STORE_STATUS.ACTIVE));

  return rows
    .filter((row) => storeLocationSlug(row.city, row.state) === local)
    .map((row) => row.id);
}

export type PublicSearchOptions = {
  /** Restringe ao estoque publicado de uma loja (vitrine). */
  storeId?: string;
};

export async function buildPublicSearchConditions(
  params: VehicleSearchParams,
  skip: Set<SearchFilterSkip> = new Set(),
  options: PublicSearchOptions = {}
): Promise<SQL[]> {
  const conditions: SQL[] = [publicEligibilitySql()];

  if (options.storeId) {
    conditions.push(eq(listings.storeId, options.storeId));
  }

  if (!skip.has('q') && params.q?.trim()) {
    const term = `%${params.q.trim().toLowerCase()}%`;
    conditions.push(
      or(
        like(sql`lower(${vehicles.make})`, term),
        like(sql`lower(${vehicles.model})`, term),
        like(sql`lower(${vehicles.version})`, term)
      )!
    );
  }

  if (!skip.has('condicao') && params.condicao) {
    const condition = CONDITION_MAP[params.condicao];

    if (condition) {
      conditions.push(eq(vehicles.condition, condition));
    }
  }

  if (!skip.has('marca') && params.marca.length > 0) {
    conditions.push(inArray(vehicles.makeSlug, params.marca));
  }

  if (!skip.has('modelo') && params.modelo.length > 0) {
    const modelClauses = params.modelo
      .map((entry) => {
        const [makeSlug, modelSlug] = entry.split(':');

        if (!makeSlug || !modelSlug) {
          return null;
        }

        return and(eq(vehicles.makeSlug, makeSlug), eq(vehicles.modelSlug, modelSlug));
      })
      .filter((clause): clause is SQL => Boolean(clause));

    if (modelClauses.length > 0) {
      conditions.push(or(...modelClauses)!);
    }
  }

  if (!skip.has('preco')) {
    if (params.precoMin != null) {
      conditions.push(gte(listings.priceCents, params.precoMin * 100));
    }

    if (params.precoMax != null) {
      conditions.push(lte(listings.priceCents, params.precoMax * 100));
    }
  }

  if (!skip.has('km')) {
    if (params.kmMin != null) {
      conditions.push(gte(vehicles.mileageKm, params.kmMin));
    }

    if (params.kmMax != null) {
      conditions.push(lte(vehicles.mileageKm, params.kmMax));
    }
  }

  if (!skip.has('ano')) {
    if (params.anoMin != null) {
      conditions.push(gte(vehicles.yearModel, params.anoMin));
    }

    if (params.anoMax != null) {
      conditions.push(lte(vehicles.yearModel, params.anoMax));
    }
  }

  if (!skip.has('combustivel') && params.combustivel.length > 0) {
    const fuels = params.combustivel.map((f) => FUEL_MAP[f]).filter(Boolean);
    if (fuels.length > 0) {
      conditions.push(inArray(vehicles.fuel, fuels));
    }
  }

  if (!skip.has('cambio') && params.cambio.length > 0) {
    const transmissions = params.cambio.map((t) => TRANSMISSION_MAP[t]).filter(Boolean);
    if (transmissions.length > 0) {
      conditions.push(inArray(vehicles.transmission, transmissions));
    }
  }

  if (!skip.has('carroceria') && params.carroceria.length > 0) {
    const bodies = params.carroceria.map((b) => BODY_MAP[b]).filter(Boolean);
    if (bodies.length > 0) {
      conditions.push(inArray(vehicles.bodyType, bodies));
    }
  }

  if (!options.storeId && !skip.has('local') && params.local) {
    const storeIds = await resolveLocalStoreIds(params.local);

    if (storeIds.length === 0) {
      conditions.push(sql`1 = 0`);
    } else {
      conditions.push(inArray(listings.storeId, storeIds));
    }
  }

  return conditions;
}

function orderClauses(ordem: VehicleSearchParams['ordem']) {
  switch (ordem) {
    case 'menor-preco':
      return [asc(listings.priceCents), asc(listings.id)];
    case 'maior-preco':
      return [desc(listings.priceCents), asc(listings.id)];
    case 'menor-km':
      return [asc(vehicles.mileageKm), asc(listings.id)];
    case 'recentes':
    default:
      return [desc(listings.publishedAt), asc(listings.id)];
  }
}

export async function countPublicListings(conditions: SQL[]): Promise<number> {
  const db = getDb();
  const [row] = await db
    .select({ value: count() })
    .from(listings)
    .innerJoin(vehicles, eq(listings.vehicleId, vehicles.id))
    .innerJoin(stores, eq(listings.storeId, stores.id))
    .where(and(...conditions));

  return row?.value ?? 0;
}

export async function selectPublicListingPage(
  conditions: SQL[],
  ordem: VehicleSearchParams['ordem'],
  page: number,
  pageSize: number
): Promise<PublicListingJoinRow[]> {
  const db = getDb();
  const offset = (page - 1) * pageSize;

  return db
    .select({
      listing: listings,
      vehicle: vehicles,
      store: stores,
    })
    .from(listings)
    .innerJoin(vehicles, eq(listings.vehicleId, vehicles.id))
    .innerJoin(stores, eq(listings.storeId, stores.id))
    .where(and(...conditions))
    .orderBy(...orderClauses(ordem))
    .limit(pageSize)
    .offset(offset);
}

export async function selectPublicPriceCents(conditions: SQL[]): Promise<number[]> {
  const db = getDb();
  const rows = await db
    .select({ value: listings.priceCents })
    .from(listings)
    .innerJoin(vehicles, eq(listings.vehicleId, vehicles.id))
    .innerJoin(stores, eq(listings.storeId, stores.id))
    .where(and(...conditions));

  return rows.map((row) => row.value);
}

export async function selectPublicMileageKm(conditions: SQL[]): Promise<number[]> {
  const db = getDb();
  const rows = await db
    .select({ value: vehicles.mileageKm })
    .from(listings)
    .innerJoin(vehicles, eq(listings.vehicleId, vehicles.id))
    .innerJoin(stores, eq(listings.storeId, stores.id))
    .where(and(...conditions));

  return rows.map((row) => row.value);
}

export async function selectPublicYearModels(conditions: SQL[]): Promise<number[]> {
  const db = getDb();
  const rows = await db
    .select({ value: vehicles.yearModel })
    .from(listings)
    .innerJoin(vehicles, eq(listings.vehicleId, vehicles.id))
    .innerJoin(stores, eq(listings.storeId, stores.id))
    .where(and(...conditions));

  return rows.map((row) => row.value);
}

export async function selectPublicMakeModelFacets(
  conditions: SQL[]
): Promise<Array<{ make: string; makeSlug: string; model: string; modelSlug: string; value: number }>> {
  const db = getDb();

  return db
    .select({
      make: vehicles.make,
      makeSlug: vehicles.makeSlug,
      model: vehicles.model,
      modelSlug: vehicles.modelSlug,
      value: count(),
    })
    .from(listings)
    .innerJoin(vehicles, eq(listings.vehicleId, vehicles.id))
    .innerJoin(stores, eq(listings.storeId, stores.id))
    .where(and(...conditions))
    .groupBy(vehicles.make, vehicles.makeSlug, vehicles.model, vehicles.modelSlug);
}

export async function selectPublicBodyCounts(): Promise<Array<{ bodyType: string; value: number }>> {
  const db = getDb();

  return db
    .select({
      bodyType: vehicles.bodyType,
      value: count(),
    })
    .from(listings)
    .innerJoin(vehicles, eq(listings.vehicleId, vehicles.id))
    .innerJoin(stores, eq(listings.storeId, stores.id))
    .where(publicEligibilitySql())
    .groupBy(vehicles.bodyType);
}

export async function selectPublicConditionLatest(
  condition: string | null,
  limit: number
): Promise<PublicListingJoinRow[]> {
  const db = getDb();
  const conditions: SQL[] = [publicEligibilitySql()];

  if (condition) {
    conditions.push(eq(vehicles.condition, condition));
  }

  return db
    .select({
      listing: listings,
      vehicle: vehicles,
      store: stores,
    })
    .from(listings)
    .innerJoin(vehicles, eq(listings.vehicleId, vehicles.id))
    .innerJoin(stores, eq(listings.storeId, stores.id))
    .where(and(...conditions))
    .orderBy(desc(listings.publishedAt), asc(listings.id))
    .limit(limit);
}

export async function selectPrimaryMediaForVehicles(
  vehicleIds: string[]
): Promise<Map<string, VehicleMediaRow[]>> {
  const map = new Map<string, VehicleMediaRow[]>();

  if (vehicleIds.length === 0) {
    return map;
  }

  const db = getDb();
  const rows = await db
    .select()
    .from(vehicleMedia)
    .where(inArray(vehicleMedia.vehicleId, vehicleIds))
    .orderBy(asc(vehicleMedia.sortOrder));

  for (const row of rows) {
    const list = map.get(row.vehicleId) ?? [];
    list.push(row);
    map.set(row.vehicleId, list);
  }

  return map;
}

export async function selectPublicMarketStats(): Promise<{
  verifiedStores: number;
  listedVehicles: number;
  cities: number;
}> {
  const db = getDb();

  const [listed] = await db
    .select({ value: count() })
    .from(listings)
    .innerJoin(vehicles, eq(listings.vehicleId, vehicles.id))
    .innerJoin(stores, eq(listings.storeId, stores.id))
    .where(publicEligibilitySql());

  const [verified] = await db
    .select({ value: count() })
    .from(stores)
    .where(and(eq(stores.status, STORE_STATUS.ACTIVE), eq(stores.verified, 'true')));

  const cityRows = await db
    .select({ city: stores.city, state: stores.state })
    .from(stores)
    .innerJoin(listings, eq(listings.storeId, stores.id))
    .innerJoin(vehicles, eq(listings.vehicleId, vehicles.id))
    .where(publicEligibilitySql())
    .groupBy(stores.city, stores.state);

  return {
    verifiedStores: verified?.value ?? 0,
    listedVehicles: listed?.value ?? 0,
    cities: cityRows.length,
  };
}

export async function selectPublicCityOptions(): Promise<Array<{ value: string; label: string }>> {
  const db = getDb();
  const rows = await db
    .select({ city: stores.city, state: stores.state })
    .from(stores)
    .innerJoin(listings, eq(listings.storeId, stores.id))
    .innerJoin(vehicles, eq(listings.vehicleId, vehicles.id))
    .where(publicEligibilitySql())
    .groupBy(stores.city, stores.state);

  const options = rows.map((row) => ({
    value: storeLocationSlug(row.city, row.state),
    label: `${row.city}, ${row.state}`,
  }));

  options.sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));

  return [{ value: '', label: 'Todo o Brasil' }, ...options];
}

export async function selectDistinctCatalogMakes(): Promise<
  Array<{ make: string; makeSlug: string; model: string; modelSlug: string }>
> {
  const db = getDb();

  return db
    .select({
      make: vehicles.make,
      makeSlug: vehicles.makeSlug,
      model: vehicles.model,
      modelSlug: vehicles.modelSlug,
    })
    .from(listings)
    .innerJoin(vehicles, eq(listings.vehicleId, vehicles.id))
    .innerJoin(stores, eq(listings.storeId, stores.id))
    .where(publicEligibilitySql())
    .groupBy(vehicles.make, vehicles.makeSlug, vehicles.model, vehicles.modelSlug)
    .orderBy(asc(vehicles.make), asc(vehicles.model));
}

export async function findPublicListingBySlug(slug: string): Promise<PublicListingJoinRow | undefined> {
  const db = getDb();
  const rows = await db
    .select({
      listing: listings,
      vehicle: vehicles,
      store: stores,
    })
    .from(listings)
    .innerJoin(vehicles, eq(listings.vehicleId, vehicles.id))
    .innerJoin(stores, eq(listings.storeId, stores.id))
    .where(and(eq(listings.slug, slug), publicEligibilitySql()))
    .limit(1);

  return rows[0];
}

export async function selectPublicByStoreSlug(storeSlug: string): Promise<PublicListingJoinRow[]> {
  const db = getDb();

  return db
    .select({
      listing: listings,
      vehicle: vehicles,
      store: stores,
    })
    .from(listings)
    .innerJoin(vehicles, eq(listings.vehicleId, vehicles.id))
    .innerJoin(stores, eq(listings.storeId, stores.id))
    .where(and(eq(stores.slug, storeSlug), publicEligibilitySql()))
    .orderBy(desc(listings.publishedAt), asc(listings.id));
}
