import { VEHICLE_STATUS, type VehicleStatus } from '@app-types/status';

/**
 * Espelho de `INVENTORY_STATUS_TRANSITIONS` (server) — só UX no client.
 * `reserved` / `sold` não mudam pelo módulo de estoque.
 */
export const INVENTORY_TRANSITIONS: Record<VehicleStatus, readonly VehicleStatus[]> = {
  [VEHICLE_STATUS.PREPARING]: [VEHICLE_STATUS.AVAILABLE, VEHICLE_STATUS.WITHDRAWN],
  [VEHICLE_STATUS.AVAILABLE]: [VEHICLE_STATUS.PREPARING, VEHICLE_STATUS.WITHDRAWN],
  [VEHICLE_STATUS.RESERVED]: [],
  [VEHICLE_STATUS.SOLD]: [],
  [VEHICLE_STATUS.WITHDRAWN]: [VEHICLE_STATUS.PREPARING],
};
