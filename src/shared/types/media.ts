/** Propósitos de upload — isolam prefixos no object store. */
export const MEDIA_PURPOSE = {
  VEHICLE_PHOTO: 'vehicle_photo',
  STORE_LOGO: 'store_logo',
  STORE_COVER: 'store_cover',
} as const;

export type MediaPurpose = (typeof MEDIA_PURPOSE)[keyof typeof MEDIA_PURPOSE];

export const MEDIA_VARIANT = {
  DETAIL: 'detail',
  CARD: 'card',
  LOGO: 'logo',
  COVER: 'cover',
} as const;

export type MediaVariant = (typeof MEDIA_VARIANT)[keyof typeof MEDIA_VARIANT];

export const MEDIA_ASSET_STATUS = {
  PENDING: 'pending',
  ATTACHED: 'attached',
  ORPHANED: 'orphaned',
  DELETED: 'deleted',
} as const;

export type MediaAssetStatus = (typeof MEDIA_ASSET_STATUS)[keyof typeof MEDIA_ASSET_STATUS];

/** Item de mídia no cliente (uploader + persistência). */
export type MediaItem = {
  id: string;
  url: string;
  cardUrl?: string | null;
  detailUrl?: string | null;
  storageKey?: string | null;
  sortOrder: number;
  isPrimary: boolean;
  alt?: string | null;
  width?: number | null;
  height?: number | null;
  mimeType?: string | null;
  /** Preview local antes do upload concluir (blob:). */
  previewUrl?: string;
  status?: 'ready' | 'uploading' | 'error';
  errorMessage?: string;
  progress?: number;
};

export type UploadedMediaResult = {
  assetId: string;
  url: string;
  cardUrl: string | null;
  detailUrl: string | null;
  storageKey: string;
  width: number;
  height: number;
  mimeType: string;
  byteSize: number;
};
