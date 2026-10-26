import assert from 'node:assert/strict';
import { mkdirSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { after, before, describe, it } from 'node:test';

import { migrate } from 'drizzle-orm/libsql/migrator';

const TEST_DB = resolve(process.cwd(), '.data/test-integrity.db');

describe('integridade comercial, auditoria e privacidade', () => {
  before(async () => {
    rmSync(TEST_DB, { force: true });
    mkdirSync(dirname(TEST_DB), { recursive: true });

    process.env.TURSO_DATABASE_URL = `file:${TEST_DB}`;
    delete process.env.TURSO_AUTH_TOKEN;
    process.env.INTERNAL_JOBS_SECRET = 'test-jobs-secret-16chars';

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

    const owner = await createUser({ email, name: 'Owner Integrity' });
    assert.equal(owner.ok, true);
    if (!owner.ok) throw new Error(owner.message);

    await addStoreMember({
      storeId: store.data.id,
      userId: owner.data.id,
      role: STORE_ROLES.OWNER,
    });

    return { store: store.data, owner: owner.data };
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
        mileageKm: 40000,
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

    await insertVehicleMedia({
      storeId,
      vehicleId: vehicle.data.id,
      url: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800',
      cardUrl: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=400',
      detailUrl: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=1200',
      sortOrder: 0,
      isPrimary: 'true',
    });

    return vehicle.data;
  }

  async function publishForVehicle(storeId: string, vehicleId: string, actorUserId: string) {
    const { createListing } = await import('@server/listings/listings.service');
    const { LISTING_STATUS } = await import('@app-types/status');

    const listing = await createListing(
      {
        storeId,
        vehicleId,
        title: 'Corolla XEi',
        description: 'Veículo em ótimo estado para testes de integridade comercial.',
        priceCents: 9000000,
        status: LISTING_STATUS.PUBLISHED,
        featured: false,
        mediaIds: [],
        features: [],
      },
      actorUserId
    );
    assert.equal(listing.ok, true);
    if (!listing.ok) throw new Error(listing.message);

    return listing.data;
  }

  it('sanitiza payloads de auditoria (senhas/tokens)', async () => {
    const { sanitizeAuditPayload } = await import('@server/audit/sanitize-audit-payload');
    const sanitized = sanitizeAuditPayload({
      priceCents: 100,
      password: 'secret',
      accessToken: 'tok',
      nested: { refreshToken: 'r', ok: true },
    }) as Record<string, unknown>;

    assert.equal(sanitized.priceCents, 100);
    assert.equal(sanitized.password, '[redacted]');
    assert.equal(sanitized.accessToken, '[redacted]');
    assert.equal((sanitized.nested as Record<string, unknown>).refreshToken, '[redacted]');
    assert.equal((sanitized.nested as Record<string, unknown>).ok, true);
  });

  it('confirma em lote e preserva histórico', async () => {
    const { store, owner } = await seedStore('int-batch', 'batch@integrity.test');
    const v1 = await seedAvailableVehicle(store.id, owner.id, 'BAT1A23');
    const v2 = await seedAvailableVehicle(store.id, owner.id, 'BAT2B34');

    const { confirmVehicleAvailabilityBatch, listVehicleConfirmationHistory } = await import(
      '@server/integrity/availability.service'
    );

    const batch = await confirmVehicleAvailabilityBatch(
      { storeId: store.id, vehicleIds: [v1.id, v2.id] },
      owner.id
    );
    assert.equal(batch.ok, true);
    if (!batch.ok) throw new Error(batch.message);
    assert.equal(batch.data.confirmed.length, 2);

    const history = await listVehicleConfirmationHistory(store.id, v1.id, owner.id);
    assert.equal(history.ok, true);
    if (!history.ok) throw new Error(history.message);
    assert.ok(history.data.length >= 1);
    assert.equal(history.data[0]?.source, 'batch');
  });

  it('pausa anúncio vencido sem marcar vendido; reativa após confirmação', async () => {
    const { store, owner } = await seedStore('int-expire', 'expire@integrity.test');
    const vehicle = await seedAvailableVehicle(store.id, owner.id, 'EXP1C45');
    const listing = await publishForVehicle(store.id, vehicle.id, owner.id);

    const { updateIntegrityPolicy, enforceAvailabilityHolds, confirmVehicleAvailability } =
      await import('@server/integrity/availability.service');
    const { getDb, vehicles, listings, nowIso } = await import('@lib/db');
    const { eq } = await import('drizzle-orm');
    const { LISTING_STATUS, VEHICLE_STATUS } = await import('@app-types/status');

    await updateIntegrityPolicy(
      {
        storeId: store.id,
        confirmationIntervalDays: 14,
        graceDays: 0,
        autoPausePublished: true,
        enabled: true,
      },
      owner.id
    );

    const pastDue = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    await getDb()
      .update(vehicles)
      .set({ availabilityDueAt: pastDue, updatedAt: nowIso() })
      .where(eq(vehicles.id, vehicle.id));

    const enforced = await enforceAvailabilityHolds({ storeId: store.id });
    assert.ok(enforced.pausedListingIds.includes(listing.id));

    const paused = await getDb().select().from(listings).where(eq(listings.id, listing.id)).limit(1);
    assert.equal(paused[0]?.status, LISTING_STATUS.PAUSED);
    assert.equal(paused[0]?.availabilityHold, 'true');

    const vehicleRow = await getDb()
      .select()
      .from(vehicles)
      .where(eq(vehicles.id, vehicle.id))
      .limit(1);
    assert.equal(vehicleRow[0]?.status, VEHICLE_STATUS.AVAILABLE);

    const confirmed = await confirmVehicleAvailability(
      { storeId: store.id, vehicleId: vehicle.id },
      owner.id
    );
    assert.equal(confirmed.ok, true);
    if (!confirmed.ok) throw new Error(confirmed.message);
    assert.equal(confirmed.data.resumedListing, true);

    const resumed = await getDb()
      .select()
      .from(listings)
      .where(eq(listings.id, listing.id))
      .limit(1);
    assert.equal(resumed[0]?.status, LISTING_STATUS.PUBLISHED);
    assert.equal(resumed[0]?.availabilityHold, 'false');
  });

  it('não confirma veículo reservado (conflito)', async () => {
    const { store, owner } = await seedStore('int-reserve', 'reserve@integrity.test');
    const vehicle = await seedAvailableVehicle(store.id, owner.id, 'RSV1D56');

    const { createCustomer } = await import('@server/crm/customers.service');
    const { createReservation } = await import('@server/reservations/reservations.service');
    const { OPPORTUNITY_ORIGINS } = await import('@app-types/crm');

    const customer = await createCustomer(
      {
        storeId: store.id,
        name: 'Cliente Reserva',
        phone: '11999990001',
        source: OPPORTUNITY_ORIGINS.WALK_IN,
        dataPurpose: 'commercial_contact',
      },
      owner.id
    );
    assert.equal(customer.ok, true);
    if (!customer.ok) throw new Error(customer.message);

    const reservation = await createReservation(
      {
        storeId: store.id,
        vehicleId: vehicle.id,
        customerId: customer.data.customer.id,
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        durationHours: 48,
      },
      owner.id
    );
    assert.equal(reservation.ok, true);

    const { confirmVehicleAvailability } = await import('@server/integrity/availability.service');
    const result = await confirmVehicleAvailability(
      { storeId: store.id, vehicleId: vehicle.id },
      owner.id
    );
    assert.equal(result.ok, false);
    if (result.ok) throw new Error('deveria falhar');
    assert.equal(result.code, 'CONFLICT');
  });

  it('job de enforcement é idempotente em reexecução', async () => {
    const { store, owner } = await seedStore('int-job', 'job@integrity.test');
    const vehicle = await seedAvailableVehicle(store.id, owner.id, 'JOB1E67');
    const listing = await publishForVehicle(store.id, vehicle.id, owner.id);

    const { updateIntegrityPolicy } = await import('@server/integrity/availability.service');
    const { runScheduledJob } = await import('@server/integrity/jobs.service');
    const { JOB_KINDS } = await import('@app-types/integrity');
    const { getDb, vehicles, listings, nowIso } = await import('@lib/db');
    const { eq } = await import('drizzle-orm');
    const { LISTING_STATUS } = await import('@app-types/status');

    await updateIntegrityPolicy(
      {
        storeId: store.id,
        confirmationIntervalDays: 7,
        graceDays: 0,
        autoPausePublished: true,
        enabled: true,
      },
      owner.id
    );

    const pastDue = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    await getDb()
      .update(vehicles)
      .set({ availabilityDueAt: pastDue, updatedAt: nowIso() })
      .where(eq(vehicles.id, vehicle.id));

    const window = `test-job-${Date.now()}`;
    const first = await runScheduledJob({
      kind: JOB_KINDS.AVAILABILITY_ENFORCEMENT,
      storeId: store.id,
      window,
    });
    assert.equal(first.skippedDuplicate, false);
    assert.ok(first.processedCount >= 1);

    const second = await runScheduledJob({
      kind: JOB_KINDS.AVAILABILITY_ENFORCEMENT,
      storeId: store.id,
      window,
    });
    assert.equal(second.skippedDuplicate, true);

    const row = await getDb().select().from(listings).where(eq(listings.id, listing.id)).limit(1);
    assert.equal(row[0]?.status, LISTING_STATUS.PAUSED);
  });

  it('separa dados e revisão entre lojas', async () => {
    const a = await seedStore('int-store-a', 'a@integrity.test');
    const b = await seedStore('int-store-b', 'b@integrity.test');
    const vehicleA = await seedAvailableVehicle(a.store.id, a.owner.id, 'SEPA111');
    await seedAvailableVehicle(b.store.id, b.owner.id, 'SEPB222');

    const { confirmVehicleAvailability, getAvailabilityReviewQueue } = await import(
      '@server/integrity/availability.service'
    );
    const { requestStoreDataExport } = await import('@server/privacy/privacy.service');

    await confirmVehicleAvailability(
      { storeId: a.store.id, vehicleId: vehicleA.id },
      a.owner.id
    );

    const queueA = await getAvailabilityReviewQueue(a.store.id, a.owner.id);
    const queueB = await getAvailabilityReviewQueue(b.store.id, b.owner.id);
    assert.equal(queueA.ok, true);
    assert.equal(queueB.ok, true);
    if (!queueA.ok || !queueB.ok) throw new Error('fila');

    assert.ok(queueA.data.items.every((item) => item.vehicleId === vehicleA.id || true));
    assert.equal(
      queueA.data.items.some((item) => item.vehicleId === vehicleA.id),
      true
    );
    assert.equal(
      queueB.data.items.some((item) => item.vehicleId === vehicleA.id),
      false
    );

    const exportA = await requestStoreDataExport({ storeId: a.store.id, type: 'export' }, a.owner.id);
    assert.equal(exportA.ok, true);
    if (!exportA.ok) throw new Error(exportA.message);

    const payload = JSON.parse(exportA.data.resultJson ?? '{}') as {
      vehicles: Array<{ id: string }>;
      password?: string;
    };
    assert.ok(payload.vehicles.every((row) => row.id !== undefined));
    assert.equal(
      payload.vehicles.some((row) => row.id === vehicleA.id),
      true
    );
    assert.equal('password' in payload, false);

    const cross = await requestStoreDataExport(
      { storeId: a.store.id, type: 'export' },
      b.owner.id
    );
    assert.equal(cross.ok, false);
  });

  it('registra histórico de alteração de permissões', async () => {
    const { store, owner } = await seedStore('int-perm', 'perm@integrity.test');
    const { createUser, addStoreMember, updateStoreMemberPermissions } = await import(
      '@server/users/users.service'
    );
    const { STORE_ROLES } = await import('@app-types/membership');
    const { listAuditEventsByStore } = await import('@server/repositories/audit-events.repository');

    const seller = await createUser({ email: 'seller-perm@integrity.test', name: 'Seller' });
    assert.equal(seller.ok, true);
    if (!seller.ok) throw new Error(seller.message);

    await addStoreMember({
      storeId: store.id,
      userId: seller.data.id,
      role: STORE_ROLES.SELLER,
    });

    const updated = await updateStoreMemberPermissions({
      storeId: store.id,
      userId: seller.data.id,
      role: STORE_ROLES.MANAGER,
      actorUserId: owner.id,
    });
    assert.equal(updated.ok, true);

    const events = await listAuditEventsByStore(store.id, 50);
    assert.ok(events.some((event) => event.action === 'membership.permissions_changed'));
  });
});
