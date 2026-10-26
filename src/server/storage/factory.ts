import { createLocalStorageProvider } from './local.provider';
import { createR2StorageProvider } from './r2.provider';
import { resolveMediaStorageConfig } from './config';
import type { ObjectStorageProvider } from './types';

let singleton: ObjectStorageProvider | null = null;

export function getObjectStorage(): ObjectStorageProvider {
  if (singleton) {
    return singleton;
  }

  const config = resolveMediaStorageConfig();

  if (config.driver === 'r2' && config.r2) {
    singleton = createR2StorageProvider({
      endpoint: config.r2.endpoint,
      accessKeyId: config.r2.accessKeyId,
      secretAccessKey: config.r2.secretAccessKey,
      bucket: config.r2.bucket,
      publicBaseUrl: config.r2.publicBaseUrl,
    });
  } else {
    singleton = createLocalStorageProvider({
      rootDir: config.localRoot,
      publicBaseUrl: config.publicBaseUrl,
    });
  }

  return singleton;
}

/** Testes / hot-reload. */
export function resetObjectStorage(): void {
  singleton = null;
}

export function getMediaStorageDriver(): 'local' | 'r2' {
  return resolveMediaStorageConfig().driver;
}
