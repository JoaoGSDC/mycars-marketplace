import type { ListingStatus, StoreStatus, VehicleStatus } from '@app-types/status';
import type { VehicleCondition, VehicleListing } from '@app-types/vehicle';
import type { ListingRow, StoreRow, VehicleMediaRow, VehicleRow } from '@lib/db';

import { isListingRowPubliclyVisible } from './listing-eligibility';
import { listingImageFields, parseListingFeatures } from './listing-media';

export function mapListingBundleToVehicleListing(input: {
  listing: ListingRow;
  vehicle: VehicleRow;
  store: StoreRow;
  media: VehicleMediaRow[];
}): VehicleListing {
  const { listing, vehicle, store, media } = input;
  const images = listingImageFields(media);

  return {
    id: listing.id,
    slug: listing.slug,
    make: vehicle.make,
    makeSlug: vehicle.makeSlug,
    model: vehicle.model,
    modelSlug: vehicle.modelSlug,
    version: vehicle.version,
    price: listing.priceCents / 100,
    previousPrice:
      listing.previousPriceCents != null ? listing.previousPriceCents / 100 : undefined,
    condition: vehicle.condition as VehicleCondition,
    status: vehicle.status as VehicleStatus,
    listingStatus: listing.status as ListingStatus,
    publishedAt: listing.publishedAt ?? listing.createdAt,
    featured: listing.featured === 'true',
    description: listing.description,
    features: parseListingFeatures(listing.featuresJson),
    specs: {
      mileageKm: vehicle.mileageKm,
      fuel: vehicle.fuel as VehicleListing['specs']['fuel'],
      transmission: vehicle.transmission as VehicleListing['specs']['transmission'],
      yearManufacture: vehicle.yearManufacture,
      yearModel: vehicle.yearModel,
      powerKw: vehicle.powerKw ?? undefined,
      drivetrain: (vehicle.drivetrain as VehicleListing['specs']['drivetrain']) ?? undefined,
      bodyType: vehicle.bodyType as VehicleListing['specs']['bodyType'],
      color: vehicle.color ?? undefined,
    },
    store: {
      id: store.id,
      slug: store.slug,
      name: store.publicName,
      city: store.city,
      state: store.state,
      neighborhood: store.neighborhood ?? undefined,
      whatsappNumber: store.whatsapp ?? undefined,
      storeStatus: store.status as StoreStatus,
    },
    ...images,
  };
}

export function filterPublicVehicleListings(items: VehicleListing[]): VehicleListing[] {
  return items.filter((item) =>
    isListingRowPubliclyVisible({
      listingStatus: item.listingStatus,
      vehicleStatus: item.status,
      storeStatus: item.store.storeStatus ?? 'active',
    })
  );
}
