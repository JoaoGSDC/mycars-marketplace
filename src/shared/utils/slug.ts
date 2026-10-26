/** Slug simples pt-BR (sem acentos). */
export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function storeLocationSlug(city: string, state: string): string {
  return `${slugify(city)}-${state.toLowerCase()}`;
}
