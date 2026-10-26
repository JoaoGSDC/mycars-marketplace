'use client';

import Link from 'next/link';
import { useEffect } from 'react';

import { PageShell, SiteHeader, buildMarketplaceNav } from '@components/layout';
import { Button, EmptyState } from '@components/ui';

export default function VeiculosError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <PageShell className="bg-bg">
      <SiteHeader
        variant="solid"
        navItems={buildMarketplaceNav('/veiculos')}
        showMessages={false}
        showUser={false}
      />
      <div className="mx-auto flex w-full max-w-[var(--container-max)] flex-1 items-center px-[var(--container-pad)] py-16">
        <EmptyState
          title="Não foi possível carregar os veículos"
          description="Tente novamente em instantes. Se o problema continuar, volte à página inicial."
          action={
            <div className="flex flex-wrap gap-3">
              <Button variant="primary" onClick={reset}>
                Tentar de novo
              </Button>
              <Button variant="outline" asChild>
                <Link href="/">Ir para o início</Link>
              </Button>
            </div>
          }
        />
      </div>
    </PageShell>
  );
}
