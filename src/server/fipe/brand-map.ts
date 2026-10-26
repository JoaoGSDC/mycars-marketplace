/**
 * Mapa estático makeSlug (catálogo interno) → aliases de nome na Parallelum.
 * O matching final usa a lista dinâmica de marcas do provedor.
 */
export const MAKE_SLUG_FIPE_ALIASES: Record<string, string[]> = {
  volkswagen: ['vw', 'volkswagen', 'volks'],
  fiat: ['fiat'],
  chevrolet: ['chevrolet', 'gm', 'gm - chevrolet'],
  toyota: ['toyota'],
  honda: ['honda'],
  hyundai: ['hyundai'],
  jeep: ['jeep'],
  nissan: ['nissan'],
  renault: ['renault'],
  byd: ['byd'],
  ford: ['ford'],
  peugeot: ['peugeot'],
  citroen: ['citroen', 'citroën'],
  mitsubishi: ['mitsubishi'],
  kia: ['kia'],
  bmw: ['bmw'],
  mercedes: ['mercedes', 'mercedes-benz'],
  audi: ['audi'],
  volvo: ['volvo'],
  landrover: ['land rover', 'landrover'],
  porsche: ['porsche'],
  subaru: ['subaru'],
  suzuki: ['suzuki'],
  chery: ['chery', 'caoa chery'],
  jac: ['jac'],
  gwm: ['gwm', 'great wall'],
  ram: ['ram'],
  mini: ['mini'],
  jaguar: ['jaguar'],
};

export function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function tokenize(value: string): string[] {
  return normalizeText(value)
    .split(' ')
    .filter((token) => token.length > 1);
}

/** Score simples: tokens do query presentes no alvo. */
export function scoreNameMatch(query: string, candidate: string): number {
  const qTokens = tokenize(query);
  const cNorm = normalizeText(candidate);

  if (!qTokens.length || !cNorm) {
    return 0;
  }

  if (cNorm === normalizeText(query)) {
    return 100;
  }

  let hits = 0;

  for (const token of qTokens) {
    if (cNorm.includes(token)) {
      hits += 1;
    }
  }

  return Math.round((hits / qTokens.length) * 80);
}
