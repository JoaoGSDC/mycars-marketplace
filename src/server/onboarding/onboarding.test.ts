import assert from 'node:assert/strict';
import { mkdirSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { after, before, describe, it } from 'node:test';

import { migrate } from 'drizzle-orm/libsql/migrator';

const TEST_DB = resolve(process.cwd(), '.data/test-onboarding.db');

describe('onboarding de lojistas', () => {
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

  it('envia solicitação, bloqueia publicação, aprova e configura vitrine', async () => {
    const { createUser } = await import('@server/users/users.service');
    const {
      submitStoreApplication,
      reviewStoreApplication,
      updateStorefrontSetup,
    } = await import('@server/onboarding/onboarding.service');
    const { createVehicle } = await import('@server/vehicles/vehicles.service');
    const { createListing } = await import('@server/listings/listings.service');
    const { STORE_STATUS, VEHICLE_STATUS, LISTING_STATUS } = await import('@app-types/status');
    const { VEHICLE_OWNERSHIP } = await import('@app-types/membership');
    const { getDb, users } = await import('@lib/db');
    const { eq } = await import('drizzle-orm');

    const owner = await createUser({ email: 'dealer-onb@example.com', name: 'Dealer Onb' });
    const admin = await createUser({ email: 'admin-onb@example.com', name: 'Admin Onb' });
    assert.equal(owner.ok && admin.ok, true);
    if (!owner.ok || !admin.ok) return;

    const db = getDb();
    await db.update(users).set({ platformRole: 'admin' }).where(eq(users.id, admin.data.id));

    const application = await submitStoreApplication(
      {
        legalName: 'Auto Center Onboarding LTDA',
        tradeName: 'Auto Onboarding',
        publicName: 'Auto Onboarding',
        document: '11444777000161',
        street: 'Rua das Flores',
        addressNumber: '100',
        complement: null,
        neighborhood: 'Centro',
        city: 'Curitiba',
        state: 'PR',
        zipCode: '80010000',
        phone: '41999990000',
        whatsapp: '41999990000',
        email: 'contato@autoonb.example',
        responsibleName: 'Dealer Onb',
        responsibleEmail: 'dealer-onb@example.com',
        responsiblePhone: '41999990000',
        institutionalInfo: 'Loja especializada em seminovos com atendimento consultivo.',
        slug: 'auto-onboarding',
        subdomain: 'autoonb',
      },
      owner.data.id
    );

    assert.equal(application.ok, true);
    if (!application.ok) return;
    assert.equal(application.data.status, STORE_STATUS.PENDING);

    const dup = await submitStoreApplication(
      {
        legalName: 'Outra LTDA',
        tradeName: 'Outra',
        publicName: 'Outra',
        document: '11444777000161',
        street: 'Rua B',
        addressNumber: '1',
        neighborhood: 'Centro',
        city: 'Curitiba',
        state: 'PR',
        zipCode: '80010000',
        phone: '41999990001',
        whatsapp: '41999990001',
        email: 'outra@example.com',
        responsibleName: 'X',
        responsibleEmail: 'x@example.com',
        responsiblePhone: '41999990001',
        institutionalInfo: 'Texto institucional com mais de vinte caracteres.',
        slug: 'outra-loja',
        subdomain: 'outraloja',
      },
      owner.data.id
    );
    assert.equal(dup.ok, false);

    // Owner already member via submit — create vehicle as owner
    const vehicle = await createVehicle(
      {
        storeId: application.data.id,
        make: 'VW',
        makeSlug: 'vw',
        model: 'Gol',
        modelSlug: 'gol',
        version: '1.0',
        condition: 'used',
        status: VEHICLE_STATUS.AVAILABLE,
        ownership: VEHICLE_OWNERSHIP.OWN,
        enteredAt: new Date().toISOString(),
        mileageKm: 10,
        fuel: 'flex',
        transmission: 'manual',
        yearManufacture: 2018,
        yearModel: 2018,
        bodyType: 'hatch',
      },
      owner.data.id
    );
    assert.equal(vehicle.ok, true);
    if (!vehicle.ok) return;

    const publishPending = await createListing({
      storeId: application.data.id,
      vehicleId: vehicle.data.id,
      slug: 'gol-onb-pending',
      title: 'Gol',
      description: 'teste',
      priceCents: 3000000,
      status: LISTING_STATUS.PUBLISHED,
      featured: false,
    });
    assert.equal(publishPending.ok, false);
    if (!publishPending.ok) {
      assert.equal(publishPending.code, 'FORBIDDEN');
    }

    const draftOk = await createListing({
      storeId: application.data.id,
      vehicleId: vehicle.data.id,
      slug: 'gol-onb-draft',
      title: 'Gol draft',
      description: 'teste',
      priceCents: 3000000,
      status: LISTING_STATUS.DRAFT,
      featured: false,
    });
    assert.equal(draftOk.ok, true);

    const approved = await reviewStoreApplication(
      { storeId: application.data.id, decision: 'approve' },
      admin.data.id
    );
    assert.equal(approved.ok, true);
    if (!approved.ok) return;
    assert.equal(approved.data.status, STORE_STATUS.ACTIVE);
    assert.equal(approved.data.subscriptionStatus, 'none');

    const setup = await updateStorefrontSetup(
      {
        storeId: application.data.id,
        publicName: 'Auto Onboarding Premium',
        slug: 'auto-onboarding',
        subdomain: 'autoonb',
        logoUrl: 'https://example.com/logo.png',
        coverImageUrl: 'https://example.com/cover.jpg',
        about: 'Nova descrição',
        tagline: 'Seminovos',
        primaryColor: '#C93A0C',
        businessHoursJson: '[{"day":"seg-sex","open":"09:00","close":"18:00"}]',
        socialInstagram: '@autoonb',
        socialFacebook: null,
        whatsappNumber: '41999990000',
        contactEmail: 'contato@autoonb.example',
        contactPhone: '41999990000',
      },
      owner.data.id
    );
    assert.equal(setup.ok, true);

    const rejectNeedsReason = await reviewStoreApplication(
      {
        storeId: application.data.id,
        decision: 'reject',
        rejectionReason: 'duplicado',
      },
      admin.data.id
    );
    assert.equal(rejectNeedsReason.ok, false);
  });

  it('rejeição registra motivo e suspensão preserva dados', async () => {
    const { createUser } = await import('@server/users/users.service');
    const { submitStoreApplication, reviewStoreApplication, suspendStore } = await import(
      '@server/onboarding/onboarding.service'
    );
    const { STORE_STATUS } = await import('@app-types/status');
    const { getDb, users } = await import('@lib/db');
    const { eq } = await import('drizzle-orm');

    const owner = await createUser({ email: 'reject-onb@example.com', name: 'Reject Onb' });
    const admin = await createUser({ email: 'admin2-onb@example.com', name: 'Admin 2' });
    assert.equal(owner.ok && admin.ok, true);
    if (!owner.ok || !admin.ok) return;

    await getDb().update(users).set({ platformRole: 'admin' }).where(eq(users.id, admin.data.id));

    const application = await submitStoreApplication(
      {
        legalName: 'Rejeitada LTDA',
        tradeName: 'Rejeitada',
        publicName: 'Rejeitada',
        document: '11222333000181',
        street: 'Av Central',
        addressNumber: '50',
        neighborhood: 'Centro',
        city: 'Londrina',
        state: 'PR',
        zipCode: '86010000',
        phone: '43988887777',
        whatsapp: '43988887777',
        email: 'rej@example.com',
        responsibleName: 'Reject Onb',
        responsibleEmail: 'reject-onb@example.com',
        responsiblePhone: '43988887777',
        institutionalInfo: 'Empresa de teste para fluxo de rejeição cadastral.',
        slug: 'loja-rejeitada',
        subdomain: 'lojarej',
      },
      owner.data.id
    );
    assert.equal(application.ok, true);
    if (!application.ok) return;

    const rejected = await reviewStoreApplication(
      {
        storeId: application.data.id,
        decision: 'reject',
        rejectionReason: 'Documentação incompleta',
      },
      admin.data.id
    );
    assert.equal(rejected.ok, true);
    if (!rejected.ok) return;
    assert.equal(rejected.data.status, STORE_STATUS.REJECTED);
    assert.equal(rejected.data.rejectionReason, 'Documentação incompleta');

    // Nova loja para suspender após aprovação
    const owner2 = await createUser({ email: 'suspend-onb@example.com', name: 'Suspend' });
    assert.equal(owner2.ok, true);
    if (!owner2.ok) return;

    const app2 = await submitStoreApplication(
      {
        legalName: 'Suspender LTDA',
        tradeName: 'Suspender',
        publicName: 'Suspender',
        document: '60746948000112',
        street: 'Rua X',
        addressNumber: '9',
        neighborhood: 'Centro',
        city: 'Maringá',
        state: 'PR',
        zipCode: '87010000',
        phone: '44977776666',
        whatsapp: '44977776666',
        email: 'sus@example.com',
        responsibleName: 'Suspend',
        responsibleEmail: 'suspend-onb@example.com',
        responsiblePhone: '44977776666',
        institutionalInfo: 'Empresa de teste para fluxo de suspensão cadastral.',
        slug: 'loja-suspender',
        subdomain: 'lojasus',
      },
      owner2.data.id
    );
    assert.equal(app2.ok, true);
    if (!app2.ok) return;

    await reviewStoreApplication({ storeId: app2.data.id, decision: 'approve' }, admin.data.id);
    const suspended = await suspendStore(app2.data.id, 'Irregularidade comercial', admin.data.id);
    assert.equal(suspended.ok, true);
    if (!suspended.ok) return;
    assert.equal(suspended.data.status, STORE_STATUS.SUSPENDED);
    assert.ok(suspended.data.legalName);
    assert.equal(suspended.data.document, '60746948000112');
  });

  it('salva rascunho sem publicar e publica limpando o draft', async () => {
    const { createUser } = await import('@server/users/users.service');
    const {
      submitStoreApplication,
      reviewStoreApplication,
      saveStorefrontDraft,
      discardStorefrontDraft,
      updateStorefrontSetup,
      parseStorefrontDraft,
    } = await import('@server/onboarding/onboarding.service');
    const { findStorefrontByStoreId } = await import(
      '@server/repositories/storefront-settings.repository'
    );
    const { findStoreById } = await import('@server/repositories/stores.repository');
    const { STORE_STATUS } = await import('@app-types/status');
    const { getDb, users } = await import('@lib/db');
    const { eq } = await import('drizzle-orm');

    const owner = await createUser({ email: 'draft-onb@example.com', name: 'Draft Onb' });
    const admin = await createUser({ email: 'admin-draft@example.com', name: 'Admin Draft' });
    assert.equal(owner.ok && admin.ok, true);
    if (!owner.ok || !admin.ok) return;

    await getDb().update(users).set({ platformRole: 'admin' }).where(eq(users.id, admin.data.id));

    const application = await submitStoreApplication(
      {
        legalName: 'Draft Store LTDA',
        tradeName: 'Draft Store',
        publicName: 'Draft Store',
        document: '18727053000174',
        street: 'Rua Draft',
        addressNumber: '1',
        neighborhood: 'Centro',
        city: 'Curitiba',
        state: 'PR',
        zipCode: '80020000',
        phone: '41911112222',
        whatsapp: '41911112222',
        email: 'draft@example.com',
        responsibleName: 'Draft Onb',
        responsibleEmail: 'draft-onb@example.com',
        responsiblePhone: '41911112222',
        institutionalInfo: 'Loja de teste para rascunho de vitrine do painel.',
        slug: 'draft-store',
        subdomain: 'draftstore',
      },
      owner.data.id
    );
    assert.equal(application.ok, true, application.ok ? undefined : application.message);
    if (!application.ok) return;

    await reviewStoreApplication(
      { storeId: application.data.id, decision: 'approve' },
      admin.data.id
    );

    const draftPayload = {
      publicName: 'Draft Store Preview',
      slug: 'draft-store',
      subdomain: 'draftstore',
      logoUrl: '',
      coverImageUrl: '',
      about: 'Texto só no rascunho',
      tagline: 'Rascunho',
      primaryColor: '#C93A0C',
      heroVariant: 'split' as const,
      coverFocus: 'top' as const,
      businessHoursJson: '[]',
      socialInstagram: '',
      socialFacebook: '',
      whatsappNumber: '41911112222',
      contactEmail: 'draft@example.com',
      contactPhone: '41911112222',
    };

    const saved = await saveStorefrontDraft(
      { storeId: application.data.id, draft: draftPayload },
      owner.data.id
    );
    assert.equal(saved.ok, true);

    const settingsAfterDraft = await findStorefrontByStoreId(application.data.id);
    assert.ok(settingsAfterDraft?.draftJson);
    assert.notEqual(settingsAfterDraft?.about, 'Texto só no rascunho');
    assert.notEqual(settingsAfterDraft?.heroVariant, 'split');
    assert.equal(parseStorefrontDraft(settingsAfterDraft?.draftJson)?.about, 'Texto só no rascunho');

    const storeAfterDraft = await findStoreById(application.data.id);
    assert.equal(storeAfterDraft?.publicName, 'Draft Store');
    assert.equal(storeAfterDraft?.status, STORE_STATUS.ACTIVE);

    const discarded = await discardStorefrontDraft(
      { storeId: application.data.id },
      owner.data.id
    );
    assert.equal(discarded.ok, true);
    const settingsCleared = await findStorefrontByStoreId(application.data.id);
    assert.equal(settingsCleared?.draftJson, null);

    await saveStorefrontDraft(
      { storeId: application.data.id, draft: draftPayload },
      owner.data.id
    );

    const published = await updateStorefrontSetup(
      { storeId: application.data.id, ...draftPayload },
      owner.data.id
    );
    assert.equal(published.ok, true);

    const settingsPublished = await findStorefrontByStoreId(application.data.id);
    assert.equal(settingsPublished?.draftJson, null);
    assert.equal(settingsPublished?.about, 'Texto só no rascunho');
    assert.equal(settingsPublished?.heroVariant, 'split');

    const storePublished = await findStoreById(application.data.id);
    assert.equal(storePublished?.publicName, 'Draft Store Preview');
  });
});
