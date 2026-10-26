/**
 * Placeholder único da marca da plataforma.
 * Altere `name` (e derivados) aqui — demais UIs consomem este módulo.
 */
export const brand = {
  name: 'MyCars',
  /** Letra destacada em laranja no wordmark (última ocorrência no nome). */
  accentLetter: 'C',
  tagline: 'O marketplace de veículos para lojistas',
  email: 'contato@mycars.example',
  locale: 'pt-BR',
  currency: 'BRL',
  distanceUnit: 'km',
  /**
   * Hero: caminho local (`/images/hero.jpg`) ou URL absoluta (ex. Unsplash).
   * Local inexistente → ImagePlaceholder. URL remota é usada direto.
   */
  heroImageSrc:
    'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=2400&q=80' as
      | string
      | undefined,
} as const;

export type Brand = typeof brand;
