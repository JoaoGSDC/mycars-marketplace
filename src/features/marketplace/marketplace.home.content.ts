import { brand } from '@config/brand';

/** Copy da Home — edite aqui sem mexer na estrutura da View. */
export const homeContent = {
  skipLink: 'Ir para o conteúdo',
  hero: {
    eyebrow: 'ENCONTRE SEU PRÓXIMO CARRO',
    /** Três linhas fixas no hero (não dependem da largura do viewport). */
    titleLines: ['Seu próximo carro', 'está numa loja', 'de confiança'] as const,
    subtitle: 'Veículos de lojas verificadas, com ficha completa e contato direto pelo WhatsApp.',
  },
  intro: {
    title: 'Mais que um catálogo.',
    titleSecondary: 'Uma vitrine para cada loja.',
    description:
      'Reunimos o estoque de lojas verificadas em um só lugar - cada uma com sua identidade, regras e atendimento.',
  },
  bento: {
    imageAlt: 'Veículo em destaque',
    statLabel: 'Marketplace',
    statValueSuffix: 'veículos anunciados por lojas verificadas',
    brandBadge: 'Lojas verificadas',
    brandName: brand.name,
    brandDescription: 'Somente lojistas profissionais. Sem anúncios de particulares.',
    overlayTitle: 'Cada loja com sua vitrine própria',
  },
  categories: {
    eyebrow: 'NAVEGUE POR CARROCERIA',
    title: 'Para cada tipo de estrada',
    description: 'Filtre o estoque público por tipo de carroceria e encontre o perfil certo.',
  },
  ctaDealers: {
    eyebrow: 'PARA LOJISTAS',
    title: 'Tem uma loja de veículos? Anuncie seu estoque.',
    description:
      'Cadastre o carro uma vez e publique no marketplace e na vitrine própria, com controle de leads, reservas e vendas.',
    actionLabel: 'Quero anunciar',
    href: '/para-lojistas',
  },
  latest: {
    eyebrow: 'ÚLTIMOS ANÚNCIOS',
    title: 'Recém-chegados às lojas',
    seeAllLabel: 'Ver todos os veículos',
    seeAllHref: '/veiculos',
    emptyTitle: 'Nenhum anúncio publicado ainda',
    emptyDescription: 'Assim que as lojas publicarem veículos, eles aparecerão aqui.',
  },
  stores: {
    sectionTitle: 'Conheça as vitrines das lojas',
    eyebrow: 'LOJAS PARCEIRAS',
    title: 'Cada loja, uma vitrine',
    actionLabel: 'Ver todas as lojas',
    actionHref: '/lojas',
    emptyTitle: 'Nenhuma loja verificada no momento',
    emptyDescription: 'Novas lojas parceiras aparecerão aqui quando forem ativadas.',
    stats: {
      stores: 'Lojas verificadas',
      vehicles: 'Veículos anunciados',
      cities: 'Cidades',
    },
  },
  howItWorks: {
    eyebrow: 'COMO FUNCIONA',
    title: 'Do clique ao test drive, sem complicação',
    description:
      'Navegue pelo estoque público, compare fichas e fale direto com a loja — sem criar conta para o primeiro contato.',
    actionLabel: 'Explorar veículos',
    actionHref: '/veiculos',
    features: [
      {
        title: 'Lojas verificadas pela plataforma',
        description: 'Somente lojistas profissionais, com identidade e estoque auditáveis.',
      },
      {
        title: 'Ficha completa e transparente',
        description: 'Quilometragem, câmbio, combustível e condições comerciais claras.',
      },
      {
        title: 'Contato direto pelo WhatsApp, sem cadastro',
        description: 'Fale com a loja na hora, sem intermediários desnecessários.',
      },
    ],
  },
  newsletter: {
    title: 'Fique por dentro das novidades.',
    consent: 'Ao se inscrever, você concorda em receber comunicações da plataforma. Consulte nossa',
    privacyLabel: 'Política de Privacidade',
    privacyHref: '/privacidade',
    success: 'Inscrição registrada. Obrigado!',
  },
  metadata: {
    title: `${brand.name} — veículos de lojas verificadas`,
    description:
      'Encontre carros novos, seminovos e usados em lojas verificadas. Ficha completa e contato direto pelo WhatsApp.',
  },
} as const;
