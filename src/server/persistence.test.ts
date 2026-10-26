import assert from 'node:assert/strict';
import { mkdirSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { after, before, describe, it } from 'node:test';

import { migrate } from 'drizzle-orm/libsql/migrator';

const TEST_DB = resolve(process.cwd(), '.data/test-persistence.db');

describe('persistência Turso/Drizzle', () => {
  before(async () => {
    rmSync(TEST_DB, { force: true });
    mkdirSync(dirname(TEST_DB), { recursive: true });

    process.env.TURSO_DATABASE_URL = `file:${TEST_DB}`;
    delete process.env.TURSO_AUTH_TOKEN;

    const { resetDbSingletons, getDb } = await import('@lib/db');
    resetDbSingletons();
    const db = getDb();
    await migrate(db, { migrationsFolder: resolve(process.cwd(), 'drizzle') });
  });

  after(async () => {
    const { resetDbSingletons } = await import('@lib/db');
    resetDbSingletons();
    rmSync(TEST_DB, { force: true });
  });

  it('cria loja, usuário, membership, veículo, listing e custo privado', async () => {
    const { createStore } = await import('@server/stores/stores.service');
    const { createUser, addStoreMember, assertUserBelongsToStore } = await import('@server/users/users.service');
    const { createVehicle, addVehicleCost, listPrivateVehicleCosts, listStoreVehicles } =
      await import('@server/vehicles/vehicles.service');
    const { createListing } = await import('@server/listings/listings.service');
    const { STORE_STATUS, VEHICLE_STATUS, LISTING_STATUS } = await import('@app-types/status');
    const { STORE_ROLES, VEHICLE_OWNERSHIP } = await import('@app-types/membership');

    const store = await createStore({
      legalName: 'Loja Teste LTDA',
      tradeName: 'Loja Teste',
      publicName: 'Loja Teste',
      slug: 'loja-teste',
      subdomain: 'lojateste',
      city: 'Campinas',
      state: 'SP',
      status: STORE_STATUS.ACTIVE,
      verified: true,
    });
    assert.equal(store.ok, true);
    if (!store.ok) return;

    const user = await createUser({ email: 'owner@loja-teste.example', name: 'Owner' });
    assert.equal(user.ok, true);
    if (!user.ok) return;

    const membership = await addStoreMember({
      storeId: store.data.id,
      userId: user.data.id,
      role: STORE_ROLES.OWNER,
    });
    assert.equal(membership.ok, true);

    const belongs = await assertUserBelongsToStore(store.data.id, user.data.id);
    assert.equal(belongs.ok, true);

    const vehicle = await createVehicle(
      {
        storeId: store.data.id,
        make: 'Toyota',
        makeSlug: 'toyota',
        model: 'Corolla',
        modelSlug: 'corolla',
        version: 'XEi',
        condition: 'used',
        status: VEHICLE_STATUS.AVAILABLE,
        ownership: VEHICLE_OWNERSHIP.OWN,
        enteredAt: new Date().toISOString(),
        mileageKm: 10000,
        fuel: 'flex',
        transmission: 'automatic',
        yearManufacture: 2020,
        yearModel: 2020,
        bodyType: 'sedan',
      },
      user.data.id
    );
    assert.equal(vehicle.ok, true);
    if (!vehicle.ok) return;

    const cost = await addVehicleCost(
      {
        storeId: store.data.id,
        vehicleId: vehicle.data.id,
        type: 'acquisition',
        amountCents: 100000,
        incurredAt: new Date().toISOString(),
        description: 'privado',
      },
      user.data.id
    );
    assert.equal(cost.ok, true);

    const listing = await createListing({
      storeId: store.data.id,
      vehicleId: vehicle.data.id,
      slug: 'toyota-corolla-teste',
      title: 'Corolla XEi',
      description: 'teste',
      priceCents: 12000000,
      status: LISTING_STATUS.DRAFT,
      featured: false,
    });
    assert.equal(listing.ok, true);

    const storeVehicles = await listStoreVehicles(store.data.id, user.data.id);
    assert.equal(storeVehicles.ok, true);
    if (storeVehicles.ok) {
      assert.equal(storeVehicles.data.length, 1);
    }

    const privateCosts = await listPrivateVehicleCosts(store.data.id, vehicle.data.id, user.data.id);
    assert.equal(privateCosts.ok, true);
    if (privateCosts.ok) {
      assert.equal(privateCosts.data.length, 1);
      assert.equal(privateCosts.data[0]?.amountCents, 100000);
    }
  });

  it('impede slug de loja duplicado e subdomínio duplicado', async () => {
    const { createStore } = await import('@server/stores/stores.service');
    const { STORE_STATUS } = await import('@app-types/status');

    const first = await createStore({
      legalName: 'Loja Alpha',
      tradeName: 'Alpha',
      publicName: 'Alpha',
      slug: 'slug-unico',
      subdomain: 'sub-unico',
      city: 'SP',
      state: 'SP',
      status: STORE_STATUS.PENDING,
      verified: false,
    });
    assert.equal(first.ok, true);

    const dupSlug = await createStore({
      legalName: 'Loja Beta',
      tradeName: 'Beta',
      publicName: 'Beta',
      slug: 'slug-unico',
      city: 'SP',
      state: 'SP',
      status: STORE_STATUS.PENDING,
      verified: false,
    });
    assert.equal(dupSlug.ok, false);
    if (!dupSlug.ok) {
      assert.equal(dupSlug.code, 'CONFLICT');
    }

    const dupSub = await createStore({
      legalName: 'Loja Gama',
      tradeName: 'Gama',
      publicName: 'Gama',
      slug: 'outro-slug',
      subdomain: 'sub-unico',
      city: 'SP',
      state: 'SP',
      status: STORE_STATUS.PENDING,
      verified: false,
    });
    assert.equal(dupSub.ok, false);
    if (!dupSub.ok) {
      assert.equal(dupSub.code, 'CONFLICT');
    }
  });

  it('isola veículos por loja e exige vehicleId único por listing', async () => {
    const { createStore } = await import('@server/stores/stores.service');
    const { createUser, addStoreMember } = await import('@server/users/users.service');
    const { createVehicle, listStoreVehicles } = await import('@server/vehicles/vehicles.service');
    const { createListing } = await import('@server/listings/listings.service');
    const { STORE_STATUS, VEHICLE_STATUS, LISTING_STATUS } = await import('@app-types/status');
    const { STORE_ROLES, VEHICLE_OWNERSHIP } = await import('@app-types/membership');

    const storeA = await createStore({
      legalName: 'Loja Iso A',
      tradeName: 'Iso A',
      publicName: 'Iso A',
      slug: 'store-a-iso',
      city: 'RJ',
      state: 'RJ',
      status: STORE_STATUS.ACTIVE,
      verified: true,
    });
    const storeB = await createStore({
      legalName: 'Loja Iso B',
      tradeName: 'Iso B',
      publicName: 'Iso B',
      slug: 'store-b-iso',
      city: 'RJ',
      state: 'RJ',
      status: STORE_STATUS.ACTIVE,
      verified: true,
    });
    assert.equal(storeA.ok && storeB.ok, true);
    if (!storeA.ok || !storeB.ok) return;

    const ownerA = await createUser({ email: 'owner-a-iso@example.com', name: 'Owner A' });
    const ownerB = await createUser({ email: 'owner-b-iso@example.com', name: 'Owner B' });
    assert.equal(ownerA.ok && ownerB.ok, true);
    if (!ownerA.ok || !ownerB.ok) return;

    assert.equal(
      (await addStoreMember({ storeId: storeA.data.id, userId: ownerA.data.id, role: STORE_ROLES.OWNER }))
        .ok,
      true
    );
    assert.equal(
      (await addStoreMember({ storeId: storeB.data.id, userId: ownerB.data.id, role: STORE_ROLES.OWNER }))
        .ok,
      true
    );

    const vehicleA = await createVehicle(
      {
        storeId: storeA.data.id,
        make: 'Fiat',
        makeSlug: 'fiat',
        model: 'Argo',
        modelSlug: 'argo',
        version: '1.0',
        condition: 'used',
        status: VEHICLE_STATUS.AVAILABLE,
        ownership: VEHICLE_OWNERSHIP.OWN,
        enteredAt: new Date().toISOString(),
        mileageKm: 1,
        fuel: 'flex',
        transmission: 'manual',
        yearManufacture: 2019,
        yearModel: 2019,
        bodyType: 'hatch',
      },
      ownerA.data.id
    );
    assert.equal(vehicleA.ok, true);
    if (!vehicleA.ok) return;

    const listB = await listStoreVehicles(storeB.data.id, ownerB.data.id);
    assert.equal(listB.ok, true);
    if (listB.ok) {
      assert.equal(listB.data.length, 0);
    }

    const cross = await listStoreVehicles(storeA.data.id, ownerB.data.id);
    assert.equal(cross.ok, false);

    const listing1 = await createListing({
      storeId: storeA.data.id,
      vehicleId: vehicleA.data.id,
      slug: 'fiat-argo-a',
      title: 'Argo',
      description: '',
      priceCents: 5000000,
      status: LISTING_STATUS.DRAFT,
      featured: false,
    });
    assert.equal(listing1.ok, true);

    const listing2 = await createListing({
      storeId: storeA.data.id,
      vehicleId: vehicleA.data.id,
      slug: 'fiat-argo-a-2',
      title: 'Argo 2',
      description: '',
      priceCents: 5000000,
      status: LISTING_STATUS.DRAFT,
      featured: false,
    });
    assert.equal(listing2.ok, false);
    if (!listing2.ok) {
      assert.equal(listing2.code, 'CONFLICT');
    }
  });
});
