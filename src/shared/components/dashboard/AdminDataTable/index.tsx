import type { ReactNode, TableHTMLAttributes } from 'react';

import { Skeleton } from '@components/ui';
import { cn } from '@utils/cn';

import styles from '../admin.module.css';

export type AdminDataTableProps = {
  /** Cabeçalho `<tr><th>…</th></tr>`. */
  head: ReactNode;
  /** Linhas `<tr>…</tr>` ou conteúdo do tbody. */
  children?: ReactNode;
  empty?: ReactNode;
  loading?: boolean;
  loadingRows?: number;
  footer?: ReactNode;
  className?: string;
  tableClassName?: string;
  minWidthClassName?: string;
} & Omit<TableHTMLAttributes<HTMLTableElement>, 'children'>;

export function AdminDataTable({
  head,
  children,
  empty,
  loading = false,
  loadingRows = 5,
  footer,
  className,
  tableClassName,
  minWidthClassName,
  ...tableProps
}: AdminDataTableProps) {
  const showEmpty = !loading && !children && empty;

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {loading ? (
        <div className={styles.adminDataTable__loading} aria-busy="true" aria-live="polite">
          {Array.from({ length: loadingRows }).map((_, index) => (
            <Skeleton key={index} className="h-12 w-full" />
          ))}
        </div>
      ) : showEmpty ? (
        <div className={cn(styles.adminDataTable, styles.adminDataTable__empty)}>{empty}</div>
      ) : (
        <div className={styles.adminDataTable}>
          <table
            className={cn(styles.adminDataTable__table, minWidthClassName, tableClassName)}
            {...tableProps}
          >
            <thead>{head}</thead>
            <tbody>{children}</tbody>
          </table>
        </div>
      )}
      {footer && !loading ? <div className={styles.adminDataTable__footer}>{footer}</div> : null}
    </div>
  );
}

export const adminTableStyles = {
  rowLink: styles.adminDataTable__rowLink,
  rowMeta: styles.adminDataTable__rowMeta,
  rowActions: styles.adminDataTable__rowActions,
  meta: styles.adminDataTable__meta,
};
