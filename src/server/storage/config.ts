export type MediaStorageDriver = 'local' | 'r2';

export type MediaStorageConfig = {
  driver: MediaStorageDriver;
  publicBaseUrl: string;
  localRoot: string;
  r2: {
    accountId: string;
    accessKeyId: string;
    secretAccessKey: string;
    bucket: string;
    publicBaseUrl: string;
    endpoint: string;
  } | null;
};

function trimSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

export function resolveMediaStorageConfig(): MediaStorageConfig {
  const siteUrl = trimSlash(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000');
  const explicit = process.env.MEDIA_STORAGE_DRIVER as MediaStorageDriver | undefined;

  const accountId = process.env.R2_ACCOUNT_ID?.trim() ?? '';
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim() ?? '';
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim() ?? '';
  const bucket = process.env.R2_BUCKET?.trim() ?? '';
  const r2Public = process.env.R2_PUBLIC_BASE_URL?.trim() ?? '';

  const r2Ready = Boolean(accountId && accessKeyId && secretAccessKey && bucket && r2Public);

  let driver: MediaStorageDriver = 'local';

  if (explicit === 'local' || explicit === 'r2') {
    driver = explicit;
  } else if (r2Ready) {
    driver = 'r2';
  }

  if (driver === 'r2' && !r2Ready) {
    throw new Error(
      'MEDIA_STORAGE_DRIVER=r2 exige R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET e R2_PUBLIC_BASE_URL'
    );
  }

  return {
    driver,
    publicBaseUrl: driver === 'r2' ? trimSlash(r2Public) : `${siteUrl}/api/media`,
    localRoot: process.env.MEDIA_LOCAL_ROOT?.trim() || '.data/media',
    r2: r2Ready
      ? {
          accountId,
          accessKeyId,
          secretAccessKey,
          bucket,
          publicBaseUrl: trimSlash(r2Public),
          endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        }
      : null,
  };
}
