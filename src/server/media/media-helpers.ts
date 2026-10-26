import { attachMediaAssets, deleteStorageKeys } from './media.service';

/** Evita import circular no vehicles.service. */
export async function insertMediaAssetsAttach(input: {
  storeId: string;
  assetIds: string[];
  entityType: string;
  entityId: string;
  actorUserId: string;
}) {
  return attachMediaAssets(input);
}

export async function deleteStorageKeysSafe(keys: string[]) {
  await deleteStorageKeys(keys);
}
