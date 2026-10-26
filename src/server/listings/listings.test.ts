import assert from 'node:assert/strict';
import { mkdirSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { after, before, describe, it } from 'node:test';

import { migrate } from 'drizzle-orm/libsql/migrator';

const TEST_DB = resolve(process.cwd(), '.data/test-listings.db');

describe('módulo de anúncios', () => {
  before(async () => {
    rmSync(TEST_DB, { force: true });
    mkdirSync(dirname(TEST_DB), { recursive: true });

    process.env.TURSO_DATABASE_URL = `file:${TEST_DB}`;
    delete process.env.TURSO_AUTH_TOKEN;
    process.env.MEDIA_STORAGE_DRIVER = 'local';
    process.env.MEDIA_LOCAL_ROOT = resolve(process.cwd(), '.data/test-listings-media');
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
  });

  async function seedOwnerStore(slug: string, email: string, status: string = 'active') {
    const { createStore } = await import('@server/stores/stores.service');
    const { createUser, addStoreMember } = await import('@server/users/users.service');
    const { STORE_ROLES } = await import('@app-types/membership');

    const store = await createStore({
      legalName: `${slug} LTDA`,
      tradeName: slug,
      publicName: slug,
      slug,
      subdomain: slug.replace(/-/g, ''),
      city: 'Campinas',
      state: 'SP',
      status,
      verified: true,
    });
    assert.equal(store.ok, true);
    if (!store.ok) throw new Error(store.message);

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

  async function seedAvailableVehicle(storeId: string, actorUserId: string, plate: string) {
    const { createVehicle } = await import('@server/vehicles/vehicles.service');
    const { VEHICLE_STATUS } = await import('@app-types/status');
    const { VEHICLE_OWNERSHIP } = await import('@app-types/membership');
    const { insertVehicleMedia } = await import('@server/repositories/vehicle-media.repository');

    const vehicle = await createVehicle(
      {
        storeId,
        make: 'Toyota',
        makeSlug: 'toyota',
        model: 'Corolla',
        modelSlug: 'corolla',
        version: 'XEi',
        condition: 'used',
        status: VEHICLE_STATUS.AVAILABLE,
        ownership: VEHICLE_OWNERSHIP.OWN,
        enteredAt: new Date().toISOString(),
        mileageKm: 20000,
        fuel: 'flex',
        transmission: 'automatic',
        yearManufacture: 2020,
        yearModel: 2021,
        bodyType: 'sedan',
        plate,
        askingPriceCents: 9000000,
      },
      actorUserId
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

    return { vehicle: vehicle.data, media };
  }

  it('publica veículo elegível, rejeita inválidos, pausa/retoma e encerra na venda', async () => {
    const {
      createListingForStore,
      transitionListing,
      updateListing,
      getPublicVehicleListingBySlug,
      listPublicVehicleListings,
    } = await import('@server/listings/listings.service');
    const { transitionVehicleStatus } = await import('@server/vehicles/vehicles.service');
    const { LISTING_STATUS, VEHICLE_STATUS, STORE_STATUS } = await import('@app-types/status');
    const { createUser, addStoreMember } = await import('@server/users/users.service');
    const { STORE_ROLES } = await import('@app-types/membership');
    const { isPubliclyListable } = await import('@lib/catalog/is-publicly-listable');
    const { assertCanPublishListing } = await import('@server/listings/listing-eligibility');

    const a = await seedOwnerStore('listings-loja-a', 'listings-a@test.example');
    const { vehicle, media } = await seedAvailableVehicle(a.store.id, a.user.id, 'LST1A23');

    const preparingBlocked = assertCanPublishListing({
      vehicleStatus: VEHICLE_STATUS.PREPARING,
      storeStatus: STORE_STATUS.ACTIVE,
      hasPhotos: true,
      priceCents: 1000,
      title: 'Ok',
    });
    assert.equal(preparingBlocked.ok, false);

    const created = await createListingForStore(
      {
        storeId: a.store.id,
        vehicleId: vehicle.id,
        title: 'Corolla XEi anúncio',
        description: 'Descrição comercial pública',
        priceCents: 9500000,
        mediaIds: [media.id],
        status: LISTING_STATUS.DRAFT,
      },
      a.user.id
    );
    assert.equal(created.ok, true);
    if (!created.ok) return;

    const published = await transitionListing(
      {
        storeId: a.store.id,
        listingId: created.data.id,
        toStatus: LISTING_STATUS.PUBLISHED,
      },
      a.user.id
    );
    assert.equal(published.ok, true);

    const publicItem = await getPublicVehicleListingBySlug(created.data.slug);
    assert.ok(publicItem);
    assert.equal(isPubliclyListable(publicItem!), true);
    assert.equal(publicItem?.price, 95000);

    const priceUpdate = await updateListing(
      {
        storeId: a.store.id,
        listingId: created.data.id,
        priceCents: 9200000,
      },
      a.user.id
    );
    assert.equal(priceUpdate.ok, true);

    const afterPrice = await getPublicVehicleListingBySlug(created.data.slug);
    assert.equal(afterPrice?.price, 92000);
    assert.equal(afterPrice?.previousPrice, 95000);

    const paused = await transitionListing(
      {
        storeId: a.store.id,
        listingId: created.data.id,
        toStatus: LISTING_STATUS.PAUSED,
      },
      a.user.id
    );
    assert.equal(paused.ok, true);
    assert.equal(await getPublicVehicleListingBySlug(created.data.slug), undefined);

    const resumed = await transitionListing(
      {
        storeId: a.store.id,
        listingId: created.data.id,
        toStatus: LISTING_STATUS.PUBLISHED,
      },
      a.user.id
    );
    assert.equal(resumed.ok, true);
    assert.ok(await getPublicVehicleListingBySlug(created.data.slug));

    const sold = await transitionVehicleStatus(
      {
        storeId: a.store.id,
        vehicleId: vehicle.id,
        toStatus: VEHICLE_STATUS.SOLD,
        source: 'sale',
      },
      a.user.id
    );
    assert.equal(sold.ok, true);
    assert.equal(await getPublicVehicleListingBySlug(created.data.slug), undefined);

    const list = await listPublicVehicleListings();
    assert.ok(!list.some((item) => item.slug === created.data.slug));
  });

  it('bloqueia publicação com loja suspensa e usuário sem permissão', async () => {
    const { createListingForStore, transitionListing, suspendListingsForStore } = await import(
      '@server/listings/listings.service'
    );
    const { LISTING_STATUS, STORE_STATUS } = await import('@app-types/status');
    const { createUser, addStoreMember } = await import('@server/users/users.service');
    const { STORE_ROLES } = await import('@app-types/membership');
    const { updateStore } = await import('@server/repositories/stores.repository');

    const a = await seedOwnerStore('listings-loja-b', 'listings-b@test.example');
    const { vehicle, media } = await seedAvailableVehicle(a.store.id, a.user.id, 'LST2B34');

    const operator = await createUser({ email: 'op-listings@test.example', name: 'Op' });
    assert.equal(operator.ok, true);
    if (!operator.ok) return;

    await addStoreMember({
      storeId: a.store.id,
      userId: operator.data.id,
      role: STORE_ROLES.OPERATOR,
    });

    const asOperator = await createListingForStore(
      {
        storeId: a.store.id,
        vehicleId: vehicle.id,
        title: 'Tentativa operador',
        description: 'x',
        priceCents: 1000000,
        mediaIds: [media.id],
        status: LISTING_STATUS.DRAFT,
      },
      operator.data.id
    );
    assert.equal(asOperator.ok, false);

    const draft = await createListingForStore(
      {
        storeId: a.store.id,
        vehicleId: vehicle.id,
        title: 'Antes suspensão',
        description: 'x',
        priceCents: 1000000,
        mediaIds: [media.id],
        status: LISTING_STATUS.DRAFT,
      },
      a.user.id
    );
    assert.equal(draft.ok, true);
    if (!draft.ok) return;

    await transitionListing(
      {
        storeId: a.store.id,
        listingId: draft.data.id,
        toStatus: LISTING_STATUS.PUBLISHED,
      },
      a.user.id
    );

    await updateStore(a.store.id, { status: STORE_STATUS.SUSPENDED });
    await suspendListingsForStore(a.store.id, a.user.id);

    const resumeBlocked = await transitionListing(
      {
        storeId: a.store.id,
        listingId: draft.data.id,
        toStatus: LISTING_STATUS.PUBLISHED,
      },
      a.user.id
    );
    assert.equal(resumeBlocked.ok, false);
  });

  it('preserva contrato isPubliclyListable', async () => {
    const { isPubliclyListable } = await import('@lib/catalog/is-publicly-listable');
    const { LISTING_STATUS, VEHICLE_STATUS, STORE_STATUS } = await import('@app-types/status');
    const { isListingRowPubliclyVisible } = await import('@server/listings/listing-eligibility');

    const base = {
      id: '1',
      slug: 'x',
      make: 'A',
      makeSlug: 'a',
      model: 'B',
      modelSlug: 'b',
      version: '1',
      price: 10,
      condition: 'used' as const,
      status: VEHICLE_STATUS.AVAILABLE,
      listingStatus: LISTING_STATUS.PUBLISHED,
      publishedAt: new Date().toISOString(),
      description: '',
      specs: {
        mileageKm: 1,
        fuel: 'flex' as const,
        transmission: 'manual' as const,
        yearManufacture: 2020,
        yearModel: 2020,
        bodyType: 'hatch' as const,
      },
      store: {
        id: 's',
        slug: 's',
        name: 'S',
        city: 'C',
        state: 'SP',
        storeStatus: STORE_STATUS.ACTIVE,
      },
    };

    assert.equal(isPubliclyListable(base), true);
    assert.equal(
      isPubliclyListable({ ...base, status: VEHICLE_STATUS.PREPARING }),
      false
    );
    assert.equal(
      isPubliclyListable({ ...base, listingStatus: LISTING_STATUS.PAUSED }),
      false
    );
    assert.equal(
      isListingRowPubliclyVisible({
        listingStatus: LISTING_STATUS.PUBLISHED,
        vehicleStatus: VEHICLE_STATUS.AVAILABLE,
        storeStatus: STORE_STATUS.ACTIVE,
      }),
      true
    );
  });
});
