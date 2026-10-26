import { JOB_KINDS, JOB_RUN_STATUS, type JobKind } from '@app-types/integrity';
import * as jobRunsRepo from '@server/repositories/job-runs.repository';
import { nowIso } from '@lib/db';

import { enforceAvailabilityHolds } from './availability.service';
import { runPrivacyRetentionSweep } from '@server/privacy/privacy.service';

const STALE_RUNNING_MS = 30 * 60 * 1000;

function utcDayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

async function resolveIdempotencyKey(kind: JobKind, window: string): Promise<{
  key: string;
  existingCompleted: Awaited<ReturnType<typeof jobRunsRepo.findJobRunByIdempotencyKey>>;
}> {
  const base = `${kind}:${window}`;
  const existing = await jobRunsRepo.findJobRunByIdempotencyKey(base);

  if (!existing) {
    return { key: base, existingCompleted: undefined };
  }

  if (existing.status === JOB_RUN_STATUS.COMPLETED) {
    return { key: base, existingCompleted: existing };
  }

  if (existing.status === JOB_RUN_STATUS.RUNNING) {
    const age = Date.now() - new Date(existing.startedAt).getTime();

    if (age < STALE_RUNNING_MS) {
      return { key: base, existingCompleted: existing };
    }

    await jobRunsRepo.failJobRun(existing.id, 'Execução interrompida ou expirada (stale)');
  }

  return { key: `${base}:attempt:${Date.now()}`, existingCompleted: undefined };
}

export type JobRunOutcome = {
  kind: JobKind;
  idempotencyKey: string;
  status: string;
  processedCount: number;
  skippedDuplicate: boolean;
  result: unknown;
  errorMessage?: string | null;
};

async function executeKind(
  kind: JobKind,
  options: { storeId?: string }
): Promise<{ processedCount: number; result: unknown }> {
  if (kind === JOB_KINDS.AVAILABILITY_ENFORCEMENT) {
    const outcome = await enforceAvailabilityHolds({
      storeId: options.storeId,
      actorUserId: null,
    });

    return {
      processedCount: outcome.pausedListingIds.length,
      result: outcome,
    };
  }

  if (kind === JOB_KINDS.PRIVACY_RETENTION) {
    const outcome = await runPrivacyRetentionSweep({ storeId: options.storeId });

    return {
      processedCount: outcome.anonymizedCustomers + outcome.purgedConfirmations,
      result: outcome,
    };
  }

  throw new Error(`Job kind desconhecido: ${kind}`);
}

/** Executa job agendado com idempotência e registro de falhas. */
export async function runScheduledJob(params: {
  kind: JobKind;
  storeId?: string;
  window?: string;
}): Promise<JobRunOutcome> {
  const window = params.window ?? utcDayKey();
  const { key, existingCompleted } = await resolveIdempotencyKey(params.kind, window);

  if (existingCompleted) {
    let parsed: unknown = null;

    if (existingCompleted.resultJson) {
      try {
        parsed = JSON.parse(existingCompleted.resultJson);
      } catch {
        parsed = null;
      }
    }

    return {
      kind: params.kind,
      idempotencyKey: key,
      status: existingCompleted.status,
      processedCount: existingCompleted.processedCount,
      skippedDuplicate: true,
      result: parsed,
      errorMessage: existingCompleted.errorMessage,
    };
  }

  const started = await jobRunsRepo.startJobRun({
    kind: params.kind,
    idempotencyKey: key,
  });

  if (!started.created) {
    let parsed: unknown = null;

    if (started.run.resultJson) {
      try {
        parsed = JSON.parse(started.run.resultJson);
      } catch {
        parsed = null;
      }
    }

    return {
      kind: params.kind,
      idempotencyKey: key,
      status: started.run.status,
      processedCount: started.run.processedCount,
      skippedDuplicate: true,
      result: parsed,
      errorMessage: started.run.errorMessage,
    };
  }

  try {
    const outcome = await executeKind(params.kind, { storeId: params.storeId });
    const completed = await jobRunsRepo.completeJobRun(started.run.id, {
      processedCount: outcome.processedCount,
      resultJson: JSON.stringify(outcome.result),
    });

    return {
      kind: params.kind,
      idempotencyKey: key,
      status: completed.status,
      processedCount: completed.processedCount,
      skippedDuplicate: false,
      result: outcome.result,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha desconhecida no job';
    await jobRunsRepo.failJobRun(started.run.id, message);

    return {
      kind: params.kind,
      idempotencyKey: key,
      status: JOB_RUN_STATUS.FAILED,
      processedCount: 0,
      skippedDuplicate: false,
      result: null,
      errorMessage: message,
    };
  }
}

export function assertJobsSecret(headerValue: string | null): boolean {
  const expected = process.env.INTERNAL_JOBS_SECRET;

  if (!expected || expected.length < 16) {
    return false;
  }

  if (!headerValue) {
    return false;
  }

  const token = headerValue.startsWith('Bearer ')
    ? headerValue.slice('Bearer '.length).trim()
    : headerValue.trim();

  return token === expected;
}

export function jobsHealthStamp(): string {
  return nowIso();
}
