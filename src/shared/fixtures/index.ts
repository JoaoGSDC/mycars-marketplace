export { fixtureBrands, fixtureBrandsById, type FixtureBrand } from './brands';
export { fixtureCatalog, fixtureCatalogBySlug, type CatalogMake, type CatalogModel } from './catalog';
export { fixtureStores, fixtureStoresById } from './stores';
export { fixtureVehicles, fixtureVehiclesById, fixtureVehiclesBySlug, computeStorePublicCounts } from './vehicles';
export {
  BODY_TYPE_IMAGES,
  HERO_IMAGE_URL,
  VEHICLE_IMAGE_POOL,
  vehicleImageAt,
  storeCoverAt,
} from './vehicle-images';
export { fixturePriceHistogram, fixtureMileageHistogram } from './histogram';
export { fixtureMarketStats, type FixtureMarketStats } from './market-stats';
