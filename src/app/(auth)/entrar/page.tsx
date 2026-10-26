import { Suspense } from 'react';

import { Skeleton } from '@components/ui';
import { LoginForm } from '@features/auth';

export default function LoginPage() {
  return (
    <Suspense fallback={<Skeleton className="mx-auto h-96 w-full max-w-md" />}>
      <LoginForm />
    </Suspense>
  );
}
