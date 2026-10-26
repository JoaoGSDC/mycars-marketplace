/** Escolhe URL adequada para cards vs detalhe. */
export function resolveMediaUrl(
  media: {
    url?: string | null;
    cardUrl?: string | null;
    detailUrl?: string | null;
    imageUrl?: string | null;
  },
  variant: 'card' | 'detail' = 'card'
): string | undefined {
  if (variant === 'card') {
    return media.cardUrl || media.url || media.detailUrl || media.imageUrl || undefined;
  }

  return media.detailUrl || media.url || media.cardUrl || media.imageUrl || undefined;
}

export function primaryVehicleImageUrl(
  items: Array<{
    url: string;
    cardUrl?: string | null;
    detailUrl?: string | null;
    isPrimary?: boolean | string;
    sortOrder?: number;
  }>,
  variant: 'card' | 'detail' = 'card'
): string | undefined {
  if (items.length === 0) {
    return undefined;
  }

  const sorted = [...items].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  const primary =
    sorted.find((item) => item.isPrimary === true || item.isPrimary === 'true') ?? sorted[0];

  return primary ? resolveMediaUrl(primary, variant) : undefined;
}
