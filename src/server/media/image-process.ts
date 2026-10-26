import sharp from 'sharp';

import { MEDIA_PURPOSE, type MediaPurpose } from '@app-types/media';

import { MEDIA_VARIANT_WIDTH } from './media.constants';

export type ProcessedImageVariant = {
  name: 'detail' | 'card' | 'logo' | 'cover';
  buffer: Buffer;
  width: number;
  height: number;
  mimeType: 'image/webp';
  byteSize: number;
};

export type ProcessedImage = {
  primary: ProcessedImageVariant;
  variants: ProcessedImageVariant[];
};

async function toWebp(
  input: Buffer,
  name: ProcessedImageVariant['name'],
  maxWidth: number,
  quality: number
): Promise<ProcessedImageVariant> {
  const pipeline = sharp(input, { failOn: 'none' }).rotate();
  const resized = pipeline.resize({
    width: maxWidth,
    height: maxWidth,
    fit: 'inside',
    withoutEnlargement: true,
  });

  const { data, info } = await resized.webp({ quality, effort: 4 }).toBuffer({ resolveWithObject: true });

  return {
    name,
    buffer: data,
    width: info.width,
    height: info.height,
    mimeType: 'image/webp',
    byteSize: data.byteLength,
  };
}

export async function processImageForPurpose(
  input: Buffer,
  purpose: MediaPurpose
): Promise<ProcessedImage> {
  if (purpose === MEDIA_PURPOSE.STORE_LOGO) {
    const logo = await toWebp(input, 'logo', MEDIA_VARIANT_WIDTH.logo, 82);

    return { primary: logo, variants: [logo] };
  }

  if (purpose === MEDIA_PURPOSE.STORE_COVER) {
    const cover = await toWebp(input, 'cover', MEDIA_VARIANT_WIDTH.cover, 80);

    return { primary: cover, variants: [cover] };
  }

  const [detail, card] = await Promise.all([
    toWebp(input, 'detail', MEDIA_VARIANT_WIDTH.detail, 80),
    toWebp(input, 'card', MEDIA_VARIANT_WIDTH.card, 75),
  ]);

  return {
    primary: detail,
    variants: [detail, card],
  };
}
