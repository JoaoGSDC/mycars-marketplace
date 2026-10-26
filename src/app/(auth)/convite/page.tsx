import { Suspense } from 'react';

import { Skeleton } from '@components/ui';
import { AcceptInviteForm } from '@features/auth';

export default function InvitePage() {
  return (
    <Suspense fallback={<Skeleton className="mx-auto h-72 w-full max-w-md" />}>
      <AcceptInviteForm />
    </Suspense>
  );
}
