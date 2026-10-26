import { redirect } from 'next/navigation';

import { ToastProvider } from '@components/ui';
import { ListingAdminDetailView } from '@features/admin';
import { requirePlatformAdmin } from '@server/auth/platform-admin';
import { getListingAdminDetail } from '@server/admin/listings-admin.service';

export default async function AdminListingDetailPage({
  params,
}: {
  params: Promise<{ listingId: string }>;
}) {
  const admin = await requirePlatformAdmin();

  if (!admin.ok) {
    redirect('/entrar?next=/admin/anuncios');
  }

  const { listingId } = await params;
  const detail = await getListingAdminDetail(listingId, admin.data.userId);

  if (!detail.ok) {
    redirect('/admin/anuncios');
  }

  return (
    <ToastProvider>
      <ListingAdminDetailView
        userName={admin.data.session.user.name}
        listing={detail.data.listing}
        store={detail.data.store}
        vehicle={detail.data.vehicle}
        audit={detail.data.audit}
      />
    </ToastProvider>
  );
}
