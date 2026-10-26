import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Button } from '@components/ui';
import { DealerModulePlaceholder, StorefrontSetupView } from '@features/dealer';
import { requireStoreAccess } from '@server/auth/access';
import { PERMISSIONS } from '@app-types/permissions';
import { STORE_STATUS } from '@app-types/status';
import * as storefrontRepo from '@server/repositories/storefront-settings.repository';

export default async function StorefrontSetupPage() {
  const access = await requireStoreAccess({ permission: PERMISSIONS.STOREFRONT_WRITE });

  if (!access.ok) {
    redirect('/painel');
  }

  if (access.data.store.status !== STORE_STATUS.ACTIVE) {
    return (
      <DealerModulePlaceholder
        title="Vitrine disponível após aprovação"
        description="Configure a identidade visual quando o cadastro da loja estiver ativo."
        action={
          <Button variant="outline" asChild>
            <Link href="/painel/solicitacao">Ver solicitação</Link>
          </Button>
        }
      />
    );
  }

  const storefront = await storefrontRepo.findStorefrontByStoreId(access.data.storeId);

  return <StorefrontSetupView store={access.data.store} storefront={storefront ?? null} />;
}
