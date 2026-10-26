import assert from 'node:assert/strict';
import { mkdirSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { after, before, describe, it } from 'node:test';

import { migrate } from 'drizzle-orm/libsql/migrator';

const TEST_DB = resolve(process.cwd(), '.data/test-inventory.db');

describe('módulo de estoque', () => {
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

  async function seedStore(slug: string, email: string) {
    const { createStore } = await import('@server/stores/stores.service');
    const { createUser, addStoreMember } = await import('@server/users/users.service');
    const { STORE_STATUS } = await import('@app-types/status');
    const { STORE_ROLES } = await import('@app-types/membership');

    const store = await createStore({
      legalName: `${slug} LTDA`,
      tradeName: slug,
      publicName: slug,
      slug,
      subdomain: slug.replace(/-/g, ''),
      city: 'Campinas',
      state: 'SP',
      status: STORE_STATUS.ACTIVE,
      verified: true,
    });
    assert.equal(store.ok, true);
    if (!store.ok) throw new Error(store.message);

    const user = await createUser({ email, name: 'Owner' });
    assert.equal(user.ok, true);
    if (!user.ok) throw new Error(user.message);

    const membership = await addStoreMember({
      storeId: store.data.id,
      userId: user.data.id,
      role: STORE_ROLES.OWNER,
    });
    assert.equal(membership.ok, true);

    return { store: store.data, user: user.data };
  }

  it('CRUD, validação, filtros, paginação e isolamento entre lojas', async () => {
    const {
      createVehicle,
      updateVehicle,
      searchStoreVehicles,
      getVehicleInStore,
      addVehicleCost,
      listPrivateVehicleCosts,
      getPrivateVehicleCostTotal,
      transitionVehicleStatus,
    } = await import('@server/vehicles/vehicles.service');
    const { VEHICLE_STATUS } = await import('@app-types/status');
    const { VEHICLE_OWNERSHIP } = await import('@app-types/membership');

    const a = await seedStore('estoque-loja-a', 'owner-a@estoque.test');
    const b = await seedStore('estoque-loja-b', 'owner-b@estoque.test');

    const invalid = await createVehicle(
      {
        storeId: a.store.id,
        make: 'Toyota',
        makeSlug: 'toyota',
        model: 'Corolla',
        modelSlug: 'corolla',
        version: 'XEi',
        condition: 'used',
        ownership: VEHICLE_OWNERSHIP.OWN,
        enteredAt: new Date().toISOString(),
        mileageKm: 1000,
        fuel: 'flex',
        transmission: 'automatic',
        yearManufacture: 2022,
        yearModel: 2020,
        bodyType: 'sedan',
      },
      a.user.id
    );
    assert.equal(invalid.ok, false);

    const base = {
      storeId: a.store.id,
      make: 'Toyota',
      makeSlug: 'toyota',
      model: 'Corolla',
      modelSlug: 'corolla',
      version: 'XEi',
      condition: 'used' as const,
      ownership: VEHICLE_OWNERSHIP.OWN,
      enteredAt: '2024-01-10T12:00:00.000Z',
      mileageKm: 10000,
      fuel: 'flex',
      transmission: 'automatic',
      yearManufacture: 2020,
      yearModel: 2021,
      bodyType: 'sedan',
      plate: 'ABC1D23',
      internalCode: 'INT-001',
      askingPriceCents: 9500000,
      isDraft: false,
    };

    const v1 = await createVehicle(base, a.user.id);
    assert.equal(v1.ok, true);
    if (!v1.ok) return;

    const dupPlate = await createVehicle(
      { ...base, internalCode: 'INT-002', version: 'GLi' },
      a.user.id
    );
    assert.equal(dupPlate.ok, false);
    if (!dupPlate.ok) {
      assert.equal(dupPlate.code, 'CONFLICT');
    }

    const dupCode = await createVehicle(
      { ...base, plate: 'XYZ9Z99', internalCode: 'INT-001', version: 'Altis' },
      a.user.id
    );
    assert.equal(dupCode.ok, false);

    const v2 = await createVehicle(
      {
        ...base,
        plate: 'DEF2E34',
        internalCode: 'INT-002',
        make: 'Volkswagen',
        makeSlug: 'volkswagen',
        model: 'Polo',
        modelSlug: 'polo',
        version: 'TSI',
        status: VEHICLE_STATUS.AVAILABLE,
        enteredAt: '2024-06-01T12:00:00.000Z',
        askingPriceCents: 8000000,
      },
      a.user.id
    );
    assert.equal(v2.ok, true);

    const consigned = await createVehicle(
      {
        ...base,
        plate: 'GHI3F45',
        internalCode: 'CONS-1',
        make: 'Honda',
        makeSlug: 'honda',
        model: 'Civic',
        modelSlug: 'civic',
        ownership: VEHICLE_OWNERSHIP.CONSIGNED,
        consignorName: 'João Consignante',
        consignorPhone: '19999999999',
        version: 'Consignado',
        status: VEHICLE_STATUS.PREPARING,
      },
      a.user.id
    );
    assert.equal(consigned.ok, true);

    const otherStore = await createVehicle(
      {
        ...base,
        storeId: b.store.id,
        plate: 'ABC1D23',
        internalCode: 'INT-001',
      },
      b.user.id
    );
    assert.equal(otherStore.ok, true);

    const cross = await getVehicleInStore(a.store.id, otherStore.ok ? otherStore.data.id : '', a.user.id);
    assert.equal(cross.ok, false);

    const listed = await searchStoreVehicles(
      {
        storeId: a.store.id,
        q: 'corolla',
        page: 1,
        pageSize: 10,
        sort: 'entered_at',
        sortDir: 'desc',
      },
      a.user.id
    );
    assert.equal(listed.ok, true);
    if (listed.ok) {
      assert.equal(listed.data.items.length, 1);
      assert.equal(listed.data.items[0]?.modelSlug, 'corolla');
      assert.ok(listed.data.statusCounts.total >= 3);
    }

    const filtered = await searchStoreVehicles(
      {
        storeId: a.store.id,
        makeSlug: 'volkswagen',
        status: VEHICLE_STATUS.AVAILABLE,
        page: 1,
        pageSize: 10,
        sort: 'asking_price',
        sortDir: 'asc',
      },
      a.user.id
    );
    assert.equal(filtered.ok, true);
    if (filtered.ok) {
      assert.equal(filtered.data.items.length, 1);
      assert.equal(filtered.data.items[0]?.makeSlug, 'volkswagen');
    }

    const page1 = await searchStoreVehicles(
      { storeId: a.store.id, page: 1, pageSize: 2, sort: 'entered_at', sortDir: 'desc' },
      a.user.id
    );
    assert.equal(page1.ok, true);
    if (page1.ok) {
      assert.equal(page1.data.items.length, 2);
      assert.ok(page1.data.totalPages >= 2);
    }

    const updated = await updateVehicle(
      {
        storeId: a.store.id,
        vehicleId: v1.data.id,
        mileageKm: 12000,
        askingPriceCents: 9200000,
        notesInternal: 'Revisão feita',
      },
      a.user.id
    );
    assert.equal(updated.ok, true);
    if (updated.ok) {
      assert.equal(updated.data.mileageKm, 12000);
    }

    const toAvailable = await transitionVehicleStatus(
      {
        storeId: a.store.id,
        vehicleId: v1.data.id,
        toStatus: VEHICLE_STATUS.AVAILABLE,
        source: 'inventory',
      },
      a.user.id
    );
    assert.equal(toAvailable.ok, true);

    const toReservedBlocked = await transitionVehicleStatus(
      {
        storeId: a.store.id,
        vehicleId: v1.data.id,
        toStatus: VEHICLE_STATUS.RESERVED,
        source: 'inventory',
      },
      a.user.id
    );
    assert.equal(toReservedBlocked.ok, false);

    const toReserved = await transitionVehicleStatus(
      {
        storeId: a.store.id,
        vehicleId: v1.data.id,
        toStatus: VEHICLE_STATUS.RESERVED,
        source: 'reservation',
      },
      a.user.id
    );
    assert.equal(toReserved.ok, true);

    const toSold = await transitionVehicleStatus(
      {
        storeId: a.store.id,
        vehicleId: v1.data.id,
        toStatus: VEHICLE_STATUS.SOLD,
        source: 'sale',
      },
      a.user.id
    );
    assert.equal(toSold.ok, true);

    const editSold = await updateVehicle(
      {
        storeId: a.store.id,
        vehicleId: v1.data.id,
        mileageKm: 99999,
      },
      a.user.id
    );
    assert.equal(editSold.ok, false);

    const costOwn = await addVehicleCost(
      {
        storeId: a.store.id,
        vehicleId: v2.ok ? v2.data.id : '',
        type: 'acquisition',
        amountCents: 7000000,
        incurredAt: new Date().toISOString(),
        description: 'Compra estoque próprio',
      },
      a.user.id
    );
    assert.equal(costOwn.ok, true);

    const costExtra = await addVehicleCost(
      {
        storeId: a.store.id,
        vehicleId: v2.ok ? v2.data.id : '',
        type: 'repair',
        amountCents: 50000,
        incurredAt: new Date().toISOString(),
        description: 'Funilaria',
      },
      a.user.id
    );
    assert.equal(costExtra.ok, true);

    const costs = await listPrivateVehicleCosts(
      a.store.id,
      v2.ok ? v2.data.id : '',
      a.user.id
    );
    assert.equal(costs.ok, true);
    if (costs.ok) {
      assert.equal(costs.data.length, 2);
    }

    const total = await getPrivateVehicleCostTotal(
      a.store.id,
      v2.ok ? v2.data.id : '',
      a.user.id
    );
    assert.equal(total.ok, true);
    if (total.ok) {
      assert.equal(total.data.totalCents, 7050000);
    }

    const crossCosts = await listPrivateVehicleCosts(
      a.store.id,
      v2.ok ? v2.data.id : '',
      b.user.id
    );
    assert.equal(crossCosts.ok, false);

    if (consigned.ok) {
      const consignedCost = await addVehicleCost(
        {
          storeId: a.store.id,
          vehicleId: consigned.data.id,
          type: 'acquisition',
          amountCents: 100000,
          incurredAt: new Date().toISOString(),
          description: 'Taxa de entrada consignação',
        },
        a.user.id
      );
      assert.equal(consignedCost.ok, true);
    }
  });

  it('valida transição de status do estoque', async () => {
    const { canTransitionVehicleStatus } = await import('@server/vehicles/vehicle-status');
    const { VEHICLE_STATUS } = await import('@app-types/status');

    assert.equal(
      canTransitionVehicleStatus(VEHICLE_STATUS.PREPARING, VEHICLE_STATUS.AVAILABLE),
      true
    );
    assert.equal(
      canTransitionVehicleStatus(VEHICLE_STATUS.AVAILABLE, VEHICLE_STATUS.RESERVED),
      false
    );
    assert.equal(
      canTransitionVehicleStatus(
        VEHICLE_STATUS.AVAILABLE,
        VEHICLE_STATUS.RESERVED,
        'reservation'
      ),
      true
    );
    assert.equal(
      canTransitionVehicleStatus(VEHICLE_STATUS.SOLD, VEHICLE_STATUS.AVAILABLE),
      false
    );
  });

  it('aceita rascunho incompleto e conclui depois; bloqueia VIN duplicado', async () => {
    const { createVehicle, updateVehicle } = await import('@server/vehicles/vehicles.service');
    const { VEHICLE_OWNERSHIP } = await import('@app-types/membership');

    const a = await seedStore('estoque-draft', 'owner-draft@estoque.test');

    const draft = await createVehicle(
      {
        storeId: a.store.id,
        make: 'Fiat',
        makeSlug: 'fiat',
        model: 'Argo',
        modelSlug: 'argo',
        version: 'Drive',
        isDraft: true,
        ownership: VEHICLE_OWNERSHIP.OWN,
      },
      a.user.id
    );
    assert.equal(draft.ok, true);
    if (!draft.ok) return;
    assert.equal(draft.data.isDraft, 'true');
    assert.equal(draft.data.makeSlug, 'fiat');

    const completed = await updateVehicle(
      {
        storeId: a.store.id,
        vehicleId: draft.data.id,
        isDraft: false,
        condition: 'used',
        fuel: 'flex',
        transmission: 'manual',
        bodyType: 'hatch',
        yearManufacture: 2021,
        yearModel: 2022,
        mileageKm: 15000,
        enteredAt: '2024-03-01T12:00:00.000Z',
        plate: 'DRF1A23',
        vin: '9BD12345678901234',
      },
      a.user.id
    );
    assert.equal(completed.ok, true);
    if (completed.ok) {
      assert.equal(completed.data.isDraft, 'false');
      assert.equal(completed.data.vin, '9BD12345678901234');
    }

    const dupVin = await createVehicle(
      {
        storeId: a.store.id,
        make: 'Fiat',
        makeSlug: 'fiat',
        model: 'Cronos',
        modelSlug: 'cronos',
        version: 'Precision',
        condition: 'used',
        ownership: VEHICLE_OWNERSHIP.OWN,
        enteredAt: '2024-04-01T12:00:00.000Z',
        mileageKm: 1000,
        fuel: 'flex',
        transmission: 'automatic',
        yearManufacture: 2023,
        yearModel: 2023,
        bodyType: 'sedan',
        vin: '9BD12345678901234',
        plate: 'ZZZ9Z99',
        internalCode: 'VIN-DUP',
        isDraft: false,
      },
      a.user.id
    );
    assert.equal(dupVin.ok, false);
    if (!dupVin.ok) {
      assert.equal(dupVin.code, 'CONFLICT');
    }

    const consignedDraft = await createVehicle(
      {
        storeId: a.store.id,
        make: 'Jeep',
        makeSlug: 'jeep',
        model: 'Renegade',
        modelSlug: 'renegade',
        version: 'Sport',
        ownership: VEHICLE_OWNERSHIP.CONSIGNED,
        isDraft: true,
      },
      a.user.id
    );
    assert.equal(consignedDraft.ok, true);

    const consignedCompleteMissing = await createVehicle(
      {
        storeId: a.store.id,
        make: 'Jeep',
        makeSlug: 'jeep',
        model: 'Compass',
        modelSlug: 'compass',
        version: 'Longitude',
        ownership: VEHICLE_OWNERSHIP.CONSIGNED,
        condition: 'used',
        enteredAt: '2024-05-01T12:00:00.000Z',
        mileageKm: 2000,
        fuel: 'flex',
        transmission: 'automatic',
        yearManufacture: 2022,
        yearModel: 2022,
        bodyType: 'suv',
        plate: 'CNS4C56',
        isDraft: false,
      },
      a.user.id
    );
    assert.equal(consignedCompleteMissing.ok, false);
  });
});
