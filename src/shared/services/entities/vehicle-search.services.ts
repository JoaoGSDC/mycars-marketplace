import type { BodyType, FuelType, TransmissionType, VehicleCondition, VehicleListing } from '@app-types/vehicle';
import type {
  VehicleSearchBody,
  VehicleSearchCondition,
  VehicleSearchFuel,
  VehicleSearchParams,
  VehicleSearchTransmission,
} from '@utils/vehicle-search-params';

export const PAGE_SIZE = 12;

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

/**
 * Busca pública de veículos.
 * Filtros, ordenação e paginação no servidor (Turso).
 */

/** Texto de busca normalizado (sem acentos, minúsculas). */
export function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function mapSearchCondition(condicao?: VehicleSearchCondition): VehicleCondition | undefined {
  if (!condicao) {
    return undefined;
  }

  if (condicao === 'novo') {
    return 'new';
  }

  if (condicao === 'seminovo') {
    return 'seminew';
  }

  return 'used';
}

export function mapSearchFuel(fuel: VehicleSearchFuel): FuelType {
  const map: Record<VehicleSearchFuel, FuelType> = {
    gasolina: 'gasoline',
    etanol: 'ethanol',
    flex: 'flex',
    diesel: 'diesel',
    eletrico: 'electric',
    hibrido: 'hybrid',
  };

  return map[fuel];
}

export function mapSearchTransmission(transmission: VehicleSearchTransmission): TransmissionType {
  const map: Record<VehicleSearchTransmission, TransmissionType> = {
    manual: 'manual',
    automatico: 'automatic',
    cvt: 'cvt',
    automatizado: 'automated',
  };

  return map[transmission];
}

export function mapSearchBody(body: VehicleSearchBody): BodyType {
  const map: Record<VehicleSearchBody, BodyType> = {
    hatch: 'hatch',
    sedan: 'sedan',
    suv: 'suv',
    picape: 'pickup',
    utilitario: 'utility',
  };

  return map[body];
}

export async function searchVehicles(
  params: VehicleSearchParams,
  options: { pageSize?: number; storeId?: string } = {}
): Promise<VehicleSearchResult> {
  const { searchPublicVehicles } = await import('@server/catalog/public-catalog.service');

  return searchPublicVehicles(params, {
    pageSize: options.pageSize ?? PAGE_SIZE,
    storeId: options.storeId,
  });
}
