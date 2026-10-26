'use client';

import { useEffect } from 'react';

import { Button, EmptyState } from '@components/ui';

export default function PainelError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[painel]', error);
  }, [error]);

  return (
    <EmptyState
      title="Não foi possível carregar esta área"
      description="Tente novamente. Se o problema continuar, saia e entre de novo na conta."
      action={
        <Button type="button" onClick={reset}>
          Tentar de novo
        </Button>
      }
    />
  );
}
