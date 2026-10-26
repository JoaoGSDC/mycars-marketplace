export interface FixtureBrand {
  id: string;
  name: string;
  initials: string;
}

/** Marcas fictícias para mocks e protótipos (não confundir com `brand` da plataforma). */
export const fixtureBrands: FixtureBrand[] = [
  { id: 'brand-aurora', name: 'Aurora Motors', initials: 'AM' },
  { id: 'brand-atlas', name: 'Atlas Veículos', initials: 'AT' },
  { id: 'brand-novadrive', name: 'NovaDrive', initials: 'ND' },
  { id: 'brand-serra', name: 'Serra Automóveis', initials: 'SA' },
  { id: 'brand-orla', name: 'Orla Motors', initials: 'OM' },
  { id: 'brand-campo', name: 'Campo & Cia', initials: 'CC' },
];

export const fixtureBrandsById: Record<string, FixtureBrand> = Object.fromEntries(
  fixtureBrands.map((item) => [item.id, item])
);
