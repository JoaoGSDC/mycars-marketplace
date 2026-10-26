import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { ToastProvider } from '@components/ui';
import { OnboardingWizard } from '@features/marketing';
import { requireSession } from '@server/auth/access';
import { getStoreApplicationForUser } from '@server/onboarding/onboarding.service';
import { STORE_STATUS } from '@app-types/status';

export const metadata: Metadata = {
  title: 'Cadastro de lojista',
  robots: { index: false, follow: false },
};

export default async function DealerSignupPage() {
  const session = await requireSession();

  if (!session.ok) {
    redirect('/entrar?next=/para-lojistas/cadastro');
  }

  const existing = await getStoreApplicationForUser(session.data.userId);

  if (
    existing.ok &&
    existing.data &&
    (existing.data.status === STORE_STATUS.PENDING || existing.data.status === STORE_STATUS.ACTIVE)
  ) {
    redirect('/painel/solicitacao');
  }

  return (
    <ToastProvider>
      <OnboardingWizard
        userName={session.data.session.user.name}
        userEmail={session.data.session.user.email}
      />
    </ToastProvider>
  );
}
