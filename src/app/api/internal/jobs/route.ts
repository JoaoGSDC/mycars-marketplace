import { NextResponse } from 'next/server';
import { z } from 'zod';

import { JOB_KINDS } from '@app-types/integrity';
import { assertJobsSecret, runScheduledJob } from '@server/integrity/jobs.service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  kind: z.enum([
    JOB_KINDS.AVAILABILITY_ENFORCEMENT,
    JOB_KINDS.PRIVACY_RETENTION,
  ]),
  storeId: z.string().min(1).optional(),
  window: z.string().min(4).max(40).optional(),
});

/**
 * Cron / worker interno.
 * Auth: header Authorization: Bearer $INTERNAL_JOBS_SECRET
 */
export async function POST(request: Request) {
  if (!assertJobsSecret(request.headers.get('authorization'))) {
    return NextResponse.json({ ok: false, message: 'Não autorizado' }, { status: 401 });
  }

  let json: unknown;

  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: 'JSON inválido' }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: parsed.error.issues[0]?.message ?? 'Payload inválido' },
      { status: 400 }
    );
  }

  const outcome = await runScheduledJob(parsed.data);
  const status = outcome.status === 'failed' ? 500 : 200;

  return NextResponse.json({ ok: outcome.status !== 'failed', ...outcome }, { status });
}

export async function GET(request: Request) {
  if (!assertJobsSecret(request.headers.get('authorization'))) {
    return NextResponse.json({ ok: false, message: 'Não autorizado' }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    kinds: Object.values(JOB_KINDS),
  });
}
