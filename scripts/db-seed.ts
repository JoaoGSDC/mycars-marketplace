/**
 * Seed idempotente para desenvolvimento.
 * Bloqueado em production e sem ALLOW_DB_SEED=true.
 *
 * Uso: npm run db:seed
 *
 * Conta demo: owner@demo-autocenter.example / DemoOwner!234
 */
import { config } from 'dotenv';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

config({ path: '.env.local' });
config({ path: '.env' });

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Seed bloqueado em production');
  }

  if (process.env.ALLOW_DB_SEED !== 'true') {
    throw new Error('Defina ALLOW_DB_SEED=true para executar o seed (somente dev)');
  }

  if (!process.env.TURSO_DATABASE_URL) {
    process.env.TURSO_DATABASE_URL = 'file:./.data/local.db';
  }

  if (!process.env.BETTER_AUTH_SECRET) {
    process.env.BETTER_AUTH_SECRET = 'dev-only-better-auth-secret-change-me';
  }

  if (!process.env.BETTER_AUTH_URL) {
    process.env.BETTER_AUTH_URL = 'http://localhost:3000';
  }

  const url = process.env.TURSO_DATABASE_URL;

  if (url.startsWith('file:')) {
    const filePath = resolve(process.cwd(), url.replace(/^file:/, ''));
    mkdirSync(dirname(filePath), { recursive: true });
  }

  const { STORE_STATUS, VEHICLE_STATUS, LISTING_STATUS } = await import('../src/shared/types/status');
  const { STORE_ROLES, VEHICLE_OWNERSHIP } = await import('../src/shared/types/membership');
  const { createStore } = await import('../src/server/stores/stores.service');
  const { addStoreMember } = await import('../src/server/users/users.service');
  const { createVehicle, addVehicleCost } = await import('../src/server/vehicles/vehicles.service');
  const { createListing } = await import('../src/server/listings/listings.service');
  const { findStoreBySlug } = await import('../src/server/repositories/stores.repository');
  const { findUserByEmail } = await import('../src/server/repositories/users.repository');
  const { auth } = await import('../src/server/auth/auth');

  const ensureAdmin = async () => {
    const adminEmail = 'admin@mycars.example';
    const adminPassword = 'AdminDemo!234';
    let admin = await findUserByEmail(adminEmail);

    if (!admin) {
      await auth.api.signUpEmail({
        body: { name: 'Admin MyCars', email: adminEmail, password: adminPassword },
      });
      admin = await findUserByEmail(adminEmail);
    }

    if (admin) {
      const { getDb, users } = await import('../src/shared/lib/db');
      const { eq } = await import('drizzle-orm');
      await getDb().update(users).set({ platformRole: 'admin' }).where(eq(users.id, admin.id));
    }

    return { adminEmail, adminPassword };
  };

  const existingStore = await findStoreBySlug('demo-autocenter');

  if (existingStore) {
    if (!existingStore.whatsapp) {
      const { getDb, stores } = await import('../src/shared/lib/db');
      const { eq } = await import('drizzle-orm');
      await getDb()
        .update(stores)
        .set({ whatsapp: '11999990000' })
        .where(eq(stores.id, existingStore.id));
      console.log('WhatsApp demo preenchido na loja demo-autocenter.');
    }
    const adminCreds = await ensureAdmin();
    console.log('Seed já aplicado (loja demo-autocenter existe). Admin garantido:', adminCreds);
    return;
  }

  const storeResult = await createStore({
    legalName: 'Demo Autocenter LTDA',
    tradeName: 'Demo Autocenter',
    publicName: 'Demo Autocenter',
    slug: 'demo-autocenter',
    subdomain: 'demo',
    document: '11444777000161',
    city: 'São Paulo',
    state: 'SP',
    neighborhood: 'Moema',
    email: 'contato@demo-autocenter.example',
    phone: '11999990000',
    status: STORE_STATUS.ACTIVE,
    verified: true,
  });

  if (!storeResult.ok) {
    throw new Error(storeResult.message);
  }

  {
    const { getDb, stores } = await import('../src/shared/lib/db');
    const { eq } = await import('drizzle-orm');
    await getDb()
      .update(stores)
      .set({ whatsapp: '11999990000' })
      .where(eq(stores.id, storeResult.data.id));
  }

  const demoEmail = 'owner@demo-autocenter.example';
  const demoPassword = 'DemoOwner!234';

  let user = await findUserByEmail(demoEmail);

  if (!user) {
    const signed = await auth.api.signUpEmail({
      body: {
        name: 'Owner Demo',
        email: demoEmail,
        password: demoPassword,
      },
    });

    user = await findUserByEmail(demoEmail);

    if (!user) {
      throw new Error(`Falha ao criar usuário demo: ${JSON.stringify(signed)}`);
    }
  }

  const membership = await addStoreMember({
    storeId: storeResult.data.id,
    userId: user.id,
    role: STORE_ROLES.OWNER,
    permissions: ['*'],
  });

  if (!membership.ok) {
    throw new Error(membership.message);
  }

  const { adminEmail, adminPassword } = await ensureAdmin();

  const vehicleResult = await createVehicle(
    {
      storeId: storeResult.data.id,
      make: 'Volkswagen',
      makeSlug: 'volkswagen',
      model: 'Polo',
      modelSlug: 'polo',
      version: '1.0 TSI',
      condition: 'used',
      status: VEHICLE_STATUS.AVAILABLE,
      ownership: VEHICLE_OWNERSHIP.OWN,
      enteredAt: new Date().toISOString(),
      mileageKm: 32000,
      fuel: 'flex',
      transmission: 'automatic',
      yearManufacture: 2021,
      yearModel: 2022,
      bodyType: 'hatch',
      color: 'Branco',
    },
    user.id
  );

  if (!vehicleResult.ok) {
    throw new Error(vehicleResult.message);
  }

  const costResult = await addVehicleCost(
    {
      storeId: storeResult.data.id,
      vehicleId: vehicleResult.data.id,
      type: 'acquisition',
      amountCents: 7500000,
      incurredAt: new Date().toISOString(),
      description: 'Aquisição consignada (custo privado — seed)',
    },
    user.id
  );

  if (!costResult.ok) {
    throw new Error(costResult.message);
  }

  const { insertVehicleMedia } = await import('../src/server/repositories/vehicle-media.repository');
  const media = await insertVehicleMedia({
    storeId: storeResult.data.id,
    vehicleId: vehicleResult.data.id,
    url: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=1200',
    cardUrl: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800',
    detailUrl: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=1600',
    sortOrder: 0,
    isPrimary: 'true',
    alt: 'Volkswagen Polo demo',
  });

  const listingResult = await createListing({
    storeId: storeResult.data.id,
    vehicleId: vehicleResult.data.id,
    slug: 'vw-polo-tsi-demo',
    title: 'Volkswagen Polo 1.0 TSI',
    description: 'Veículo de demonstração do seed local.',
    priceCents: 8990000,
    status: LISTING_STATUS.PUBLISHED,
    featured: false,
    mediaIds: [media.id],
    publishedAt: new Date().toISOString(),
  });

  if (!listingResult.ok) {
    throw new Error(listingResult.message);
  }

  console.log('Seed OK:', {
    storeId: storeResult.data.id,
    userId: user.id,
    vehicleId: vehicleResult.data.id,
    listingSlug: listingResult.data.slug,
    login: { email: demoEmail, password: demoPassword },
    admin: { email: adminEmail, password: adminPassword },
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
