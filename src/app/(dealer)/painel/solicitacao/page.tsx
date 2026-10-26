import { redirect } from 'next/navigation';

import { ApplicationStatusView } from '@features/dealer';
import { requireSession } from '@server/auth/access';
import { getStoreApplicationForUser } from '@server/onboarding/onboarding.service';

export default async function ApplicationStatusPage() {
  const session = await requireSession();

  if (!session.ok) {
    redirect('/entrar?next=/painel/solicitacao');
  }

  const application = await getStoreApplicationForUser(session.data.userId);

  return <ApplicationStatusView store={application.ok ? application.data : null} />;
}
