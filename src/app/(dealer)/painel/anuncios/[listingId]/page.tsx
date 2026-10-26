import { notFound, redirect } from 'next/navigation';

import { PERMISSIONS } from '@app-types/permissions';
import { requireStoreAccess } from '@server/auth/access';
import { getStoreListingDetail } from '@server/listings/listings.service';

type Params = Promise<{ listingId: string }>;

/**
 * Detalhe de anúncio → ficha do veículo (aba Publicação).
 */
export default async function AnuncioDetailRedirectPage({ params }: { params: Params }) {
  const access = await requireStoreAccess({ permission: PERMISSIONS.LISTINGS_READ });

  if (!access.ok) {
    redirect('/painel/estoque');
  }

  const { listingId } = await params;
  const detail = await getStoreListingDetail(
    access.data.storeId,
    listingId,
    access.data.userId
  );

  if (!detail.ok) {
    notFound();
  }

  redirect(`/painel/estoque/${detail.data.vehicle.id}?aba=publicacao`);
}
