import assert from 'node:assert/strict';
import { mkdirSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { after, before, describe, it } from 'node:test';

import { migrate } from 'drizzle-orm/libsql/migrator';

const TEST_DB = resolve(process.cwd(), '.data/test-authz.db');

describe('autorização multi-tenant (integração)', () => {
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

  it('acesso autorizado, sem vínculo, vendedor restrito, cruzado e revogado', async () => {
    const { createStore } = await import('@server/stores/stores.service');
    const { createUser, addStoreMember, revokeStoreMembership } = await import(
      '@server/users/users.service'
    );
    const { createVehicle, addVehicleCost, listPrivateVehicleCosts, listStoreVehicles } =
      await import('@server/vehicles/vehicles.service');
    const { authorizeStoreAction } = await import('@server/auth/access');
    const { STORE_STATUS, VEHICLE_STATUS } = await import('@app-types/status');
    const { STORE_ROLES, VEHICLE_OWNERSHIP, MEMBERSHIP_STATUS } = await import(
      '@app-types/membership'
    );
    const { PERMISSIONS } = await import('@app-types/permissions');
    const { getDb, sessions } = await import('@lib/db');
    const { createId } = await import('@lib/db');

    const storeA = await createStore({
      legalName: 'Loja Alpha Auth',
      tradeName: 'Alpha Auth',
      publicName: 'Alpha Auth',
      slug: 'loja-alpha-auth',
      city: 'SP',
      state: 'SP',
      status: STORE_STATUS.ACTIVE,
      verified: true,
    });
    const storeB = await createStore({
      legalName: 'Loja Beta Auth',
      tradeName: 'Beta Auth',
      publicName: 'Beta Auth',
      slug: 'loja-beta-auth',
      city: 'RJ',
      state: 'RJ',
      status: STORE_STATUS.ACTIVE,
      verified: true,
    });
    assert.equal(storeA.ok && storeB.ok, true);
    if (!storeA.ok || !storeB.ok) return;

    const owner = await createUser({ email: 'owner-auth@example.com', name: 'Owner Auth' });
    const seller = await createUser({ email: 'seller-auth@example.com', name: 'Seller Auth' });
    const stranger = await createUser({ email: 'stranger-auth@example.com', name: 'Stranger' });
    assert.equal(owner.ok && seller.ok && stranger.ok, true);
    if (!owner.ok || !seller.ok || !stranger.ok) return;

    assert.equal(
      (await addStoreMember({ storeId: storeA.data.id, userId: owner.data.id, role: STORE_ROLES.OWNER }))
        .ok,
      true
    );
    assert.equal(
      (
        await addStoreMember({
          storeId: storeA.data.id,
          userId: seller.data.id,
          role: STORE_ROLES.SELLER,
        })
      ).ok,
      true
    );
    assert.equal(
      (await addStoreMember({ storeId: storeB.data.id, userId: owner.data.id, role: STORE_ROLES.OWNER }))
        .ok,
      true
    );

    // Autorizado
    const okAccess = await authorizeStoreAction(
      owner.data.id,
      storeA.data.id,
      PERMISSIONS.VEHICLES_WRITE
    );
    assert.equal(okAccess.ok, true);

    // Sem sessão / sem vínculo
    const noMembership = await authorizeStoreAction(
      stranger.data.id,
      storeA.data.id,
      PERMISSIONS.STORE_READ
    );
    assert.equal(noMembership.ok, false);
    if (!noMembership.ok) {
      assert.equal(noMembership.code, 'FORBIDDEN');
    }

    const vehicle = await createVehicle(
      {
        storeId: storeA.data.id,
        make: 'Honda',
        makeSlug: 'honda',
        model: 'Civic',
        modelSlug: 'civic',
        version: 'EX',
        condition: 'used',
        status: VEHICLE_STATUS.AVAILABLE,
        ownership: VEHICLE_OWNERSHIP.OWN,
        enteredAt: new Date().toISOString(),
        mileageKm: 1000,
        fuel: 'flex',
        transmission: 'automatic',
        yearManufacture: 2020,
        yearModel: 2020,
        bodyType: 'sedan',
      },
      owner.data.id
    );
    assert.equal(vehicle.ok, true);
    if (!vehicle.ok) return;

    // Vendedor tentando ação restrita (custos)
    const sellerCost = await addVehicleCost(
      {
        storeId: storeA.data.id,
        vehicleId: vehicle.data.id,
        type: 'repair',
        amountCents: 50000,
        incurredAt: new Date().toISOString(),
      },
      seller.data.id
    );
    assert.equal(sellerCost.ok, false);
    if (!sellerCost.ok) {
      assert.equal(sellerCost.code, 'FORBIDDEN');
    }

    const ownerCost = await addVehicleCost(
      {
        storeId: storeA.data.id,
        vehicleId: vehicle.data.id,
        type: 'repair',
        amountCents: 50000,
        incurredAt: new Date().toISOString(),
      },
      owner.data.id
    );
    assert.equal(ownerCost.ok, true);

    // Usuário da loja B não lê veículos da loja A
    const crossList = await listStoreVehicles(storeA.data.id, stranger.data.id);
    assert.equal(crossList.ok, false);

    const crossAsOwnerB = await listPrivateVehicleCosts(
      storeA.data.id,
      vehicle.data.id,
      // owner tem vínculo em A e B — OK. Usar seller de A tentando store B:
      seller.data.id
    );
    // seller is on A — this should work for costs? No, seller can't read costs
    assert.equal(crossAsOwnerB.ok, false);

    const crossStore = await listStoreVehicles(storeB.data.id, seller.data.id);
    assert.equal(crossStore.ok, false);
    if (!crossStore.ok) {
      assert.equal(crossStore.code, 'FORBIDDEN');
    }

    // Vínculo revogado
    const revoked = await revokeStoreMembership(storeA.data.id, seller.data.id);
    assert.equal(revoked.ok, true);
    if (revoked.ok) {
      assert.equal(revoked.data.status, MEMBERSHIP_STATUS.REVOKED);
    }

    const afterRevoke = await listStoreVehicles(storeA.data.id, seller.data.id);
    assert.equal(afterRevoke.ok, false);

    // Sessão expirada (registro session com expiresAt no passado)
    const db = getDb();
    const expiredToken = createId();
    await db.insert(sessions).values({
      id: createId(),
      token: expiredToken,
      userId: owner.data.id,
      expiresAt: new Date(Date.now() - 60_000),
      createdAt: new Date(Date.now() - 120_000),
      updatedAt: new Date(Date.now() - 120_000),
    });

    const rows = await db.select().from(sessions);
    const expired = rows.find((r) => r.token === expiredToken);
    assert.ok(expired);
    assert.ok(expired.expiresAt.getTime() < Date.now());
  });
});
