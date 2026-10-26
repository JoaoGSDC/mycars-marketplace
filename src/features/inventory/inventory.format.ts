import { formatCurrency } from '@utils/format';
import { daysInStock } from '@utils/stock';

/** Preço em centavos → R$ formatado. */
export function formatCents(cents: number | null | undefined): string {
  if (cents == null) {
    return '—';
  }

  return formatCurrency(cents / 100);
}

export function formatDaysInStock(enteredAt: string): string {
  const days = daysInStock(enteredAt);

  if (days === 0) {
    return 'Hoje';
  }

  if (days === 1) {
    return '1 dia';
  }

  return `${days} dias`;
}

export function reaisInputToCents(value: string): number | null {
  const normalized = value.replace(/\./g, '').replace(',', '.').trim();

  if (!normalized) {
    return null;
  }

  const n = Number(normalized);

  if (Number.isNaN(n) || n < 0) {
    return null;
  }

  return Math.round(n * 100);
}

export function centsToReaisInput(cents: number | null | undefined): string {
  if (cents == null) {
    return '';
  }

  return (cents / 100).toFixed(2).replace('.', ',');
}
