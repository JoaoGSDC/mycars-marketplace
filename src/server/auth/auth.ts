import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';

import { getDb, accounts, sessions, users, verifications } from '@lib/db';

function resolveAuthSecret(): string {
  const secret = process.env.BETTER_AUTH_SECRET;

  if (secret) {
    return secret;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('BETTER_AUTH_SECRET é obrigatória em production');
  }

  // Somente desenvolvimento local — nunca versionar valor real de produção.
  return 'dev-only-better-auth-secret-change-me';
}

function resolveBaseURL(): string {
  return process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
}

function resolveDatabaseUrl(): string {
  return process.env.TURSO_DATABASE_URL ?? 'file:./.data/local.db';
}

/**
 * Better Auth — sessões, senhas e recuperação.
 * Papéis de loja ficam em `store_memberships` (não no token do client).
 */
if (!process.env.TURSO_DATABASE_URL) {
  process.env.TURSO_DATABASE_URL = resolveDatabaseUrl();
}

export const auth = betterAuth({
  appName: 'MyCars',
  baseURL: resolveBaseURL(),
  secret: resolveAuthSecret(),
  database: drizzleAdapter(getDb(), {
    provider: 'sqlite',
    schema: {
      user: users,
      session: sessions,
      account: accounts,
      verification: verifications,
    },
  }),
  user: {
    modelName: 'user',
    additionalFields: {
      phone: {
        type: 'string',
        required: false,
        input: true,
      },
      status: {
        type: 'string',
        required: false,
        defaultValue: 'active',
        input: false,
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    requireEmailVerification: false,
    sendResetPassword: async ({ user, url }) => {
      // Em produção: integrar provedor de e-mail. Em dev: log seguro (sem senha).
      if (process.env.NODE_ENV !== 'production') {
        console.info('[auth] reset password', { email: user.email, url });
      }
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5,
    },
  },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 20,
    customRules: {
      '/sign-in/email': { window: 60, max: 8 },
      '/sign-up/email': { window: 60, max: 5 },
      '/request-password-reset': { window: 60, max: 3 },
      '/forget-password': { window: 60, max: 3 },
      '/reset-password': { window: 60, max: 5 },
    },
  },
  advanced: {
    database: {
      generateId: () => crypto.randomUUID(),
    },
  },
  plugins: [nextCookies()],
});

export type AuthSession = typeof auth.$Infer.Session;
