import { redirect } from 'next/navigation';

import { PERMISSIONS } from '@app-types/permissions';
import { requireStoreAccess } from '@server/auth/access';
import * as listingsRepo from '@server/repositories/listings.repository';
import * as vehiclesRepo from '@server/repositories/vehicles.repository';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Criação de publicação agora é a aba Publicação da ficha do estoque.
 */
export default async function NovoAnuncioRedirectPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const access = await requireStoreAccess({ permission: PERMISSIONS.LISTINGS_WRITE });

  if (!access.ok) {
    redirect('/painel/estoque');
  }

  const params = await searchParams;
  const vehicleId = first(params.vehicleId);

  if (!vehicleId) {
    redirect('/painel/estoque');
  }

  const vehicle = await vehiclesRepo.findVehicleInStore(access.data.storeId, vehicleId);

  if (!vehicle) {
    redirect('/painel/estoque');
  }

  const existing = await listingsRepo.findListingByVehicleId(vehicle.id);

  if (existing) {
    redirect(`/painel/estoque/${vehicle.id}?aba=publicacao`);
  }

  redirect(`/painel/estoque/${vehicle.id}?aba=publicacao&publicar=1`);
}
