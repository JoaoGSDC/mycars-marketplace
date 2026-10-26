'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useMemo } from 'react';

import { cn } from '@utils/cn';

import styles from './styles.module.css';

type PageItem = number | 'ellipsis';

function buildPageItems(current: number, total: number): PageItem[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const items: PageItem[] = [1];

  if (current > 3) {
    items.push('ellipsis');
  }

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let page = start; page <= end; page += 1) {
    items.push(page);
  }
  if (current < total - 2) {
    items.push('ellipsis');
  }

  items.push(total);

  return items;
}

export type PaginationProps = {
  page: number;
  totalPages: number;
  onPageChange?: (page: number) => void;
  /** Quando informado, renderiza links reais preservando SEO/navegação. */
  getHref?: (page: number) => string;
  className?: string;
};

export function Pagination({ page, totalPages, onPageChange, getHref, className }: PaginationProps) {
  const items = useMemo(() => buildPageItems(page, totalPages), [page, totalPages]);

  if (totalPages <= 1) {
    return null;
  }

  const canPrev = page > 1;
  const canNext = page < totalPages;

  function renderControl(label: string, targetPage: number, enabled: boolean, icon: 'prev' | 'next') {
    const content = (
      <>
        {icon === 'prev' ? <ChevronLeft className="size-4" strokeWidth={1.5} aria-hidden /> : null}
        {label}
        {icon === 'next' ? <ChevronRight className="size-4" strokeWidth={1.5} aria-hidden /> : null}
      </>
    );

    const classNameControl = cn(styles.pagination__control, !enabled && styles['pagination__control--disabled']);

    if (getHref && enabled) {
      return (
        <Link href={getHref(targetPage)} className={classNameControl} aria-disabled={!enabled}>
          {content}
        </Link>
      );
    }

    return (
      <button
        type="button"
        className={classNameControl}
        disabled={!enabled}
        onClick={() => {
          onPageChange?.(targetPage);
        }}
      >
        {content}
      </button>
    );
  }

  return (
    <nav className={cn(styles.pagination, className)} aria-label="Paginação">
      {renderControl('Anterior', page - 1, canPrev, 'prev')}
      <ul className={styles.pagination__list}>
        {items.map((item, index) => {
          if (item === 'ellipsis') {
            return (
              <li key={`ellipsis-${index}`} className={styles.pagination__ellipsis} aria-hidden>
                …
              </li>
            );
          }

          const isActive = item === page;
          const pageClass = cn(styles.pagination__page, isActive && styles['pagination__page--active']);

          return (
            <li key={item}>
              {getHref ? (
                <Link href={getHref(item)} className={pageClass} aria-current={isActive ? 'page' : undefined}>
                  {item}
                </Link>
              ) : (
                <button
                  type="button"
                  aria-current={isActive ? 'page' : undefined}
                  className={pageClass}
                  onClick={() => {
                    onPageChange?.(item);
                  }}
                >
                  {item}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {renderControl('Próxima', page + 1, canNext, 'next')}
    </nav>
  );
}
