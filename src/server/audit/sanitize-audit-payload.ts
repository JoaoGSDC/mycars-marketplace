import { AUDIT_REDACTED_KEYS } from '@app-types/privacy';

const REDACTED = '[redacted]';

function isSensitiveKey(key: string): boolean {
  const normalized = key.toLowerCase();

  return AUDIT_REDACTED_KEYS.some(
    (blocked) =>
      normalized === blocked.toLowerCase() ||
      normalized.includes(blocked.toLowerCase())
  );
}

/** Remove senhas, tokens e campos sensíveis de payloads de auditoria. */
export function sanitizeAuditPayload(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeAuditPayload(item));
  }

  if (typeof value === 'object') {
    const input = value as Record<string, unknown>;
    const output: Record<string, unknown> = {};

    for (const [key, nested] of Object.entries(input)) {
      if (isSensitiveKey(key)) {
        output[key] = REDACTED;
        continue;
      }

      output[key] = sanitizeAuditPayload(nested);
    }

    return output;
  }

  return value;
}

export function toAuditPayloadJson(payload: unknown): string {
  try {
    return JSON.stringify(sanitizeAuditPayload(payload) ?? {});
  } catch {
    return '{}';
  }
}
