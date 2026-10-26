import { VEHICLE_STATUS, type VehicleStatus } from '@app-types/status';

/**
 * Transições permitidas no módulo de estoque.
 * `reserved` e `sold` só entram via casos de uso de reserva/venda.
 */
export const INVENTORY_STATUS_TRANSITIONS: Record<VehicleStatus, readonly VehicleStatus[]> = {
  [VEHICLE_STATUS.PREPARING]: [VEHICLE_STATUS.AVAILABLE, VEHICLE_STATUS.WITHDRAWN],
  [VEHICLE_STATUS.AVAILABLE]: [
    VEHICLE_STATUS.PREPARING,
    VEHICLE_STATUS.WITHDRAWN,
  ],
  [VEHICLE_STATUS.RESERVED]: [],
  [VEHICLE_STATUS.SOLD]: [],
  [VEHICLE_STATUS.WITHDRAWN]: [VEHICLE_STATUS.PREPARING],
};

export function canTransitionVehicleStatus(
  from: string,
  to: string,
  source: 'inventory' | 'reservation' | 'sale' = 'inventory'
): boolean {
  if (from === to) {
    return true;
  }

  if (source === 'reservation') {
    return (
      (from === VEHICLE_STATUS.AVAILABLE && to === VEHICLE_STATUS.RESERVED) ||
      (from === VEHICLE_STATUS.RESERVED && to === VEHICLE_STATUS.AVAILABLE)
    );
  }

  if (source === 'sale') {
    return (
      (from === VEHICLE_STATUS.AVAILABLE || from === VEHICLE_STATUS.RESERVED) &&
      to === VEHICLE_STATUS.SOLD
    );
  }

  const allowed = INVENTORY_STATUS_TRANSITIONS[from as VehicleStatus] ?? [];

  return allowed.includes(to as VehicleStatus);
}

export function isVehicleEditable(status: string): boolean {
  return status !== VEHICLE_STATUS.SOLD;
}

export { daysInStock } from '@utils/stock';
