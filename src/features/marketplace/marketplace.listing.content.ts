import type { ResultsSortOption } from '@components/marketplace/ResultsHeader';

export const listingContent = {
  title: 'Carros à venda',
  breadcrumb: [
    { label: 'Início', href: '/' },
    { label: 'Veículos' },
  ],
  emptyTitle: 'Nenhum veículo encontrado',
  emptyDescription: 'Tente remover alguns filtros ou ampliar a faixa de preço e quilometragem.',
  emptyAction: 'Limpar filtros',
  resultsLive: (count: number) =>
    count === 1 ? '1 veículo encontrado' : `${count.toLocaleString('pt-BR')} veículos encontrados`,
  mobileFilters: 'Filtros',
  mobileSort: 'Ordenar',
  applyResults: (count: number) => `Ver ${count.toLocaleString('pt-BR')} resultados`,
  searchPlaceholder: 'Buscar marca, modelo ou versão',
  favoritesNote:
    'Favoritos são salvos só neste navegador (localStorage) até existir conta de consumidor.',
} as const;

export const LISTING_SORT_OPTIONS: ResultsSortOption[] = [
  { value: 'recentes', label: 'Mais recentes' },
  { value: 'menor-preco', label: 'Menor preço' },
  { value: 'maior-preco', label: 'Maior preço' },
  { value: 'menor-km', label: 'Menor quilometragem' },
];

export const CONDITION_OPTIONS = [
  { value: 'novo', label: 'Novo' },
  { value: 'seminovo', label: 'Seminovo' },
  { value: 'usado', label: 'Usado' },
] as const;

export const FUEL_OPTIONS = [
  { value: 'gasolina', label: 'Gasolina' },
  { value: 'etanol', label: 'Etanol' },
  { value: 'flex', label: 'Flex' },
  { value: 'diesel', label: 'Diesel' },
  { value: 'eletrico', label: 'Elétrico' },
  { value: 'hibrido', label: 'Híbrido' },
] as const;

export const TRANSMISSION_OPTIONS = [
  { value: 'manual', label: 'Manual' },
  { value: 'automatico', label: 'Automático' },
  { value: 'cvt', label: 'CVT' },
  { value: 'automatizado', label: 'Automatizado' },
] as const;
