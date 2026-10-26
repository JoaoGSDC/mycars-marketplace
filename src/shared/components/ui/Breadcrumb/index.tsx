import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { cn } from '@utils/cn';

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

export type BreadcrumbProps = {
  items: BreadcrumbItem[];
  className?: string;
  separator?: ReactNode;
};

export function Breadcrumb({ items, className, separator }: BreadcrumbProps) {
  return (
    <nav className={cn('text-sm', className)} aria-label="Trilha de navegação">
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={`${item.label}-${index}`} className="inline-flex items-center gap-1">
              {index > 0
                ? (separator ?? (
                    <ChevronRight className="size-3.5 text-text-subtle" strokeWidth={1.5} aria-hidden />
                  ))
                : null}
              {item.href && !isLast ? (
                <Link href={item.href} className="text-text-muted transition-colors hover:text-text">
                  {item.label}
                </Link>
              ) : (
                <span
                  className={cn(isLast ? 'font-medium text-text' : 'text-text-muted')}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
