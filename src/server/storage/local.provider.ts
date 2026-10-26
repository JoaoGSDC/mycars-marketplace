import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

import type { ObjectStorageProvider, PutObjectInput, PutObjectResult } from './types';

export function createLocalStorageProvider(options: {
  rootDir: string;
  publicBaseUrl: string;
}): ObjectStorageProvider {
  const root = resolve(process.cwd(), options.rootDir);
  const base = options.publicBaseUrl.replace(/\/+$/, '');

  return {
    driver: 'local',

    async putObject(input: PutObjectInput): Promise<PutObjectResult> {
      const absolute = join(root, input.key);
      await mkdir(dirname(absolute), { recursive: true });
      await writeFile(absolute, input.body);

      return { key: input.key, url: `${base}/${input.key}` };
    },

    async deleteObject(key: string): Promise<void> {
      const absolute = join(root, key);

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
  const root = resolve(process.cwd(), rootDir);
  const absolute = resolve(root, key);

  if (!absolute.startsWith(root)) {
    return null;
  }

  return absolute;
}
