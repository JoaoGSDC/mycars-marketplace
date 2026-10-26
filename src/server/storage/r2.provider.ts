import { DeleteObjectCommand, DeleteObjectsCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

import type { ObjectStorageProvider, PutObjectInput, PutObjectResult } from './types';

export function createR2StorageProvider(options: {
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicBaseUrl: string;
}): ObjectStorageProvider {
  const client = new S3Client({
    region: 'auto',
    endpoint: options.endpoint,
    credentials: {
      accessKeyId: options.accessKeyId,
      secretAccessKey: options.secretAccessKey,
    },
  });

  const base = options.publicBaseUrl.replace(/\/+$/, '');

  return {
    driver: 'r2',

    async putObject(input: PutObjectInput): Promise<PutObjectResult> {
      await client.send(
        new PutObjectCommand({
          Bucket: options.bucket,
          Key: input.key,
          Body: input.body,
          ContentType: input.contentType,
          CacheControl: input.cacheControl ?? 'public, max-age=31536000, immutable',
        })
      );

      return { key: input.key, url: `${base}/${input.key}` };
    },

    async deleteObject(key: string): Promise<void> {
      await client.send(
        new DeleteObjectCommand({
          Bucket: options.bucket,
          Key: key,
        })
      );
    },

    async deleteObjects(keys: string[]): Promise<void> {
      if (keys.length === 0) {
        return;
      }

      const chunkSize = 1000;

      for (let i = 0; i < keys.length; i += chunkSize) {
        const chunk = keys.slice(i, i + chunkSize);
        await client.send(
          new DeleteObjectsCommand({
            Bucket: options.bucket,
            Delete: {
              Objects: chunk.map((Key) => ({ Key })),
              Quiet: true,
            },
          })
        );
      }
    },

    getPublicUrl(key: string): string {
      return `${base}/${key}`;
    },
  };
}
