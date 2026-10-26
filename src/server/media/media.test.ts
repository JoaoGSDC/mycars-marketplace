import assert from 'node:assert/strict';
import { mkdirSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { after, before, describe, it } from 'node:test';

import { migrate } from 'drizzle-orm/libsql/migrator';
import sharp from 'sharp';

const TEST_DB = resolve(process.cwd(), '.data/test-media.db');
const TEST_MEDIA = resolve(process.cwd(), '.data/test-media-files');

describe('mídia / object storage', () => {
  before(async () => {
    rmSync(TEST_DB, { force: true });
    rmSync(TEST_MEDIA, { recursive: true, force: true });
    mkdirSync(dirname(TEST_DB), { recursive: true });
    mkdirSync(TEST_MEDIA, { recursive: true });

    process.env.TURSO_DATABASE_URL = `file:${TEST_DB}`;
    delete process.env.TURSO_AUTH_TOKEN;
    process.env.MEDIA_STORAGE_DRIVER = 'local';
    process.env.MEDIA_LOCAL_ROOT = TEST_MEDIA;
    process.env.NEXT_PUBLIC_SITE_URL = 'http://localhost:3000';

    const { resetDbSingletons, getDb } = await import('@lib/db');
    const { resetObjectStorage } = await import('@server/storage');
    resetDbSingletons();
    resetObjectStorage();
    await migrate(getDb(), { migrationsFolder: resolve(process.cwd(), 'drizzle') });
  });

  after(async () => {
    const { resetDbSingletons } = await import('@lib/db');
    const { resetObjectStorage } = await import('@server/storage');
    resetDbSingletons();
    resetObjectStorage();
    rmSync(TEST_DB, { force: true });
    rmSync(TEST_MEDIA, { recursive: true, force: true });
  });

  it('detecta magic bytes e rejeita conteúdo falso', async () => {
    const { detectImageMime } = await import('@server/media/magic-bytes');

    const jpeg = await sharp({
      create: { width: 8, height: 8, channels: 3, background: '#336699' },
    })
      .jpeg()
      .toBuffer();

    assert.equal(detectImageMime(jpeg)?.mimeType, 'image/jpeg');

    const fake = Buffer.from('not-an-image-just-text-pretending');
    assert.equal(detectImageMime(fake), null);
  });

  it('faz upload autenticado, gera variantes e isola por loja', async () => {
    const { createStore } = await import('@server/stores/stores.service');
    const { createUser, addStoreMember } = await import('@server/users/users.service');
    const { STORE_STATUS } = await import('@app-types/status');
    const { STORE_ROLES } = await import('@app-types/membership');
    const { MEDIA_PURPOSE } = await import('@app-types/media');
    const { uploadStoreImage, deleteMediaAsset } = await import('@server/media/media.service');

    const store = await createStore({
      legalName: 'Media Loja',
      tradeName: 'Media',
      publicName: 'Media',
      slug: 'media-loja',
      subdomain: 'medialoja',
      city: 'SP',
      state: 'SP',
      status: STORE_STATUS.ACTIVE,
      verified: true,
    });
    assert.equal(store.ok, true);
    if (!store.ok) return;

    const other = await createStore({
      legalName: 'Outra Media',
      tradeName: 'Outra',
      publicName: 'Outra',
      slug: 'outra-media',
      subdomain: 'outramedia',
      city: 'SP',
      state: 'SP',
      status: STORE_STATUS.ACTIVE,
      verified: true,
    });
    assert.equal(other.ok, true);
    if (!other.ok) return;

    const owner = await createUser({ email: 'media-owner@media.test', name: 'Owner' });
    assert.equal(owner.ok, true);
    if (!owner.ok) return;

    const stranger = await createUser({ email: 'media-stranger@media.test', name: 'Stranger' });
    assert.equal(stranger.ok, true);
    if (!stranger.ok) return;

    await addStoreMember({
      storeId: store.data.id,
      userId: owner.data.id,
      role: STORE_ROLES.OWNER,
    });

    const png = await sharp({
      create: { width: 640, height: 480, channels: 3, background: '#112233' },
    })
      .png()
      .toBuffer();

    const uploaded = await uploadStoreImage({
      storeId: store.data.id,
      purpose: MEDIA_PURPOSE.VEHICLE_PHOTO,
      fileBuffer: png,
      actorUserId: owner.data.id,
    });
    assert.equal(uploaded.ok, true);
    if (!uploaded.ok) return;

    assert.ok(uploaded.data.url.includes('/api/media/'));
    assert.ok(uploaded.data.cardUrl);
    assert.ok(uploaded.data.detailUrl);
    assert.equal(uploaded.data.mimeType, 'image/webp');

    const denied = await uploadStoreImage({
      storeId: store.data.id,
      purpose: MEDIA_PURPOSE.VEHICLE_PHOTO,
      fileBuffer: png,
      actorUserId: stranger.data.id,
    });
    assert.equal(denied.ok, false);

    const crossDelete = await deleteMediaAsset({
      storeId: other.data.id,
      assetId: uploaded.data.assetId,
      actorUserId: owner.data.id,
    });
    assert.equal(crossDelete.ok, false);

    const removed = await deleteMediaAsset({
      storeId: store.data.id,
      assetId: uploaded.data.assetId,
      actorUserId: owner.data.id,
    });
    assert.equal(removed.ok, true);
  });

  it('rejeita arquivo acima do limite', async () => {
    const { createStore } = await import('@server/stores/stores.service');
    const { createUser, addStoreMember } = await import('@server/users/users.service');
    const { STORE_STATUS } = await import('@app-types/status');
    const { STORE_ROLES } = await import('@app-types/membership');
    const { MEDIA_PURPOSE } = await import('@app-types/media');
    const { uploadStoreImage } = await import('@server/media/media.service');

    const store = await createStore({
      legalName: 'Limite Loja',
      tradeName: 'Limite',
      publicName: 'Limite',
      slug: 'limite-loja',
      subdomain: 'limiteloja',
      city: 'SP',
      state: 'SP',
      status: STORE_STATUS.ACTIVE,
      verified: true,
    });
    assert.equal(store.ok, true);
    if (!store.ok) return;

    const user = await createUser({ email: 'limite@media.test', name: 'Limite' });
    assert.equal(user.ok, true);
    if (!user.ok) return;

    await addStoreMember({
      storeId: store.data.id,
      userId: user.data.id,
      role: STORE_ROLES.OWNER,
    });

    const huge = Buffer.alloc(9 * 1024 * 1024, 0xff);
    huge[0] = 0xff;
    huge[1] = 0xd8;
    huge[2] = 0xff;

    const result = await uploadStoreImage({
      storeId: store.data.id,
      purpose: MEDIA_PURPOSE.VEHICLE_PHOTO,
      fileBuffer: huge,
      actorUserId: user.data.id,
    });
    assert.equal(result.ok, false);
  });
});
