import { MEDIA_ALLOWED_MIME } from './media.constants';

type DetectedImage = {
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
};

/** Detecta tipo real pelo conteúdo — não confiar na extensão. */
export function detectImageMime(buffer: Buffer): DetectedImage | null {
  if (buffer.length < 12) {
    return null;
  }

  // JPEG
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mimeType: 'image/jpeg' };
  }

  // PNG
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { mimeType: 'image/png' };
  }

  // WEBP: RIFF....WEBP
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return { mimeType: 'image/webp' };
  }

  return null;
}

export function assertAllowedImageMime(mimeType: string): boolean {
  return MEDIA_ALLOWED_MIME.has(mimeType);
}
