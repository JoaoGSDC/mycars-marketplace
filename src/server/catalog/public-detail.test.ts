import assert from 'node:assert/strict';
import { mkdirSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { after, before, describe, it } from 'node:test';

import { migrate } from 'drizzle-orm/libsql/migrator';

const TEST_DB = resolve(process.cwd(), '.data/test-public-detail.db');

describe('detalhe público do anúncio', () => {
  before(async () => {
    rmSync(TEST_DB, { force: true });
    mkdirSync(dirname(TEST_DB), { recursive: true });

    process.env.TURSO_DATABASE_URL = `file:${TEST_DB}`;
    delete process.env.TURSO_AUTH_TOKEN;
    process.env.MEDIA_STORAGE_DRIVER = 'local';
    process.env.MEDIA_LOCAL_ROOT = resolve(process.cwd(), '.data/test-public-detail-media');
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

  async function seedOwnerStore(slug: string, email: string) {
    const { createStore } = await import('@server/stores/stores.service');
    const { createUser, addStoreMember } = await import('@server/users/users.service');
    const { STORE_ROLES } = await import('@app-types/membership');

    const store = await createStore({
      legalName: `${slug} LTDA`,
      tradeName: slug,
      publicName: slug,
      slug,
      subdomain: slug.replace(/-/g, ''),
      city: 'Curitiba',
      state: 'PR',
      status: 'active',
      verified: true,
    });
    assert.equal(store.ok, true);
    if (!store.ok) throw new Error(store.message);

    const { upsertStorefrontSettings } = await import(
      '@server/repositories/storefront-settings.repository'
    );
    await upsertStorefrontSettings({
      storeId: store.data.id,
      whatsappNumber: '41999998888',
      tagline: 'Loja parceira MyCars',
      about: 'Atendimento presencial e online.',
      contactPhone: '4133334444',
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

  async function seedPublished(
    storeId: string,
    userId: string,
    plate: string,
    overrides: Record<string, unknown> = {},
    features: string[] = ['Ar-condicionado', 'Multimídia']
  ) {
    const { createVehicle } = await import('@server/vehicles/vehicles.service');
    const { VEHICLE_STATUS } = await import('@app-types/status');
    const { VEHICLE_OWNERSHIP } = await import('@app-types/membership');
    const { insertVehicleMedia } = await import('@server/repositories/vehicle-media.repository');
    const { createListingForStore, transitionListing } = await import(
      '@server/listings/listings.service'
    );
    const { LISTING_STATUS } = await import('@app-types/status');

    const vehicle = await createVehicle(
      {
        storeId,
        make: 'Volkswagen',
        makeSlug: 'volkswagen',
        model: 'Polo',
        modelSlug: 'polo',
        version: 'TSI',
        condition: 'used',
        status: VEHICLE_STATUS.AVAILABLE,
        ownership: VEHICLE_OWNERSHIP.OWN,
        enteredAt: new Date().toISOString(),
        mileageKm: 30000,
        fuel: 'flex',
        transmission: 'automatic',
        yearManufacture: 2021,
        yearModel: 2022,
        bodyType: 'hatch',
        plate,
        askingPriceCents: 8000000,
        ...overrides,
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

    const created = await createListingForStore(
      {
        storeId,
        vehicleId: vehicle.data.id,
        title: `${vehicle.data.make} ${vehicle.data.model}`,
        description: 'Descrição comercial pública do anúncio.',
        priceCents: 8500000,
        mediaIds: [media.id],
        features,
        status: LISTING_STATUS.DRAFT,
      },
      userId
    );
    assert.equal(created.ok, true);
    if (!created.ok) throw new Error(created.message);

    const published = await transitionListing(
      {
        storeId,
        listingId: created.data.id,
        toStatus: LISTING_STATUS.PUBLISHED,
      },
      userId
    );
    assert.equal(published.ok, true);

    return { vehicle: vehicle.data, listing: created.data, media };
  }

  it('retorna ficha pública com galeria, features e loja', async () => {
    const { getPublicVehicleDetailUncached } = await import(
      '@server/catalog/public-detail.service'
    );
    const owner = await seedOwnerStore('detail-loja-a', 'detail-a@test.example');
    const published = await seedPublished(owner.store.id, owner.user.id, 'DET1A11');

    const detail = await getPublicVehicleDetailUncached(published.listing.slug);
    assert.equal(detail.status, 'available');
    if (detail.status !== 'available') return;

    assert.equal(detail.vehicle.make, 'Volkswagen');
    assert.ok((detail.vehicle.gallery?.length ?? 0) >= 1);
    assert.deepEqual(detail.vehicle.features, ['Ar-condicionado', 'Multimídia']);
    assert.equal(detail.storeContact.whatsappNumber, '41999998888');
    assert.ok(!('askingPriceCents' in detail.vehicle));
    assert.ok(!('vin' in detail.vehicle.specs));
  });

  it('anúncio pausado fica unavailable e lead é bloqueado', async () => {
    const { getPublicVehicleDetailUncached } = await import(
      '@server/catalog/public-detail.service'
    );
    const { transitionListing } = await import('@server/listings/listings.service');
    const { LISTING_STATUS } = await import('@app-types/status');
    const { createListingLead } = await import('@server/leads/leads.service');

    const owner = await seedOwnerStore('detail-loja-b', 'detail-b@test.example');
    const published = await seedPublished(owner.store.id, owner.user.id, 'DET1B22');

    await transitionListing(
      {
        storeId: owner.store.id,
        listingId: published.listing.id,
        toStatus: LISTING_STATUS.PAUSED,
      },
      owner.user.id
    );

    const detail = await getPublicVehicleDetailUncached(published.listing.slug);
    assert.equal(detail.status, 'unavailable');
    if (detail.status !== 'unavailable') return;
    assert.equal(detail.reason, 'paused');

    const lead = await createListingLead(
      {
        listingSlug: published.listing.slug,
        name: 'Cliente',
        phone: '41988887777',
        message: 'Quero saber mais sobre o carro',
        source: 'detail_form',
        originPath: `/veiculos/${published.listing.slug}`,
        company: '',
        formOpenedAt: Date.now() - 5_000,
      },
      { ip: '127.0.0.1', userAgent: 'test' }
    );
    assert.equal(lead.ok, false);
  });

  it('registra interesse com origem e rejeita honeypot', async () => {
    const { createListingLead } = await import('@server/leads/leads.service');
    const owner = await seedOwnerStore('detail-loja-c', 'detail-c@test.example');
    const published = await seedPublished(owner.store.id, owner.user.id, 'DET1C33');

    const honeypot = await createListingLead(
      {
        listingSlug: published.listing.slug,
        name: 'Bot',
        phone: '41977776666',
        message: 'Mensagem de spam bot test',
        source: 'detail_form',
        originPath: `/veiculos/${published.listing.slug}`,
        company: 'Spam Corp',
        formOpenedAt: Date.now() - 5_000,
      },
      { ip: '10.0.0.1', userAgent: 'bot' }
    );
    assert.equal(honeypot.ok, true);
    if (honeypot.ok) {
      assert.equal(honeypot.data.id, 'ignored');
    }

    const ok = await createListingLead(
      {
        listingSlug: published.listing.slug,
        name: 'Maria Silva',
        phone: '41966665555',
        email: 'maria@example.com',
        message: 'Gostaria de agendar uma visita ao veículo',
        source: 'detail_form',
        originPath: `/veiculos/${published.listing.slug}`,
        company: '',
        formOpenedAt: Date.now() - 4_000,
      },
      { ip: '10.0.0.2', userAgent: 'Mozilla/5.0' }
    );
    assert.equal(ok.ok, true);

    const tooFast = await createListingLead(
      {
        listingSlug: published.listing.slug,
        name: 'João',
        phone: '41955554444',
        message: 'Mensagem enviada rápido demais',
        source: 'detail_form',
        originPath: `/veiculos/${published.listing.slug}`,
        company: '',
        formOpenedAt: Date.now(),
      },
      { ip: '10.0.0.3', userAgent: 'Mozilla/5.0' }
    );
    assert.equal(tooFast.ok, false);
  });

  it('sugere veículos semelhantes por modelo/carroceria', async () => {
    const { getPublicVehicleDetailUncached } = await import(
      '@server/catalog/public-detail.service'
    );
    const owner = await seedOwnerStore('detail-loja-d', 'detail-d@test.example');
    const main = await seedPublished(owner.store.id, owner.user.id, 'DET1D44');
    await seedPublished(owner.store.id, owner.user.id, 'DET1D55', {
      make: 'Volkswagen',
      makeSlug: 'volkswagen',
      model: 'Polo',
      modelSlug: 'polo',
      version: 'MSI',
      yearManufacture: 2020,
      yearModel: 2021,
    });
    await seedPublished(owner.store.id, owner.user.id, 'DET1D66', {
      make: 'Fiat',
      makeSlug: 'fiat',
      model: 'Argo',
      modelSlug: 'argo',
      version: 'Drive',
      bodyType: 'hatch',
      yearManufacture: 2019,
      yearModel: 2020,
    });

    const detail = await getPublicVehicleDetailUncached(main.listing.slug);
    assert.equal(detail.status, 'available');
    if (detail.status !== 'available') return;

    assert.ok(detail.similar.length >= 1);
    assert.ok(detail.similar.every((item) => item.slug !== main.listing.slug));
  });
});
