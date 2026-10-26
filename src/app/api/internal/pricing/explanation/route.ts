import { NextResponse } from 'next/server';

import { getExplanation } from '@api/internal/pricing/pricing.controller';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const storeId = searchParams.get('storeId');
  const vehicleId = searchParams.get('vehicleId');

  if (!storeId || !vehicleId) {
    return NextResponse.json(
      { ok: false, message: 'storeId e vehicleId são obrigatórios' },
      { status: 400 }
    );
  }

  return getExplanation(storeId, vehicleId);
}
