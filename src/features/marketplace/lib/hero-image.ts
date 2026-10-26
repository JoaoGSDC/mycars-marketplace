import { access } from 'node:fs/promises';
import path from 'node:path';

import { brand } from '@config/brand';

/** Resolve a foto do hero (URL remota ou arquivo em `public/`). */
export async function resolveHeroImageSrc(): Promise<string | undefined> {
  const src = brand.heroImageSrc;

  if (!src) {
    return undefined;
  }

  if (/^https?:\/\//i.test(src)) {
    return src;
  }

  const relative = src.replace(/^\//, '');
  const absolute = path.join(process.cwd(), 'public', relative);

  try {
    await access(absolute);

    return src;
  } catch {
    return undefined;
  }
}
