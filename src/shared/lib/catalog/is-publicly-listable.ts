import { LISTING_STATUS, STORE_STATUS, VEHICLE_STATUS } from '@app-types/status';
import type { VehicleListing } from '@app-types/vehicle';

/**
 * Única regra de visibilidade pública: o que NÃO pode aparecer em consultas do marketplace.
 * - Veículo vendido, retirado ou em preparação → oculto
 * - Anúncio não publicado (rascunho, pausado, suspenso, encerrado) → oculto
 * - Loja suspensa/encerrada/pendente → oculto
 * - Reservado permanece listável (com sinalização clara na UI)
 */
export function isPubliclyListable(vehicle: VehicleListing): boolean {
  if (vehicle.listingStatus !== LISTING_STATUS.PUBLISHED) {
    return false;
  }

  if (
    vehicle.status === VEHICLE_STATUS.SOLD ||
    vehicle.status === VEHICLE_STATUS.WITHDRAWN ||
    vehicle.status === VEHICLE_STATUS.PREPARING
  ) {
    return false;
  }

  const storeStatus = vehicle.store.storeStatus ?? STORE_STATUS.ACTIVE;

  if (storeStatus !== STORE_STATUS.ACTIVE) {
    return false;
  }

  return true;
}
