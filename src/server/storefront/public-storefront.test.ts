import assert from 'node:assert/strict';
import { mkdirSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { after, before, describe, it } from 'node:test';

import { migrate } from 'drizzle-orm/libsql/migrator';

const TEST_DB = resolve(process.cwd(), '.data/test-storefront.db');

describe('vitrines por loja', () => {
  before(async () => {
    rmSync(TEST_DB, { force: true });
    mkdirSync(dirname(TEST_DB), { recursive: true });

    process.env.TURSO_DATABASE_URL = `file:${TEST_DB}`;
    delete process.env.TURSO_AUTH_TOKEN;
    process.env.MEDIA_STORAGE_DRIVER = 'local';
    process.env.MEDIA_LOCAL_ROOT = resolve(process.cwd(), '.data/test-storefront-media');
    process.env.NEXT_PUBLIC_SITE_URL = 'http://localhost:3000';
    process.env.ROOT_DOMAIN = 'localhost:3000';

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
  });

  async function seedStore(slug: string, subdomain: string, email: string) {
    const { createStore } = await import('@server/stores/stores.service');
    const { createUser, addStoreMember } = await import('@server/users/users.service');
    const { STORE_ROLES } = await import('@app-types/membership');
    const { upsertStorefrontSettings } = await import(
      '@server/repositories/storefront-settings.repository'
    );

    const store = await createStore({
      legalName: `${slug} LTDA`,
      tradeName: slug,
      publicName: slug,
      slug,
      subdomain,
      city: 'Curitiba',
      state: 'PR',
      status: 'active',
      verified: true,
    });
    assert.equal(store.ok, true);
    if (!store.ok) throw new Error(store.message);

    await upsertStorefrontSettings({
      storeId: store.data.id,
      tagline: `Vitrine ${slug}`,
      about: 'Loja de testes',
      primaryColor: '#C93A0C',
      whatsappNumber: '41999990000',
    });

    const user = await createUser({ email, name: 'Owner' });
    assert.equal(user.ok, true);
    if (!user.ok) throw new Error(user.message);

    await addStoreMember({
      storeId: store.data.id,
      userId: user.data.id,
      role: STORE_ROLES.OWNER,
    });

    return { store: store.data, user: user.data };
  }

  async function publishVehicle(storeId: string, userId: string, plate: string) {
    const { createVehicle } = await import('@server/vehicles/vehicles.service');
    const { VEHICLE_STATUS, LISTING_STATUS } = await import('@app-types/status');
    const { VEHICLE_OWNERSHIP } = await import('@app-types/membership');
    const { insertVehicleMedia } = await import('@server/repositories/vehicle-media.repository');
    const { createListingForStore, transitionListing } = await import(
      '@server/listings/listings.service'
    );

    const vehicle = await createVehicle(
      {
        storeId,
        make: 'Fiat',
        makeSlug: 'fiat',
        model: 'Argo',
        modelSlug: 'argo',
        version: 'Drive',
        condition: 'used',
        status: VEHICLE_STATUS.AVAILABLE,
        ownership: VEHICLE_OWNERSHIP.OWN,
        enteredAt: new Date().toISOString(),
        mileageKm: 10000,
        fuel: 'flex',
        transmission: 'manual',
        yearManufacture: 2021,
        yearModel: 2022,
        bodyType: 'hatch',
        plate,
        askingPriceCents: 7000000,
      },
      userId
    );
    assert.equal(vehicle.ok, true);
    if (!vehicle.ok) throw new Error(vehicle.message);

    const media = await insertVehicleMedia({
      storeId,
      vehicleId: vehicle.data.id,
      url: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800',
      cardUrl: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=400',
      detailUrl: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=1200',
      sortOrder: 0,
      isPrimary: 'true',
    });

    const listing = await createListingForStore(
      {
        storeId,
        vehicleId: vehicle.data.id,
        title: 'Argo Drive',
        description: 'Anúncio da vitrine',
        priceCents: 7200000,
        mediaIds: [media.id],
        status: LISTING_STATUS.DRAFT,
      },
      userId
    );
    assert.equal(listing.ok, true);
    if (!listing.ok) throw new Error(listing.message);

    await transitionListing(
      {
        storeId,
        listingId: listing.data.id,
        toStatus: LISTING_STATUS.PUBLISHED,
      },
      userId
    );

    return listing.data;
  }

  it('dois subdomínios isolam o catálogo', async () => {
    const { mapStoreToPublicStorefront, searchStorefrontVehiclesUncached } = await import(
      '@server/storefront/public-storefront.service'
    );
    const storesRepo = await import('@server/repositories/stores.repository');
    const { createEmptyVehicleSearchParams } = await import('@utils/vehicle-search-params');

    const a = await seedStore('vitrine-a', 'vitrine-a', 'va@test.example');
    const b = await seedStore('vitrine-b', 'vitrine-b', 'vb@test.example');

    const listingA = await publishVehicle(a.store.id, a.user.id, 'VIT1A11');
    const listingB = await publishVehicle(b.store.id, b.user.id, 'VIT1B22');

    const rowA = await storesRepo.findStoreBySubdomain('vitrine-a');
    const rowB = await storesRepo.findStoreBySubdomain('vitrine-b');
    assert.ok(rowA);
    assert.ok(rowB);

    const sfA = await mapStoreToPublicStorefront(rowA!.id, 'subdomain');
    const sfB = await mapStoreToPublicStorefront(rowB!.id, 'subdomain');
    assert.ok(sfA);
    assert.ok(sfB);
    assert.equal(sfA?.slug, 'vitrine-a');
    assert.equal(sfB?.slug, 'vitrine-b');
    assert.ok(sfA?.canonicalUrl.includes('vitrine-a.localhost'));

    const searchA = await searchStorefrontVehiclesUncached(
      a.store.id,
      createEmptyVehicleSearchParams()
    );
    const searchB = await searchStorefrontVehiclesUncached(
      b.store.id,
      createEmptyVehicleSearchParams()
    );

    assert.equal(searchA.total, 1);
    assert.equal(searchB.total, 1);
    assert.equal(searchA.items[0]?.slug, listingA.slug);
    assert.equal(searchB.items[0]?.slug, listingB.slug);
    assert.equal(
      searchA.items.some((item) => item.slug === listingB.slug),
      false
    );
  });

  it('alteração de slug registra redirect', async () => {
    const { updateStorefrontSetup } = await import('@server/onboarding/onboarding.service');
    const { resolveSlugRedirect, mapStoreToPublicStorefront } = await import(
      '@server/storefront/public-storefront.service'
    );
    const storesRepo = await import('@server/repositories/stores.repository');

    const owner = await seedStore('vitrine-c', 'vitrine-c', 'vc@test.example');

    const updated = await updateStorefrontSetup(
      {
        storeId: owner.store.id,
        publicName: 'Vitrine C Nova',
        slug: 'vitrine-c-nova',
        subdomain: 'vitrine-c',
        primaryColor: '#C93A0C',
        businessHoursJson: '[]',
      },
      owner.user.id
    );
    assert.equal(updated.ok, true);

    assert.equal(await resolveSlugRedirect('vitrine-c'), 'vitrine-c-nova');
    const row = await storesRepo.findStoreBySlug('vitrine-c-nova');
    assert.ok(row);
    const sf = await mapStoreToPublicStorefront(row!.id, 'path');
    assert.equal(sf?.name, 'Vitrine C Nova');
  });
});
