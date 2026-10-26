import assert from 'node:assert/strict';
import { mkdirSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { after, before, describe, it } from 'node:test';

import { migrate } from 'drizzle-orm/libsql/migrator';

const TEST_DB = resolve(process.cwd(), '.data/test-public-catalog.db');

describe('catálogo público (Turso)', () => {
  before(async () => {
    rmSync(TEST_DB, { force: true });
    mkdirSync(dirname(TEST_DB), { recursive: true });

    process.env.TURSO_DATABASE_URL = `file:${TEST_DB}`;
    delete process.env.TURSO_AUTH_TOKEN;
    process.env.MEDIA_STORAGE_DRIVER = 'local';
    process.env.MEDIA_LOCAL_ROOT = resolve(process.cwd(), '.data/test-public-catalog-media');
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

  async function seedOwnerStore(
    slug: string,
    email: string,
    opts: { city?: string; state?: string; status?: string; verified?: boolean } = {}
  ) {
    const { createStore } = await import('@server/stores/stores.service');
    const { createUser, addStoreMember } = await import('@server/users/users.service');
    const { STORE_ROLES } = await import('@app-types/membership');

    const store = await createStore({
      legalName: `${slug} LTDA`,
      tradeName: slug,
      publicName: slug,
      slug,
      subdomain: slug.replace(/-/g, ''),
      city: opts.city ?? 'Campinas',
      state: opts.state ?? 'SP',
      status: opts.status ?? 'active',
      verified: opts.verified ?? true,
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

  async function seedVehicle(
    storeId: string,
    actorUserId: string,
    plate: string,
    overrides: Record<string, unknown> = {}
  ) {
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
        ...overrides,
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

  async function publishListing(
    storeId: string,
    vehicleId: string,
    mediaId: string,
    actorUserId: string,
    priceCents: number,
    title: string
  ) {
    const { createListingForStore, transitionListing } = await import(
      '@server/listings/listings.service'
    );
    const { LISTING_STATUS } = await import('@app-types/status');

    const created = await createListingForStore(
      {
        storeId,
        vehicleId,
        title,
        description: 'Anúncio de teste do catálogo público',
        priceCents,
        mediaIds: [mediaId],
        status: LISTING_STATUS.DRAFT,
      },
      actorUserId
    );
    assert.equal(created.ok, true);
    if (!created.ok) throw new Error(created.message);

    const published = await transitionListing(
      {
        storeId,
        listingId: created.data.id,
        toStatus: LISTING_STATUS.PUBLISHED,
      },
      actorUserId
    );
    assert.equal(published.ok, true);
    if (!published.ok) throw new Error(published.message);

    return created.data;
  }

  it('marketplace vazio: busca e contagens zeradas', async () => {
    const { searchPublicVehiclesUncached } = await import('@server/catalog/public-catalog.service');
    const { selectPublicMarketStats, selectPublicBodyCounts } = await import(
      '@server/catalog/public-search.repository'
    );
    const { createEmptyVehicleSearchParams } = await import('@utils/vehicle-search-params');

    const empty = await searchPublicVehiclesUncached(createEmptyVehicleSearchParams());
    assert.equal(empty.total, 0);
    assert.equal(empty.items.length, 0);
    assert.equal(empty.totalPaginas, 1);

    const stats = await selectPublicMarketStats();
    assert.equal(stats.listedVehicles, 0);

    const categories = await selectPublicBodyCounts();
    assert.equal(categories.length, 0);
  });

  it('filtros, ordenação, paginação, contagem e exclusão de inelegíveis', async () => {
    const { searchPublicVehiclesUncached } = await import('@server/catalog/public-catalog.service');
    const { selectPublicConditionLatest } = await import('@server/catalog/public-search.repository');
    const { transitionListing } = await import('@server/listings/listings.service');
    const { LISTING_STATUS, VEHICLE_STATUS } = await import('@app-types/status');
    const { createEmptyVehicleSearchParams, serializeVehicleSearchParams, parseVehicleSearchParams } =
      await import('@utils/vehicle-search-params');

    const a = await seedOwnerStore('catalog-loja-a', 'catalog-a@test.example', {
      city: 'Campinas',
      state: 'SP',
    });
    const b = await seedOwnerStore('catalog-loja-b', 'catalog-b@test.example', {
      city: 'São Paulo',
      state: 'SP',
    });

    const v1 = await seedVehicle(a.store.id, a.user.id, 'CAT1A11', {
      make: 'Toyota',
      makeSlug: 'toyota',
      model: 'Corolla',
      modelSlug: 'corolla',
      mileageKm: 10000,
      yearModel: 2022,
      fuel: 'flex',
      transmission: 'automatic',
      bodyType: 'sedan',
      condition: 'seminew',
    });
    const v2 = await seedVehicle(a.store.id, a.user.id, 'CAT1A22', {
      make: 'Honda',
      makeSlug: 'honda',
      model: 'Civic',
      modelSlug: 'civic',
      mileageKm: 40000,
      yearManufacture: 2018,
      yearModel: 2019,
      fuel: 'gasoline',
      transmission: 'manual',
      bodyType: 'sedan',
      condition: 'used',
    });
    const v3 = await seedVehicle(b.store.id, b.user.id, 'CAT1B33', {
      make: 'Jeep',
      makeSlug: 'jeep',
      model: 'Compass',
      modelSlug: 'compass',
      mileageKm: 5000,
      yearManufacture: 2023,
      yearModel: 2023,
      fuel: 'flex',
      transmission: 'automatic',
      bodyType: 'suv',
      condition: 'new',
    });
    const vPaused = await seedVehicle(a.store.id, a.user.id, 'CAT1A44', {
      make: 'Fiat',
      makeSlug: 'fiat',
      model: 'Argo',
      modelSlug: 'argo',
    });

    const l1 = await publishListing(
      a.store.id,
      v1.vehicle.id,
      v1.media.id,
      a.user.id,
      12000000,
      'Corolla seminovo'
    );
    const l2 = await publishListing(
      a.store.id,
      v2.vehicle.id,
      v2.media.id,
      a.user.id,
      8000000,
      'Civic usado'
    );
    await publishListing(b.store.id, v3.vehicle.id, v3.media.id, b.user.id, 15000000, 'Compass novo');
    const pausedListing = await publishListing(
      a.store.id,
      vPaused.vehicle.id,
      vPaused.media.id,
      a.user.id,
      6000000,
      'Argo pausado'
    );

    await transitionListing(
      {
        storeId: a.store.id,
        listingId: pausedListing.id,
        toStatus: LISTING_STATUS.PAUSED,
      },
      a.user.id
    );

    const base = createEmptyVehicleSearchParams();
    const all = await searchPublicVehiclesUncached(base);
    assert.equal(all.total, 3);
    assert.ok(all.items.every((item) => item.listingStatus === LISTING_STATUS.PUBLISHED));
    assert.ok(all.items.every((item) => item.status !== VEHICLE_STATUS.PREPARING));
    assert.equal(
      all.items.some((item) => item.slug === pausedListing.slug),
      false
    );

    const byMake = await searchPublicVehiclesUncached({ ...base, marca: ['toyota'] });
    assert.equal(byMake.total, 1);
    assert.equal(byMake.items[0]?.makeSlug, 'toyota');

    const byPrice = await searchPublicVehiclesUncached({
      ...base,
      precoMin: 100000,
      precoMax: 130000,
    });
    assert.equal(byPrice.total, 1);
    assert.equal(byPrice.items[0]?.makeSlug, 'toyota');

    const byKm = await searchPublicVehiclesUncached({ ...base, kmMax: 15000 });
    assert.equal(byKm.total, 2);

    const byFuel = await searchPublicVehiclesUncached({ ...base, combustivel: ['flex'] });
    assert.equal(byFuel.total, 2);

    const byBody = await searchPublicVehiclesUncached({ ...base, carroceria: ['suv'] });
    assert.equal(byBody.total, 1);
    assert.equal(byBody.items[0]?.specs.bodyType, 'suv');

    const byCondition = await searchPublicVehiclesUncached({ ...base, condicao: 'novo' });
    assert.equal(byCondition.total, 1);

    const byQuery = await searchPublicVehiclesUncached({ ...base, q: 'civic' });
    assert.equal(byQuery.total, 1);

    const byLocal = await searchPublicVehiclesUncached({ ...base, local: 'campinas-sp' });
    assert.equal(byLocal.total, 2);

    const sortedAsc = await searchPublicVehiclesUncached({ ...base, ordem: 'menor-preco' });
    assert.deepEqual(
      sortedAsc.items.map((item) => item.price),
      [80000, 120000, 150000]
    );

    const sortedDesc = await searchPublicVehiclesUncached({ ...base, ordem: 'maior-preco' });
    assert.deepEqual(
      sortedDesc.items.map((item) => item.price),
      [150000, 120000, 80000]
    );

    const page1 = await searchPublicVehiclesUncached(
      { ...base, ordem: 'menor-preco' },
      { pageSize: 2 }
    );
    assert.equal(page1.total, 3);
    assert.equal(page1.totalPaginas, 2);
    assert.equal(page1.pagina, 1);
    assert.equal(page1.items.length, 2);

    const page2 = await searchPublicVehiclesUncached(
      { ...base, ordem: 'menor-preco', pagina: 2 },
      { pageSize: 2 }
    );
    assert.equal(page2.pagina, 2);
    assert.equal(page2.items.length, 1);
    assert.equal(page2.items[0]?.price, 150000);

    assert.equal(byMake.facets.makes.find((make) => make.slug === 'toyota')?.count, 1);
    assert.ok(byFuel.facets.priceMax >= byFuel.facets.priceMin);

    const href = serializeVehicleSearchParams({
      ...base,
      marca: ['honda'],
      combustivel: ['gasolina'],
      ordem: 'menor-km',
      pagina: 1,
    });
    const roundTrip = parseVehicleSearchParams(new URLSearchParams(href));
    assert.deepEqual(roundTrip.marca, ['honda']);
    assert.deepEqual(roundTrip.combustivel, ['gasolina']);
    assert.equal(roundTrip.ordem, 'menor-km');

    const fromRoundTrip = await searchPublicVehiclesUncached(roundTrip);
    assert.equal(fromRoundTrip.total, 1);
    assert.equal(fromRoundTrip.items[0]?.makeSlug, 'honda');

    const latestRows = await selectPublicConditionLatest(null, 10);
    assert.equal(latestRows.length, 3);
    assert.equal(
      latestRows.some((row) => row.listing.status === LISTING_STATUS.PAUSED),
      false
    );

    void l1;
    void l2;
  });

  it('exclui anúncios de loja inativa e veículo não elegível', async () => {
    const { searchPublicVehiclesUncached } = await import('@server/catalog/public-catalog.service');
    const { createEmptyVehicleSearchParams } = await import('@utils/vehicle-search-params');
    const { transitionVehicleStatus } = await import('@server/vehicles/vehicles.service');
    const { VEHICLE_STATUS, STORE_STATUS } = await import('@app-types/status');
    const storesRepo = await import('@server/repositories/stores.repository');

    const store = await seedOwnerStore('catalog-loja-c', 'catalog-c@test.example');
    const available = await seedVehicle(store.store.id, store.user.id, 'CAT1C55');
    const sold = await seedVehicle(store.store.id, store.user.id, 'CAT1C66');

    await publishListing(
      store.store.id,
      available.vehicle.id,
      available.media.id,
      store.user.id,
      7000000,
      'Disponível'
    );
    const soldListing = await publishListing(
      store.store.id,
      sold.vehicle.id,
      sold.media.id,
      store.user.id,
      7000000,
      'Vendido'
    );

    const soldTransition = await transitionVehicleStatus(
      {
        storeId: store.store.id,
        vehicleId: sold.vehicle.id,
        toStatus: VEHICLE_STATUS.SOLD,
        source: 'sale',
      },
      store.user.id
    );
    assert.equal(soldTransition.ok, true);

    const before = await searchPublicVehiclesUncached(createEmptyVehicleSearchParams());
    const beforeCount = before.items.filter((item) => item.store.slug === store.store.slug).length;
    assert.equal(beforeCount, 1);
    assert.equal(
      before.items.some((item) => item.slug === soldListing.slug),
      false
    );

    await storesRepo.updateStore(store.store.id, { status: STORE_STATUS.SUSPENDED });

    const after = await searchPublicVehiclesUncached(createEmptyVehicleSearchParams());
    assert.equal(
      after.items.some((item) => item.store.slug === store.store.slug),
      false
    );
  });
});
