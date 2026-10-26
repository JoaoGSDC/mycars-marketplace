import { Users } from 'lucide-react';
import { redirect } from 'next/navigation';

import { DealerModulePlaceholder } from '@features/dealer';
import { requireStoreAccess } from '@server/auth/access';
import { PERMISSIONS } from '@app-types/permissions';

export default async function EquipePage() {
  const access = await requireStoreAccess({ permission: PERMISSIONS.MEMBERS_MANAGE });

  if (!access.ok) {
    redirect('/painel');
  }

  return (
    <DealerModulePlaceholder
      icon={<Users className="size-8" strokeWidth={1.5} />}
      title="Equipe"
      description="Membros, papéis e convites da loja. A navegação já respeita a permissão de gestão de membros."
    />
  );
}
