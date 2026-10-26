import type { BodyType } from '@app-types/vehicle';
import type { VehicleSearchBody } from '@utils/vehicle-search-params';

const BODY_TO_SEARCH: Partial<Record<BodyType, VehicleSearchBody>> = {
  hatch: 'hatch',
  sedan: 'sedan',
  suv: 'suv',
  pickup: 'picape',
  utility: 'utilitario',
};

const SEARCH_TO_BODY: Record<VehicleSearchBody, BodyType> = {
  hatch: 'hatch',
  sedan: 'sedan',
  suv: 'suv',
  picape: 'pickup',
  utilitario: 'utility',
};

export function bodyTypeToSearch(body: BodyType | null): VehicleSearchBody[] {
  if (!body) {
    return [];
  }

  const mapped = BODY_TO_SEARCH[body];

  return mapped ? [mapped] : [];
}

export function searchBodyToType(carroceria: VehicleSearchBody[]): BodyType | null {
  const first = carroceria[0];

  if (!first) {
    return null;
  }

  return SEARCH_TO_BODY[first] ?? null;
}
