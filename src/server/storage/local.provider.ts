import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

import type { ObjectStorageProvider, PutObjectInput, PutObjectResult } from './types';

/**
 * Resolve a pasta raiz do storage local.
 * Default: segmentos literais (Turbopack exige escopo estático).
 * Paths customizados (testes): turbopackIgnore.
 */
function resolveLocalRoot(rootDir: string): string {
  const normalized = rootDir.replace(/\\/g, '/').replace(/\/+$/, '');

  if (!normalized || normalized === '.data/media') {
    return join(process.cwd(), '.data', 'media');
  }

  return resolve(/*turbopackIgnore: true*/ process.cwd(), rootDir);
}

function absoluteUnderRoot(root: string, key: string): string {
  return join(/*turbopackIgnore: true*/ root, key);
}

export function createLocalStorageProvider(options: {
  rootDir: string;
  publicBaseUrl: string;
}): ObjectStorageProvider {
  const root = resolveLocalRoot(options.rootDir);
  const base = options.publicBaseUrl.replace(/\/+$/, '');

  return {
    driver: 'local',

    async putObject(input: PutObjectInput): Promise<PutObjectResult> {
      const absolute = absoluteUnderRoot(root, input.key);
      await mkdir(dirname(absolute), { recursive: true });
      await writeFile(absolute, input.body);

      return { key: input.key, url: `${base}/${input.key}` };
    },

    async deleteObject(key: string): Promise<void> {
      const absolute = absoluteUnderRoot(root, key);

      try {
        await unlink(absolute);
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code;

        if (code !== 'ENOENT') {
          throw error;
        }
      }
    },

    async deleteObjects(keys: string[]): Promise<void> {
      await Promise.all(keys.map((key) => this.deleteObject(key)));
    },

    getPublicUrl(key: string): string {
      return `${base}/${key}`;
    },
  };
}

export function resolveLocalMediaAbsolutePath(rootDir: string, key: string): string | null {
  const root = resolveLocalRoot(rootDir);
  const absolute = resolve(/*turbopackIgnore: true*/ root, key);

  if (!absolute.startsWith(root)) {
    return null;
  }

  return absolute;
}
