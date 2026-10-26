import type { VehicleGalleryImage } from '@app-types/vehicle';
import { primaryVehicleImageUrl } from '@utils/media-url';

/** Monta campos de imagem para VehicleListing a partir de VehicleMedia. */
export function listingImageFields(
  media: Array<{
    id?: string;
    url: string;
    cardUrl?: string | null;
    detailUrl?: string | null;
    isPrimary?: boolean | string;
    sortOrder?: number;
  }>
): {
  hasPhoto: boolean;
  imageUrl?: string;
  cardUrl?: string;
  detailUrl?: string;
  gallery: VehicleGalleryImage[];
} {
  const card = primaryVehicleImageUrl(media, 'card');
  const detail = primaryVehicleImageUrl(media, 'detail');
  const gallery: VehicleGalleryImage[] = [...media]
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((item, index) => ({
      id: item.id ?? `media-${index}`,
      url: item.url,
      cardUrl: item.cardUrl,
      detailUrl: item.detailUrl,
    }));

  if (!card && !detail && gallery.length === 0) {
    return { hasPhoto: false, gallery: [] };
  }

  return {
    hasPhoto: true,
    imageUrl: card ?? detail ?? gallery[0]?.url,
    cardUrl: card,
    detailUrl: detail,
    gallery,
  };
}

export function parseListingFeatures(featuresJson: string | null | undefined): string[] {
  if (!featuresJson) {
    return [];
  }

  try {
    const parsed = JSON.parse(featuresJson) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}
