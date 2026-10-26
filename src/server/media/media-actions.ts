'use server';

import { MEDIA_PURPOSE, type MediaPurpose } from '@app-types/media';
import { requireSession } from '@server/auth/access';
import { deleteMediaAsset, uploadStoreImage } from '@server/media/media.service';

function fail(message: string, code?: string) {
  return { ok: false as const, message, code };
}

const PURPOSE_SET = new Set<string>(Object.values(MEDIA_PURPOSE));

export async function uploadMediaAction(formData: FormData) {
  const session = await requireSession();

  if (!session.ok) {
    return fail(session.message, session.code);
  }

  const storeId = String(formData.get('storeId') ?? '');
  const purposeRaw = String(formData.get('purpose') ?? '');
  const entityType = formData.get('entityType');
  const entityId = formData.get('entityId');
  const file = formData.get('file');

  if (!storeId || !PURPOSE_SET.has(purposeRaw)) {
    return fail('Parâmetros de upload inválidos', 'VALIDATION');
  }

  if (!(file instanceof File)) {
    return fail('Arquivo obrigatório', 'VALIDATION');
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  const result = await uploadStoreImage({
    storeId,
    purpose: purposeRaw as MediaPurpose,
    fileBuffer: buffer,
    actorUserId: session.data.userId,
    entityType: typeof entityType === 'string' ? entityType : null,
    entityId: typeof entityId === 'string' ? entityId : null,
  });

  if (!result.ok) {
    return fail(result.message, result.code);
  }

  return { ok: true as const, data: result.data };
}

export async function deleteMediaAssetAction(storeId: string, assetId: string) {
  const session = await requireSession();

  if (!session.ok) {
    return fail(session.message, session.code);
  }

  const result = await deleteMediaAsset({
    storeId,
    assetId,
    actorUserId: session.data.userId,
  });

  if (!result.ok) {
    return fail(result.message, result.code);
  }

  return { ok: true as const };
}
