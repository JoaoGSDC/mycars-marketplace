/** Privacidade, retenção e solicitações da loja. */

export const PRIVACY_REQUEST_TYPES = {
  EXPORT: 'export',
  DELETION: 'deletion',
} as const;

export type PrivacyRequestType =
  (typeof PRIVACY_REQUEST_TYPES)[keyof typeof PRIVACY_REQUEST_TYPES];

export const PRIVACY_REQUEST_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  REJECTED: 'rejected',
  RETENTION_HOLD: 'retention_hold',
} as const;

export type PrivacyRequestStatus =
  (typeof PRIVACY_REQUEST_STATUS)[keyof typeof PRIVACY_REQUEST_STATUS];

/**
 * Retenção mínima (dias) — obrigações comerciais / auditoria.
 * Dados pessoais de leads/clientes sem vínculo comercial ativo: 365 dias.
 * Auditoria e vendas: 1825 dias (5 anos).
 */
export const RETENTION_POLICY_DAYS = {
  CUSTOMER_IDLE: 365,
  AUDIT_EVENTS: 1825,
  SALES: 1825,
  AVAILABILITY_CONFIRMATIONS: 730,
} as const;

/** Campos jamais persistidos em auditoria/payload. */
export const AUDIT_REDACTED_KEYS = [
  'password',
  'passwordHash',
  'token',
  'accessToken',
  'refreshToken',
  'secret',
  'authorization',
  'cookie',
  'creditCard',
  'cardNumber',
  'cvv',
] as const;
