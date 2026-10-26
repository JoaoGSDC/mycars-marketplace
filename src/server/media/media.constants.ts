import { MEDIA_PURPOSE, type MediaPurpose } from '@app-types/media';

export const MEDIA_MAX_BYTES = {
  [MEDIA_PURPOSE.VEHICLE_PHOTO]: 8 * 1024 * 1024,
  [MEDIA_PURPOSE.STORE_LOGO]: 2 * 1024 * 1024,
  [MEDIA_PURPOSE.STORE_COVER]: 8 * 1024 * 1024,
} as const satisfies Record<MediaPurpose, number>;

export const MEDIA_MAX_COUNT = {
  [MEDIA_PURPOSE.VEHICLE_PHOTO]: 20,
  [MEDIA_PURPOSE.STORE_LOGO]: 1,
  [MEDIA_PURPOSE.STORE_COVER]: 1,
} as const satisfies Record<MediaPurpose, number>;

export const MEDIA_ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

export const MEDIA_UPLOAD_RETRIES = 2;

export const MEDIA_ORPHAN_TTL_MS = 24 * 60 * 60 * 1000;

export const MEDIA_VARIANT_WIDTH = {
  card: 800,
  detail: 1600,
  logo: 512,
  cover: 1920,
} as const;
