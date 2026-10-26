import { brand } from '@config/brand';

export const dealersLandingContent = {
  skipLink: 'Ir para o conteúdo',
  meta: {
    title: `Para lojistas — ${brand.name}`,
    description:
      'Gerencie estoque, vitrine digital e marketplace em um só lugar. Solicite cadastro da sua loja na MyCars.',
  },
  hero: {
    eyebrow: 'PARA LOJISTAS',
    titleLines: ['Sua loja vende carros.', 'A MyCars conecta', 'todo o resto.'] as const,
    description:
      'Gerencie seus veículos, tenha sua própria vitrine digital e anuncie em um marketplace. Tudo em um único lugar.',
    primaryCta: 'Solicitar cadastro',
    primaryHref: '/para-lojistas/cadastro',
    secondaryCta: 'Conhecer a plataforma',
    secondaryHref: '#demonstracao',
    loginLabel: 'Já tenho conta',
    loginHref: '/entrar?next=/para-lojistas/cadastro',
    previewLabel: 'Demonstração do painel',
  },
  pillars: {
    eyebrow: 'O QUE VOCÊ GANHA',
    title: 'Mais do que anunciar.',
    titleSecondary: 'Operar a loja com clareza.',
    description:
      'A MyCars reúne estoque, presença digital e acompanhamento comercial — com publicação integrada ao marketplace.',
    items: [
      {
        title: 'Estoque organizado',
        description:
          'Cadastro único do veículo, status claros e publicação no marketplace e na vitrine própria.',
        status: 'available' as const,
      },
      {
        title: 'Vitrine com identidade',
        description:
          'Subdomínio da loja, identidade visual e catálogo próprio — sem anúncios de particulares.',
        status: 'available' as const,
      },
      {
        title: 'Oportunidades comerciais',
        description:
          'Interesses e contatos centralizados, com contexto do anúncio para a equipe comercial.',
        status: 'available' as const,
      },
      {
        title: 'Acompanhamento de vendas',
        description: 'Reservas, vendas e indicadores para acompanhar o funil da loja no dia a dia.',
        status: 'available' as const,
      },
    ],
  },
  demo: {
    id: 'demonstracao',
    eyebrow: 'PAINEL DO LOJISTA',
    title: 'A operação da loja, em um só lugar',
    description:
      'Visão do estoque, disponibilidade, oportunidades e vendas — a mesma linguagem do painel real da MyCars.',
    caption: 'Ilustração do painel. Números e nomes são exemplificativos.',
    modules: [
      { label: 'Estoque', hint: 'Disponibilidade e ficha' },
      { label: 'Oportunidades', hint: 'Interesses e contatos' },
      { label: 'Reservas', hint: 'Veículos comprometidos' },
      { label: 'Vendas', hint: 'Histórico e indicadores' },
    ],
  },
  storefront: {
    eyebrow: 'VITRINE INDIVIDUAL',
    title: 'Sua loja na internet — e no marketplace',
    description:
      'Cada loja tem presença digital própria (subdomínio). Os veículos publicados também entram no estoque público da MyCars.',
    exampleHost: 'sua-loja.mycars.local',
    points: [
      'Identidade e catálogo da loja',
      'Contato direto com o comprador',
      'Mesmo veículo no marketplace',
    ],
  },
  roadmap: {
    eyebrow: 'TRANSPARÊNCIA',
    title: 'Disponível agora e em evolução',
    availableTitle: 'Já disponível',
    available: [
      'Estoque e anúncios',
      'Vitrine por subdomínio',
      'Marketplace público',
      'Clientes e oportunidades',
      'Reservas e vendas',
      'Indicadores da visão geral',
    ],
    upcomingTitle: 'Em evolução',
    upcoming: [
      'Notificações por e-mail operacionais',
      'Automações e rotinas agendadas',
      'Ampliação de relatórios comerciais',
    ],
  },
  steps: {
    eyebrow: 'COMO FUNCIONA',
    title: 'Do pedido ao painel, em quatro etapas',
    description:
      'A aprovação cadastral é independente da assinatura. Você configura a vitrine após a análise da plataforma.',
    items: [
      {
        step: '01',
        title: 'Solicitação de cadastro',
        description: 'Informe dados comerciais da loja e do responsável.',
      },
      {
        step: '02',
        title: 'Análise da plataforma',
        description: 'A equipe MyCars valida a solicitação antes da liberação.',
      },
      {
        step: '03',
        title: 'Configuração da vitrine',
        description: 'Defina subdomínio, identidade e dados de contato.',
      },
      {
        step: '04',
        title: 'Estoque e operação',
        description: 'Cadastre veículos, publique e acompanhe o comercial.',
      },
    ],
  },
  faq: {
    eyebrow: 'DÚVIDAS',
    title: 'Perguntas frequentes',
    items: [
      {
        q: 'Quem pode anunciar?',
        a: 'Somente lojas profissionais (lojistas). A MyCars não publica anúncios de particulares.',
      },
      {
        q: 'Como funciona o cadastro?',
        a: 'Você solicita pelo formulário, confirma a conta e aguarda a análise comercial da plataforma.',
      },
      {
        q: 'O que é a vitrine digital?',
        a: 'É a presença online da sua loja em subdomínio próprio, com catálogo e identidade da loja.',
      },
      {
        q: 'Como funciona a publicação integrada?',
        a: 'O veículo é cadastrado uma vez e pode ser publicado no marketplace e na vitrine da loja.',
      },
      {
        q: 'Como funciona a aprovação?',
        a: 'A aprovação cadastral é feita pela plataforma e é independente da assinatura comercial.',
      },
      {
        q: 'Preciso de assinatura?',
        a: 'A operação da loja na plataforma pressupõe assinatura após a liberação cadastral. Valores e planos são apresentados no momento comercial adequado — não nesta página.',
      },
    ],
  },
  closing: {
    eyebrow: 'PRÓXIMO PASSO',
    title: 'Pronto para organizar a operação da sua loja?',
    description: 'Solicite o cadastro e avance para a análise da plataforma.',
    cta: 'Solicitar cadastro',
    href: '/para-lojistas/cadastro',
  },
} as const;
