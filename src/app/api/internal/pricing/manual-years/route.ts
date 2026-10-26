import { NextResponse } from 'next/server';

import { postManualYears } from '@api/internal/pricing/pricing.controller';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: 'JSON inválido' }, { status: 400 });
  }

  return postManualYears(body);
}
