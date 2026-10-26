import { MEDIA_ASSET_STATUS, MEDIA_PURPOSE, type MediaPurpose, type UploadedMediaResult } from '@app-types/media';
import { PERMISSIONS } from '@app-types/permissions';
import { createId } from '@lib/db';
import { authorizeStoreAction } from '@server/auth/access';
import * as auditRepo from '@server/repositories/audit-events.repository';
import * as mediaAssetsRepo from '@server/repositories/media-assets.repository';
import { getObjectStorage } from '@server/storage';
import { serviceError, serviceSuccess, type ServiceResult } from '@server/shared/service-result';

import { processImageForPurpose } from './image-process';
import { assertAllowedImageMime, detectImageMime } from './magic-bytes';
import {
  MEDIA_MAX_BYTES,
  MEDIA_ORPHAN_TTL_MS,
  MEDIA_UPLOAD_RETRIES,
} from './media.constants';

function purposePermission(purpose: MediaPurpose) {
  if (purpose === MEDIA_PURPOSE.VEHICLE_PHOTO) {
    return PERMISSIONS.VEHICLES_WRITE;
  }

  return PERMISSIONS.STOREFRONT_WRITE;
}

function buildObjectKey(input: {
  storeId: string;
  purpose: MediaPurpose;
  assetId: string;
  variant: string;
}): string {
  return `stores/${input.storeId}/${input.purpose}/${input.assetId}/${input.variant}.webp`;
}

async function putWithRetry(
  key: string,
  body: Buffer,
  contentType: string
): Promise<{ key: string; url: string }> {
  const storage = getObjectStorage();
  let lastError: unknown;

  for (let attempt = 0; attempt <= MEDIA_UPLOAD_RETRIES; attempt += 1) {
    try {
      return await storage.putObject({ key, body, contentType });
    } catch (error) {
      lastError = error;

      if (attempt < MEDIA_UPLOAD_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, 150 * (attempt + 1)));
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Falha no upload para o storage');
}

export async function uploadStoreImage(input: {
  storeId: string;
  purpose: MediaPurpose;
  fileBuffer: Buffer;
  actorUserId: string;
  entityType?: string | null;
  entityId?: string | null;
}): Promise<ServiceResult<UploadedMediaResult>> {
  const access = await authorizeStoreAction(
    input.actorUserId,
    input.storeId,
    purposePermission(input.purpose)
  );

  if (!access.ok) {
    return access;
  }

  const maxBytes = MEDIA_MAX_BYTES[input.purpose];

  if (input.fileBuffer.byteLength > maxBytes) {
    return serviceError(
      'VALIDATION',
      `Arquivo excede o limite de ${Math.round(maxBytes / (1024 * 1024))} MB`
    );
  }

  if (input.fileBuffer.byteLength < 32) {
    return serviceError('VALIDATION', 'Arquivo inválido ou vazio');
  }

  const detected = detectImageMime(input.fileBuffer);

  if (!detected || !assertAllowedImageMime(detected.mimeType)) {
    return serviceError('VALIDATION', 'Formato não suportado. Use JPEG, PNG ou WebP');
  }

  let processed;

  try {
    processed = await processImageForPurpose(input.fileBuffer, input.purpose);
  } catch {
    return serviceError('VALIDATION', 'Não foi possível processar a imagem');
  }

  const assetId = createId();
  const uploadedVariants: Array<{ name: string; key: string; url: string }> = [];

  try {
    for (const variant of processed.variants) {
      const key = buildObjectKey({
        storeId: input.storeId,
        purpose: input.purpose,
        assetId,
        variant: variant.name,
      });
      const put = await putWithRetry(key, variant.buffer, variant.mimeType);
      uploadedVariants.push({ name: variant.name, key: put.key, url: put.url });
    }
  } catch {
    const storage = getObjectStorage();
    await storage.deleteObjects(uploadedVariants.map((v) => v.key)).catch(() => undefined);

    return serviceError('INTERNAL', 'Falha ao enviar imagem ao armazenamento');
  }

  const detail = uploadedVariants.find((v) => v.name === 'detail');
  const card = uploadedVariants.find((v) => v.name === 'card');
  const primary =
    uploadedVariants.find((v) => v.name === processed.primary.name) ?? uploadedVariants[0]!;

  const asset = await mediaAssetsRepo.insertMediaAsset({
    id: assetId,
    storeId: input.storeId,
    purpose: input.purpose,
    status:
      input.entityId != null
        ? MEDIA_ASSET_STATUS.ATTACHED
        : MEDIA_ASSET_STATUS.PENDING,
    entityType: input.entityType ?? null,
    entityId: input.entityId ?? null,
    storageKey: primary.key,
    url: primary.url,
    cardUrl: card?.url ?? null,
    detailUrl: detail?.url ?? primary.url,
    mimeType: processed.primary.mimeType,
    byteSize: processed.primary.byteSize,
    width: processed.primary.width,
    height: processed.primary.height,
    variantKeysJson: JSON.stringify(uploadedVariants.map((v) => v.key)),
    uploadedByUserId: input.actorUserId,
  });

  await auditRepo.insertAuditEvent({
    storeId: input.storeId,
    actorUserId: input.actorUserId,
    action: 'media.uploaded',
    entityType: 'media_asset',
    entityId: asset.id,
    payloadJson: JSON.stringify({
      purpose: input.purpose,
      byteSize: asset.byteSize,
      driver: getObjectStorage().driver,
    }),
  });

  return serviceSuccess({
    assetId: asset.id,
    url: asset.url,
    cardUrl: asset.cardUrl,
    detailUrl: asset.detailUrl,
    storageKey: asset.storageKey,
    width: asset.width ?? processed.primary.width,
    height: asset.height ?? processed.primary.height,
    mimeType: asset.mimeType,
    byteSize: asset.byteSize,
  });
}

export async function deleteMediaAsset(input: {
  storeId: string;
  assetId: string;
  actorUserId: string;
}): Promise<ServiceResult<{ id: string }>> {
  const asset = await mediaAssetsRepo.findMediaAssetInStore(input.storeId, input.assetId);

  if (!asset) {
    return serviceError('NOT_FOUND', 'Mídia não encontrada nesta loja');
  }

  const access = await authorizeStoreAction(
    input.actorUserId,
    input.storeId,
    purposePermission(asset.purpose as MediaPurpose)
  );

  if (!access.ok) {
    return access;
  }

  let keys: string[] = [];

  try {
    keys = JSON.parse(asset.variantKeysJson) as string[];
  } catch {
    keys = [asset.storageKey];
  }

  const storage = getObjectStorage();
  await storage.deleteObjects(keys);

  await mediaAssetsRepo.updateMediaAsset(asset.id, {
    status: MEDIA_ASSET_STATUS.DELETED,
  });

  await auditRepo.insertAuditEvent({
    storeId: input.storeId,
    actorUserId: input.actorUserId,
    action: 'media.deleted',
    entityType: 'media_asset',
    entityId: asset.id,
    payloadJson: JSON.stringify({ keys }),
  });

  return serviceSuccess({ id: asset.id });
}

export async function attachMediaAssets(input: {
  storeId: string;
  assetIds: string[];
  entityType: string;
  entityId: string;
  actorUserId: string;
}): Promise<ServiceResult<{ attached: number }>> {
  const access = await authorizeStoreAction(
    input.actorUserId,
    input.storeId,
    PERMISSIONS.VEHICLES_WRITE
  );

  if (!access.ok) {
    return access;
  }

  const validIds: string[] = [];

  for (const id of input.assetIds) {
    const asset = await mediaAssetsRepo.findMediaAssetInStore(input.storeId, id);

    if (asset && asset.status !== MEDIA_ASSET_STATUS.DELETED) {
      validIds.push(id);
    }
  }

  await mediaAssetsRepo.markAssetsAttached(
    input.storeId,
    validIds,
    input.entityType,
    input.entityId
  );

  return serviceSuccess({ attached: validIds.length });
}

/** Remove uploads pending antigos (órfãos). */
export async function cleanupOrphanMediaAssets(): Promise<{ removed: number }> {
  const cutoff = new Date(Date.now() - MEDIA_ORPHAN_TTL_MS).toISOString();
  const pending = await mediaAssetsRepo.listPendingOlderThan(cutoff);
  const storage = getObjectStorage();
  let removed = 0;

  for (const asset of pending) {
    let keys: string[] = [];

    try {
      keys = JSON.parse(asset.variantKeysJson) as string[];
    } catch {
      keys = [asset.storageKey];
    }

    await storage.deleteObjects(keys).catch(() => undefined);
    await mediaAssetsRepo.updateMediaAsset(asset.id, {
      status: MEDIA_ASSET_STATUS.ORPHANED,
    });
    removed += 1;
  }

  return { removed };
}

export async function deleteStorageKeys(keys: string[]): Promise<void> {
  if (keys.length === 0) {
    return;
  }

  await getObjectStorage().deleteObjects(keys);
}
