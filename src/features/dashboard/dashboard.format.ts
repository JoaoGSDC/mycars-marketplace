export function formatCents(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) {
    return '—';
  }

  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export function formatPercent(rate: number | null | undefined): string {
  if (rate === null || rate === undefined) {
    return '—';
  }

  return rate.toLocaleString('pt-BR', {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  });
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return '—';
  }

  return value.toLocaleString('pt-BR');
}

export function formatDays(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return '—';
  }

  return `${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} dias`;
}

export function formatDayLabel(day: string): string {
  const date = new Date(`${day}T12:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    return day;
  }

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  }).format(date);
}
