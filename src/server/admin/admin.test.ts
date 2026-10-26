import assert from 'node:assert/strict';
import { mkdirSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { after, before, describe, it } from 'node:test';

import { eq } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/libsql/migrator';

const TEST_DB = resolve(process.cwd(), '.data/test-admin.db');

describe('painel administrativo da plataforma', () => {
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

  async function seedAdmin(email: string) {
    const { createUser } = await import('@server/users/users.service');
    const { getDb, users } = await import('@lib/db');

    const user = await createUser({ email, name: 'Platform Admin' });
    assert.equal(user.ok, true);
    if (!user.ok) throw new Error(user.message);

    await getDb()
      .update(users)
      .set({ platformRole: 'admin' })
      .where(eq(users.id, user.data.id));

    return user.data;
  }

  async function seedOwnerStore(slug: string, email: string) {
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
      status: STORE_STATUS.PENDING,
      verified: false,
    });
    assert.equal(store.ok, true);
    if (!store.ok) throw new Error(store.message);

    const owner = await createUser({ email, name: 'Owner Admin Test' });
    assert.equal(owner.ok, true);
    if (!owner.ok) throw new Error(owner.message);

    await addStoreMember({
      storeId: store.data.id,
      userId: owner.data.id,
      role: STORE_ROLES.OWNER,
    });

    return { store: store.data, owner: owner.data };
  }

  it('bloqueia usuário comum e permite admin aprovar, assinar, moderar e auditar', async () => {
    const { reviewStoreApplication, suspendStore } = await import(
      '@server/onboarding/onboarding.service'
    );
    const { searchStoresForAdmin, reactivateStoreAdmin } = await import(
      '@server/admin/stores-admin.service'
    );
    const { assignSubscriptionAdmin, listPlansAdmin } = await import(
      '@server/admin/plans-admin.service'
    );
    const {
      createListingReportAdmin,
      moderateListingAdmin,
      searchListingsForAdmin,
    } = await import('@server/admin/listings-admin.service');
    const { getPlatformMetricsAdmin, searchAuditAdmin } = await import(
      '@server/admin/metrics-admin.service'
    );
    const { assertStoreCanPublishListing } = await import('@server/admin/plan-limits');
    const { createVehicle } = await import('@server/vehicles/vehicles.service');
    const { createListingForStore, transitionListing } = await import(
      '@server/listings/listings.service'
    );
    const { insertVehicleMedia } = await import('@server/repositories/vehicle-media.repository');
    const { VEHICLE_OWNERSHIP } = await import('@app-types/membership');
    const { LISTING_STATUS, STORE_STATUS, VEHICLE_STATUS } = await import('@app-types/status');
    const { SUBSCRIPTION_STATUS } = await import('@app-types/subscription');
    const { createUser } = await import('@server/users/users.service');

    const admin = await seedAdmin('admin@platform.test');
    const common = await createUser({ email: 'common@platform.test', name: 'Common' });
    assert.equal(common.ok, true);
    if (!common.ok) throw new Error(common.message);

    const forbidden = await searchStoresForAdmin({ page: 1, pageSize: 20 }, common.data.id);
    assert.equal(forbidden.ok, false);
    if (forbidden.ok) throw new Error('comum não acessa admin');
    assert.equal(forbidden.code, 'FORBIDDEN');

    const seeded = await seedOwnerStore('adm-loja-a', 'owner-a@platform.test');

    const approved = await reviewStoreApplication(
      { storeId: seeded.store.id, decision: 'approve' },
      admin.id
    );
    assert.equal(approved.ok, true);
    if (!approved.ok) throw new Error(approved.message);
    assert.equal(approved.data.status, STORE_STATUS.ACTIVE);

    const plans = await listPlansAdmin(admin.id);
    assert.equal(plans.ok, true);
    if (!plans.ok) throw new Error(plans.message);
    const piloto = plans.data.find((plan) => plan.code === 'piloto');
    assert.ok(piloto);

    const limitedPlan = plans.data.find((plan) => plan.code === 'starter');
    assert.ok(limitedPlan);

    const assigned = await assignSubscriptionAdmin(
      {
        storeId: seeded.store.id,
        planId: limitedPlan!.id,
        status: SUBSCRIPTION_STATUS.ACTIVE,
        notes: 'Piloto manual',
      },
      admin.id
    );
    assert.equal(assigned.ok, true);
    if (!assigned.ok) throw new Error(assigned.message);

    const vehicle = await createVehicle(
      {
        storeId: seeded.store.id,
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
        plate: 'ADM1A11',
        askingPriceCents: 6000000,
      },
      seeded.owner.id
    );
    assert.equal(vehicle.ok, true);
    if (!vehicle.ok) throw new Error(vehicle.message);

    const media = await insertVehicleMedia({
      storeId: seeded.store.id,
      vehicleId: vehicle.data.id,
      url: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800',
      cardUrl: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=400',
      detailUrl: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=1200',
      sortOrder: 0,
      isPrimary: 'true',
    });

    const listing = await createListingForStore(
      {
        storeId: seeded.store.id,
        vehicleId: vehicle.data.id,
        title: 'Argo Drive teste admin',
        description: 'Descrição comercial suficiente para publicação administrativa',
        priceCents: 6200000,
        mediaIds: [media.id],
        status: LISTING_STATUS.DRAFT,
      },
      seeded.owner.id
    );
    assert.equal(listing.ok, true);
    if (!listing.ok) throw new Error(listing.message);

    await getDbLimitHack(limitedPlan!.id, 0);

    const publishBlocked = await transitionListing(
      {
        storeId: seeded.store.id,
        listingId: listing.data.id,
        toStatus: LISTING_STATUS.PUBLISHED,
      },
      seeded.owner.id
    );
    assert.equal(publishBlocked.ok, false);
    if (publishBlocked.ok) throw new Error('limite deveria bloquear');

    await getDbLimitHack(limitedPlan!.id, 15);

    const published = await transitionListing(
      {
        storeId: seeded.store.id,
        listingId: listing.data.id,
        toStatus: LISTING_STATUS.PUBLISHED,
      },
      seeded.owner.id
    );
    assert.equal(published.ok, true);
    if (!published.ok) throw new Error(published.message);

    const planOk = await assertStoreCanPublishListing(seeded.store.id);
    assert.equal(planOk.ok, true);

    const suspendedListing = await moderateListingAdmin(
      {
        listingId: listing.data.id,
        toStatus: LISTING_STATUS.SUSPENDED,
        reason: 'Conteúdo irregular no teste',
      },
      admin.id
    );
    assert.equal(suspendedListing.ok, true);
    if (!suspendedListing.ok) throw new Error(suspendedListing.message);
    assert.equal(suspendedListing.data.status, LISTING_STATUS.SUSPENDED);

    const report = await createListingReportAdmin(
      {
        listingId: listing.data.id,
        reason: 'Denúncia de teste administrativo',
      },
      admin.id
    );
    assert.equal(report.ok, true);

    const listings = await searchListingsForAdmin(
      { status: LISTING_STATUS.SUSPENDED, page: 1, pageSize: 20 },
      admin.id
    );
    assert.equal(listings.ok, true);
    if (!listings.ok) throw new Error(listings.message);
    assert.ok(listings.data.total >= 1);

    const suspendedStore = await suspendStore(
      seeded.store.id,
      'Irregularidade comercial no teste',
      admin.id
    );
    assert.equal(suspendedStore.ok, true);

    const reactivated = await reactivateStoreAdmin(
      {
        storeId: seeded.store.id,
        reason: 'Regularizado após análise',
      },
      admin.id
    );
    assert.equal(reactivated.ok, true);
    if (!reactivated.ok) throw new Error(reactivated.message);
    assert.equal(reactivated.data.status, STORE_STATUS.ACTIVE);

    const metrics = await getPlatformMetricsAdmin({}, admin.id);
    assert.equal(metrics.ok, true);
    if (!metrics.ok) throw new Error(metrics.message);
    assert.ok(metrics.data.metrics.storesRegistered >= 1);
    assert.ok(metrics.data.metrics.storesPaying >= 1);

    const audit = await searchAuditAdmin({ actionPrefix: 'store.', page: 1, pageSize: 50 }, admin.id);
    assert.equal(audit.ok, true);
    if (!audit.ok) throw new Error(audit.message);
    assert.ok(audit.data.total >= 1);

    const cross = await searchStoresForAdmin({ page: 1, pageSize: 20 }, common.data.id);
    assert.equal(cross.ok, false);
  });
});

async function getDbLimitHack(planId: string, maxPublished: number) {
  const { getDb, plans, nowIso } = await import('@lib/db');
  const { eq } = await import('drizzle-orm');

  await getDb()
    .update(plans)
    .set({ maxPublishedListings: maxPublished, updatedAt: nowIso() })
    .where(eq(plans.id, planId));
}
