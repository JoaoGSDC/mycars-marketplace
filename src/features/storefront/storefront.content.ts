export const storefrontContent = {
  vehiclesNav: 'Veículos',
  aboutNav: 'Sobre',
  contactNav: 'Contato',
  whatsappCta: 'WhatsApp',
  stockCta: 'Ver estoque',
  adminLink: 'Painel',
  heroEyebrow: 'Nossa loja',
  verifiedLabel: 'Verificada',
  catalogEyebrow: 'Estoque',
  catalogTitle: 'Conheça nossos veículos',
  emptyTitle: 'Nenhum veículo publicado',
  emptyDescription: 'Esta loja ainda não tem anúncios públicos no momento.',
  aboutEyebrow: 'Institucional',
  aboutSectionTitle: 'Conheça nossa loja',
  aboutTitle: 'Sobre a loja',
  hoursTitle: 'Horários',
  addressTitle: 'Endereço',
  contactTitle: 'Contato',
  ctaEyebrow: 'Fale conosco',
  ctaTitle: (storeName: string) => `Pronto para o próximo passo com a ${storeName}?`,
  ctaDescription: 'Fale com nossa equipe ou explore o estoque completo disponível agora.',
  poweredBy: 'Uma vitrine MyCars',
  results: (count: number) =>
    count === 1 ? '1 veículo' : `${count.toLocaleString('pt-BR')} veículos`,
  previewBanner: 'Pré-visualização autenticada — não é a URL pública da vitrine.',
  missingSubdomainTitle: 'Vitrine não encontrada',
  missingSubdomainDescription: 'Este subdomínio não corresponde a nenhuma loja ativa.',
  directory: {
    eyebrow: 'Lojas parceiras',
    title: 'Encontre a loja certa para o seu próximo carro.',
    description:
      'Explore lojas verificadas, conheça suas vitrines e encontre veículos disponíveis perto de você.',
    searchPlaceholder: 'Buscar loja por nome',
    cityLabel: 'Cidade',
    sortLabel: 'Ordenar',
    clearFilters: 'Limpar filtros',
    results: (count: number) =>
      count === 1 ? '1 loja encontrada' : `${count.toLocaleString('pt-BR')} lojas encontradas`,
    emptyTitle: 'Nenhuma loja encontrada',
    emptyDescription:
      'Ajuste a busca ou a cidade para descobrir outras vitrines verificadas no MyCars.',
    emptyAction: 'Limpar filtros',
    ctaLabel: 'Ver vitrine',
    skipLink: 'Ir para resultados',
  },
  /** @deprecated Use directory.* */
  directoryTitle: 'Lojas parceiras',
  directoryDescription: 'Conheça as vitrines das lojas verificadas no marketplace.',
  directoryEmpty: 'Nenhuma loja verificada publicada no momento.',
  sortLabel: 'Ordenar',
  searchPlaceholder: 'Buscar na loja',
  filtersLabel: 'Filtros',
  filtersTitle: 'Filtros',
  clearFilters: 'Limpar tudo',
  applyFilters: (count: number) =>
    count === 1 ? 'Ver 1 veículo' : `Ver ${count.toLocaleString('pt-BR')} veículos`,
} as const;

export const STOREFRONT_SORT_OPTIONS = [
  { value: 'recentes', label: 'Mais recentes' },
  { value: 'menor-preco', label: 'Menor preço' },
  { value: 'maior-preco', label: 'Maior preço' },
  { value: 'menor-km', label: 'Menor quilometragem' },
] as const;

export const STORE_DIRECTORY_SORT_OPTIONS = [
  { value: 'relevancia', label: 'Relevância' },
  { value: 'anuncios', label: 'Mais anúncios' },
  { value: 'nome', label: 'Nome (A–Z)' },
] as const;
