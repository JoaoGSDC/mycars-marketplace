'use client';

import { cn } from '@utils/cn';

import styles from '../admin.module.css';

export type AdminFormErrorItem = {
  id: string;
  message: string;
  /** id do campo / elemento para foco */
  fieldId?: string;
};

export type AdminFormErrorSummaryProps = {
  title?: string;
  errors: AdminFormErrorItem[];
  className?: string;
};

export function AdminFormErrorSummary({
  title = 'Corrija os itens abaixo',
  errors,
  className,
}: AdminFormErrorSummaryProps) {
  if (errors.length === 0) {
    return null;
  }

  function focusField(fieldId?: string) {
    if (!fieldId || typeof document === 'undefined') {
      return;
    }

    const el = document.getElementById(fieldId);

    if (el && 'focus' in el) {
      (el as HTMLElement).focus();
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  return (
    <div
      className={cn(styles.adminFormErrorSummary, className)}
      role="alert"
      aria-live="assertive"
    >
      <p className={styles.adminFormErrorSummary__title}>{title}</p>
      <ul className={styles.adminFormErrorSummary__list}>
        {errors.map((error) => (
          <li key={error.id}>
            {error.fieldId ? (
              <button
                type="button"
                className={styles.adminFormErrorSummary__link}
                onClick={() => focusField(error.fieldId)}
              >
                {error.message}
              </button>
            ) : (
              error.message
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
