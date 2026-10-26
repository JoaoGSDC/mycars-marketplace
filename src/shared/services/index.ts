import * as catalog from './entities/catalog.services';
import * as storefront from './entities/storefront.services';
import * as vehicleSearch from './entities/vehicle-search.services';

/** Barrel do HTTP client / stubs — Views importam daqui. */
export const services = {
  catalog,
  storefront,
  vehicleSearch,
};

export type Services = typeof services;
export type { MakeFacet, VehicleSearchResult } from './entities/vehicle-search.services';
