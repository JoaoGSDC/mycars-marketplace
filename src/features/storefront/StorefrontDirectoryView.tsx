'use client';

import { Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useRef, useState, useTransition } from 'react';

import { PageShell, SiteFooter, SiteHeader, buildMarketplaceNav } from '@components/layout';
import { StoreCard } from '@components/marketplace';
import {
  Badge,
  BottomSheet,
  BottomSheetBody,
  BottomSheetContent,
  BottomSheetHeader,
  BottomSheetTitle,
  Breadcrumb,
  Button,
  EmptyState,
  Eyebrow,
  Field,
  Heading,
  Pagination,
  Select,
  SelectItem,
} from '@components/ui';
import type { StoreProfile } from '@app-types/vehicle';
import {
  buildStoreDirectoryHref,
  createEmptyStoreDirectoryParams,
  mergeStoreDirectoryParams,
  type StoreDirectoryParams,
  type StoreDirectorySort,
} from '@utils/store-directory-params';
import { useFavorites } from '@hooks/use-favorites';
import { cn } from '@utils/cn';

import { STORE_DIRECTORY_SORT_OPTIONS, storefrontContent } from './storefront.content';
import styles from './styles.module.css';

export type StoreDirectoryResultView = {
  items: StoreProfile[];
  total: number;
  pagina: number;
  totalPaginas: number;
  cityOptions: Array<{ value: string; label: string }>;
};

export type StorefrontDirectoryViewProps = {
  params: StoreDirectoryParams;
  result: StoreDirectoryResultView;
};

export function StorefrontDirectoryView({ params, result }: StorefrontDirectoryViewProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [searchDraft, setSearchDraft] = useState(params.q ?? '');
  const [sortOpen, setSortOpen] = useState(false);
  const favorites = useFavorites();
  const copy = storefrontContent.directory;

  const hasFilters = Boolean(params.q || params.cidade || params.ordem !== 'relevancia');

  function navigate(patch: Partial<StoreDirectoryParams>) {
    const next = mergeStoreDirectoryParams(params, {
      ...patch,
      pagina: patch.pagina ?? 1,
    });

    startTransition(() => {
      router.push(buildStoreDirectoryHref(next));
    });
  }

  function onSearchChange(value: string) {
    setSearchDraft(value);

    if (searchTimer.current) {
      clearTimeout(searchTimer.current);
    }

    searchTimer.current = setTimeout(() => {
      navigate({ q: value.trim() || undefined });
    }, 400);
  }

  function clearFilters() {
    setSearchDraft('');
    startTransition(() => {
      router.push(buildStoreDirectoryHref(createEmptyStoreDirectoryParams()));
    });
  }

  return (
    <PageShell className={styles.storefrontShell}>
      <a href="#resultados-lojas" className={styles.storefrontDirectory__skip}>
        {copy.skipLink}
      </a>

      <SiteHeader
        variant="solid"
        navItems={buildMarketplaceNav('/lojas')}
        city="Limeira-SP"
        favoritesCount={favorites.count}
        showMessages={false}
        showUser={false}
      />

      <header className={styles.storefrontDirectory__hero}>
        <div className={styles.storefrontDirectory__heroInner}>
          <Breadcrumb
            className={styles.storefrontDirectory__breadcrumb}
            items={[
              { label: 'Início', href: '/' },
              { label: 'Lojas' },
            ]}
          />

          <div className={styles.storefrontDirectory__heroCopy}>
            <Eyebrow className={styles.storefrontDirectory__eyebrow}>{copy.eyebrow}</Eyebrow>
            <Heading as="h1" className={styles.storefrontDirectory__heroTitle}>
              {copy.title}
            </Heading>
            <p className={styles.storefrontDirectory__heroLead}>{copy.description}</p>
          </div>

          <div className={styles.storefrontDirectory__searchRow}>
            <Field
              aria-label={copy.searchPlaceholder}
              placeholder={copy.searchPlaceholder}
              variant="filled"
              value={searchDraft}
              onChange={(event) => {
                onSearchChange(event.target.value);
              }}
              className={styles.storefrontDirectory__searchField}
              prefix={<Search className="size-4 text-text-muted" strokeWidth={1.5} aria-hidden />}
            />
          </div>
        </div>
      </header>

      <main id="resultados-lojas" className={styles.storefrontDirectory}>
        <div className={styles.storefrontDirectory__toolbar}>
          <div className={styles.storefrontDirectory__count}>
            <Badge variant="count">{result.total}</Badge>
            <p>{copy.results(result.total)}</p>
          </div>

          <div className={styles.storefrontDirectory__toolbarActions}>
            {hasFilters ? (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                {copy.clearFilters}
              </Button>
            ) : null}

            <Select
              aria-label={copy.sortLabel}
              value={params.ordem}
              onValueChange={(value) => {
                navigate({ ordem: value as StoreDirectorySort });
              }}
              className={styles.storefrontDirectory__sortDesktop}
            >
              {STORE_DIRECTORY_SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </Select>
          </div>
        </div>

        {result.items.length === 0 ? (
          <EmptyState
            title={copy.emptyTitle}
            description={copy.emptyDescription}
            action={
              hasFilters ? (
                <Button variant="primary" size="sm" onClick={clearFilters}>
                  {copy.emptyAction}
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            <ul className={styles.storefrontDirectory__grid}>
              {result.items.map((store) => (
                <li key={store.id} className={styles.storefrontDirectory__gridItem}>
                  <StoreCard
                    store={store}
                    href={`/lojas/${store.slug}`}
                    ctaLabel={copy.ctaLabel}
                  />
                </li>
              ))}
            </ul>

            <Pagination
              page={result.pagina}
              totalPages={result.totalPaginas}
              getHref={(page) => buildStoreDirectoryHref({ ...params, pagina: page })}
              className={styles.storefrontDirectory__pagination}
            />
          </>
        )}
      </main>

      <div className={styles.storefrontDirectory__mobileBar}>
        <button
          type="button"
          className={styles.storefrontDirectory__mobileBtn}
          onClick={() => {
            setSortOpen(true);
          }}
        >
          {copy.sortLabel}
        </button>
      </div>

      <BottomSheet open={sortOpen} onOpenChange={setSortOpen}>
        <BottomSheetContent height="content">
          <BottomSheetHeader>
            <BottomSheetTitle>{copy.sortLabel}</BottomSheetTitle>
          </BottomSheetHeader>
          <BottomSheetBody>
            <ul className={styles.storefrontDirectory__sortList}>
              {STORE_DIRECTORY_SORT_OPTIONS.map((option) => (
                <li key={option.value}>
                  <button
                    type="button"
                    className={cn(
                      styles.storefrontDirectory__sortOption,
                      params.ordem === option.value && styles['storefrontDirectory__sortOption--active']
                    )}
                    onClick={() => {
                      navigate({ ordem: option.value as StoreDirectorySort });
                      setSortOpen(false);
                    }}
                  >
                    {option.label}
                  </button>
                </li>
              ))}
            </ul>
          </BottomSheetBody>
        </BottomSheetContent>
      </BottomSheet>

      <SiteFooter />
    </PageShell>
  );
}
