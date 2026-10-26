export type ServiceErrorCode =
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'VALIDATION'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'INTERNAL';

export type ServiceSuccess<T> = { ok: true; data: T };
export type ServiceFailure = { ok: false; code: ServiceErrorCode; message: string };
export type ServiceResult<T> = ServiceSuccess<T> | ServiceFailure;

export function serviceSuccess<T>(data: T): ServiceSuccess<T> {
  return { ok: true, data };
}

export function serviceError(code: ServiceErrorCode, message: string): ServiceFailure {
  return { ok: false, code, message };
}
