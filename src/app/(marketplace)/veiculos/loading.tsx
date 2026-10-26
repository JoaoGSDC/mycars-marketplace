import { PageShell, SiteHeader, buildMarketplaceNav } from '@components/layout';
import { VehicleCard } from '@components/marketplace';
import { Skeleton } from '@components/ui';

export default function VeiculosLoading() {
  return (
    <PageShell className="bg-bg">
      <SiteHeader
        variant="solid"
        navItems={buildMarketplaceNav('/veiculos')}
        showMessages={false}
        showUser={false}
      />
      <div className="w-full px-[var(--container-pad)] py-8">
        <Skeleton className="mb-4 h-4 w-40" />
        <div className="mb-8 flex items-center gap-3">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-7 w-14 rounded-full" />
        </div>
        <div className="grid gap-8 lg:grid-cols-[20rem_minmax(0,1fr)]">
          <div className="hidden space-y-4 lg:block">
            <Skeleton className="h-40 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <VehicleCard key={index} variant="listing" loading />
            ))}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
