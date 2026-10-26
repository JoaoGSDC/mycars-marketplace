import { unstable_cache } from 'next/cache';

import type { PublicStoreContact, VehicleListing } from '@app-types/vehicle';
import { isPubliclyListable } from '@lib/catalog/is-publicly-listable';
import { mapListingBundleToVehicleListing } from '@server/listings/listing-mapper';

import { PUBLIC_CATALOG_CACHE_TAG } from './public-catalog.service';
import * as detailRepo from './public-detail.repository';
import * as searchRepo from './public-search.repository';
import type { UnavailableReason } from './public-detail.repository';

export type { UnavailableReason };

export type PublicVehicleDetailAvailable = {
  status: 'available';
  vehicle: VehicleListing;
  storeContact: PublicStoreContact;
  similar: VehicleListing[];
};

export type PublicVehicleDetailUnavailable = {
  status: 'unavailable';
  slug: string;
  make: string;
  model: string;
  version: string;
  yearModel: number;
  reason: UnavailableReason;
  similar: VehicleListing[];
};

export type PublicVehicleDetailResult =
  | PublicVehicleDetailAvailable
  | PublicVehicleDetailUnavailable
  | { status: 'not_found' };

async function mapRows(rows: searchRepo.PublicListingJoinRow[]): Promise<VehicleListing[]> {
  const mediaMap = await searchRepo.selectPrimaryMediaForVehicles(
    rows.map((row) => row.vehicle.id)
  );

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
        // ordem do estoque
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

function mapStoreContact(
  storefront: Awaited<ReturnType<typeof detailRepo.findStorefrontPublic>>,
  storeWhatsapp: string | null
): PublicStoreContact {
  return {
    logoUrl: storefront?.logoUrl ?? undefined,
    tagline: storefront?.tagline ?? undefined,
    about: storefront?.about ?? undefined,
    contactPhone: storefront?.contactPhone ?? undefined,
    contactEmail: storefront?.contactEmail ?? undefined,
    // '' no storefront não deve mascarar o WhatsApp da loja (`??` só trata null/undefined)
    whatsappNumber: storefront?.whatsappNumber || storeWhatsapp || undefined,
  };
}

async function loadDetailUncached(slug: string): Promise<PublicVehicleDetailResult> {
  const row = await detailRepo.findListingBundleBySlug(slug);

  if (!row) {
    return { status: 'not_found' };
  }

  const reason = detailRepo.resolveUnavailableReason(row.listing, row.vehicle, row.store);
  const similarRows = await detailRepo.selectSimilarPublicListings({
    listingId: row.listing.id,
    makeSlug: row.vehicle.makeSlug,
    modelSlug: row.vehicle.modelSlug,
    bodyType: row.vehicle.bodyType,
  });
  const similar = await mapRows(similarRows);

  if (reason) {
    return {
      status: 'unavailable',
      slug: row.listing.slug,
      make: row.vehicle.make,
      model: row.vehicle.model,
      version: row.vehicle.version,
      yearModel: row.vehicle.yearModel,
      reason,
      similar,
    };
  }

  const [mapped] = await mapRows([row]);

  if (!mapped) {
    return { status: 'not_found' };
  }

  const storefront = await detailRepo.findStorefrontPublic(row.store.id);

  return {
    status: 'available',
    vehicle: mapped,
    storeContact: mapStoreContact(storefront, row.store.whatsapp),
    similar,
  };
}

export async function getPublicVehicleDetail(slug: string): Promise<PublicVehicleDetailResult> {
  return unstable_cache(
    async () => loadDetailUncached(slug),
    ['public-vehicle-detail', slug],
    { revalidate: 60, tags: [PUBLIC_CATALOG_CACHE_TAG] }
  )();
}

/** Versão sem cache para testes. */
export async function getPublicVehicleDetailUncached(
  slug: string
): Promise<PublicVehicleDetailResult> {
  return loadDetailUncached(slug);
}
