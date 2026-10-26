'use server';

import { headers } from 'next/headers';

import { createListingLead, registerWhatsAppClick } from '@server/leads/leads.service';
import type {
  CreateListingLeadInput,
  RegisterWhatsAppClickInput,
} from '@server/leads/leads.validators';

function fail(message: string, code?: string) {
  return { ok: false as const, message, code };
}

async function requestMeta() {
  const headerStore = await headers();
  const forwarded = headerStore.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || headerStore.get('x-real-ip');
  const userAgent = headerStore.get('user-agent');

  return { ip, userAgent };
}

export async function createListingLeadAction(input: CreateListingLeadInput) {
  const meta = await requestMeta();
  const result = await createListingLead(input, meta);

  if (!result.ok) {
    return fail(result.message, result.code);
  }

  return { ok: true as const, data: result.data };
}

export async function registerWhatsAppClickAction(input: RegisterWhatsAppClickInput) {
  const meta = await requestMeta();
  const result = await registerWhatsAppClick(input, meta);

  if (!result.ok) {
    return fail(result.message, result.code);
  }

  return { ok: true as const, data: result.data };
}
