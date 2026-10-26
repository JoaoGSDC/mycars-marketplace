import { brand } from '@config/brand';

/** Formata valor em R$ (pt-BR). */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat(brand.locale, {
    style: 'currency',
    currency: brand.currency,
    maximumFractionDigits: 0,
  }).format(value);
}

/** Formata quilometragem com separador de milhar + unidade. */
export function formatMileage(km: number): string {
  const formatted = new Intl.NumberFormat(brand.locale).format(km);

  return `${formatted} ${brand.distanceUnit}`;
}

/** Formata contador (ex.: 1637 → "1.637"). */
export function formatCount(value: number): string {
  return new Intl.NumberFormat(brand.locale).format(value);
}
