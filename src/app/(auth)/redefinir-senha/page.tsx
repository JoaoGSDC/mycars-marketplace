import { Suspense } from 'react';

import { Skeleton } from '@components/ui';
import { ResetPasswordForm } from '@features/auth';

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<Skeleton className="mx-auto h-80 w-full max-w-md" />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
