import assert from 'node:assert/strict';
import { mkdirSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { after, before, describe, it } from 'node:test';

import { migrate } from 'drizzle-orm/libsql/migrator';

const TEST_DB = resolve(process.cwd(), '.data/test-reservations.db');

describe('módulo de reservas', () => {
  before(async () => {
    rmSync(TEST_DB, { force: true });
    mkdirSync(dirname(TEST_DB), { recursive: true });

    process.env.TURSO_DATABASE_URL = `file:${TEST_DB}`;
    delete process.env.TURSO_AUTH_TOKEN;

    const { resetDbSingletons, getDb } = await import('@lib/db');
    resetDbSingletons();
    await migrate(getDb(), { migrationsFolder: resolve(process.cwd(), 'drizzle') });
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

    const owner = await createUser({ email, name: 'Owner Res' });
    assert.equal(owner.ok, true);
    if (!owner.ok) throw new Error(owner.message);

    await addStoreMember({
      storeId: store.data.id,
      userId: owner.data.id,
      role: STORE_ROLES.OWNER,
    });

    const seller = await createUser({ email: `seller-${email}`, name: 'Seller Res' });
    assert.equal(seller.ok, true);
    if (!seller.ok) throw new Error(seller.message);

    await addStoreMember({
      storeId: store.data.id,
      userId: seller.data.id,
      role: STORE_ROLES.SELLER,
    });

    const operator = await createUser({ email: `op-${email}`, name: 'Op Res' });
    assert.equal(operator.ok, true);
    if (!operator.ok) throw new Error(operator.message);

    await addStoreMember({
      storeId: store.data.id,
      userId: operator.data.id,
      role: STORE_ROLES.OPERATOR,
    });

    return {
      store: store.data,
      owner: owner.data,
      seller: seller.data,
      operator: operator.data,
    };
  }

  async function seedAvailableVehicle(storeId: string, actorUserId: string, plate: string) {
    const { createVehicle } = await import('@server/vehicles/vehicles.service');
    const { VEHICLE_STATUS } = await import('@app-types/status');
    const { VEHICLE_OWNERSHIP } = await import('@app-types/membership');

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
        mileageKm: 10000,
        fuel: 'flex',
        transmission: 'automatic',
        yearManufacture: 2021,
        yearModel: 2022,
        bodyType: 'sedan',
        plate,
        askingPriceCents: 9000000,
      },
      actorUserId
    );
    assert.equal(vehicle.ok, true);
    if (!vehicle.ok) throw new Error(vehicle.message);

    return vehicle.data;
  }

  async function seedCustomer(storeId: string, actorUserId: string, phone: string) {
    const { createCustomer } = await import('@server/crm/customers.service');
    const { OPPORTUNITY_ORIGINS } = await import('@app-types/crm');

    const customer = await createCustomer(
      {
        storeId,
        name: 'Cliente Reserva',
        phone,
        source: OPPORTUNITY_ORIGINS.WALK_IN,
        dataPurpose: 'commercial_contact',
      },
      actorUserId
    );
    assert.equal(customer.ok, true);
    if (!customer.ok) throw new Error(customer.message);

    return customer.data.customer;
  }

  it('reserva válida, conflito concorrente, prorrogação, cancelamento, expiração, venda e isolamento', async () => {
    const {
      createReservation,
      cancelReservation,
      extendReservation,
      expireDueReservations,
      getActiveReservationForVehicle,
      searchReservations,
    } = await import('@server/reservations/reservations.service');
    const { transitionVehicleStatus, getVehicleInStore } = await import(
      '@server/vehicles/vehicles.service'
    );
    const { RESERVATION_STATUS, VEHICLE_STATUS } = await import('@app-types/status');
    const { updateReservation } = await import('@server/repositories/reservations.repository');

    const a = await seedStore('res-loja-a', 'owner-a@res.test');
    const b = await seedStore('res-loja-b', 'owner-b@res.test');

    const vehicleA = await seedAvailableVehicle(a.store.id, a.owner.id, 'RES1A11');
    const customerA = await seedCustomer(a.store.id, a.owner.id, '19911112222');
    const customerB = await seedCustomer(b.store.id, b.owner.id, '19933334444');
    const vehicleB = await seedAvailableVehicle(b.store.id, b.owner.id, 'RES2B22');

    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

    const first = await createReservation(
      {
        storeId: a.store.id,
        vehicleId: vehicleA.id,
        customerId: customerA.id,
        assigneeUserId: a.seller.id,
        expiresAt,
        durationHours: 48,
      },
      a.seller.id
    );
    assert.equal(first.ok, true);
    if (!first.ok) throw new Error(first.message);
    assert.equal(first.data.status, RESERVATION_STATUS.ACTIVE);

    const vehicleAfter = await getVehicleInStore(a.store.id, vehicleA.id, a.owner.id);
    assert.equal(vehicleAfter.ok, true);
    if (!vehicleAfter.ok) throw new Error(vehicleAfter.message);
    assert.equal(vehicleAfter.data.status, VEHICLE_STATUS.RESERVED);

    const conflict = await createReservation(
      {
        storeId: a.store.id,
        vehicleId: vehicleA.id,
        customerId: customerA.id,
        expiresAt,
        durationHours: 48,
      },
      a.owner.id
    );
    assert.equal(conflict.ok, false);
    if (conflict.ok) throw new Error('deveria conflitar');
    assert.equal(conflict.code, 'CONFLICT');

    const forbidden = await createReservation(
      {
        storeId: a.store.id,
        vehicleId: vehicleA.id,
        customerId: customerA.id,
        expiresAt,
        durationHours: 48,
      },
      a.operator.id
    );
    assert.equal(forbidden.ok, false);
    if (forbidden.ok) throw new Error('operador não deveria criar');
    assert.equal(forbidden.code, 'FORBIDDEN');

    const crossStore = await createReservation(
      {
        storeId: b.store.id,
        vehicleId: vehicleA.id,
        customerId: customerB.id,
        expiresAt,
        durationHours: 48,
      },
      b.owner.id
    );
    assert.equal(crossStore.ok, false);

    const newExpiry = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();
    const extended = await extendReservation(
      {
        storeId: a.store.id,
        reservationId: first.data.id,
        expiresAt: newExpiry,
      },
      a.owner.id
    );
    assert.equal(extended.ok, true);
    if (!extended.ok) throw new Error(extended.message);
    assert.equal(extended.data.expiresAt, newExpiry);

    const cancelled = await cancelReservation(
      {
        storeId: a.store.id,
        reservationId: first.data.id,
        reason: 'Cliente desistiu',
      },
      a.owner.id
    );
    assert.equal(cancelled.ok, true);
    if (!cancelled.ok) throw new Error(cancelled.message);
    assert.equal(cancelled.data.status, RESERVATION_STATUS.CANCELLED);

    const vehicleReleased = await getVehicleInStore(a.store.id, vehicleA.id, a.owner.id);
    assert.equal(vehicleReleased.ok, true);
    if (!vehicleReleased.ok) throw new Error(vehicleReleased.message);
    assert.equal(vehicleReleased.data.status, VEHICLE_STATUS.AVAILABLE);

    const second = await createReservation(
      {
        storeId: a.store.id,
        vehicleId: vehicleA.id,
        customerId: customerA.id,
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        durationHours: 2,
      },
      a.seller.id
    );
    assert.equal(second.ok, true);
    if (!second.ok) throw new Error(second.message);

    await updateReservation(second.data.id, {
      expiresAt: new Date(Date.now() - 60_000).toISOString(),
    });

    const expired = await expireDueReservations({
      storeId: a.store.id,
      vehicleId: vehicleA.id,
      actorUserId: a.owner.id,
    });
    assert.ok(expired.expiredIds.includes(second.data.id));

    const afterExpire = await getVehicleInStore(a.store.id, vehicleA.id, a.owner.id);
    assert.equal(afterExpire.ok, true);
    if (!afterExpire.ok) throw new Error(afterExpire.message);
    assert.equal(afterExpire.data.status, VEHICLE_STATUS.AVAILABLE);

    const activeGone = await getActiveReservationForVehicle(
      a.store.id,
      vehicleA.id,
      a.owner.id
    );
    assert.equal(activeGone.ok, true);
    if (!activeGone.ok) throw new Error(activeGone.message);
    assert.equal(activeGone.data, null);

    const forSale = await createReservation(
      {
        storeId: a.store.id,
        vehicleId: vehicleA.id,
        customerId: customerA.id,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        durationHours: 24,
      },
      a.seller.id
    );
    assert.equal(forSale.ok, true);
    if (!forSale.ok) throw new Error(forSale.message);

    const sold = await transitionVehicleStatus(
      {
        storeId: a.store.id,
        vehicleId: vehicleA.id,
        toStatus: VEHICLE_STATUS.SOLD,
        source: 'sale',
      },
      a.owner.id
    );
    assert.equal(sold.ok, true);

    const list = await searchReservations(
      { storeId: a.store.id, page: 1, pageSize: 20 },
      a.owner.id
    );
    assert.equal(list.ok, true);
    if (!list.ok) throw new Error(list.message);
    const completed = list.data.items.find((item) => item.id === forSale.data.id);
    assert.equal(completed?.status, RESERVATION_STATUS.COMPLETED);

    const otherStoreList = await searchReservations(
      { storeId: b.store.id, page: 1, pageSize: 20 },
      b.owner.id
    );
    assert.equal(otherStoreList.ok, true);
    if (!otherStoreList.ok) throw new Error(otherStoreList.message);
    assert.equal(otherStoreList.data.total, 0);

    const otherVehicle = await createReservation(
      {
        storeId: b.store.id,
        vehicleId: vehicleB.id,
        customerId: customerB.id,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        durationHours: 24,
      },
      b.owner.id
    );
    assert.equal(otherVehicle.ok, true);
  });

  it('dois vendedores não mantêm reservas ativas conflitantes', async () => {
    const { createReservation } = await import('@server/reservations/reservations.service');
    const { findActiveReservationForVehicle } = await import(
      '@server/repositories/reservations.repository'
    );
    const { RESERVATION_STATUS } = await import('@app-types/status');

    const a = await seedStore('res-race', 'race@res.test');
    const vehicle = await seedAvailableVehicle(a.store.id, a.owner.id, 'RACE123');
    const customer = await seedCustomer(a.store.id, a.owner.id, '19955556666');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const payload = {
      storeId: a.store.id,
      vehicleId: vehicle.id,
      customerId: customer.id,
      expiresAt,
      durationHours: 24,
    };

    const [r1, r2] = await Promise.all([
      createReservation(payload, a.owner.id),
      createReservation(payload, a.seller.id),
    ]);

    const oks = [r1, r2].filter((r) => r.ok);
    const conflicts = [r1, r2].filter((r) => !r.ok && r.code === 'CONFLICT');

    assert.ok(oks.length <= 1, 'no máximo uma reserva criada com sucesso');
    assert.ok(oks.length + conflicts.length === 2, 'perdedor deve receber CONFLICT');

    const active = await findActiveReservationForVehicle(vehicle.id);
    assert.ok(active);
    assert.equal(active?.status, RESERVATION_STATUS.ACTIVE);

    const third = await createReservation(payload, a.seller.id);
    assert.equal(third.ok, false);
    if (third.ok) throw new Error('terceira reserva deveria falhar');
    assert.equal(third.code, 'CONFLICT');
  });
});
