/**
 * Contratos e definições formais do dashboard lojista.
 *
 * Eixos de data (não misturar):
 * - `enteredAt` (veículo): entrada no estoque.
 * - `publishedAt` (anúncio): publicação pública.
 * - `enteredAt` (oportunidade/lead): criação do lead.
 * - `soldAt` (venda): conclusão comercial da venda.
 * - `closedAt` (oportunidade): encerramento da oportunidade.
 * - `dueAt` / `expiresAt`: vencimento de tarefa/reserva.
 */

export const DASHBOARD_LONG_STOCK_DAYS = 60;
export const DASHBOARD_RESERVATION_EXPIRY_HOURS = 48;

export const DASHBOARD_PERIOD_PRESETS = {
  LAST_7_DAYS: '7d',
  LAST_30_DAYS: '30d',
  LAST_90_DAYS: '90d',
  THIS_MONTH: 'month',
  CUSTOM: 'custom',
} as const;

export type DashboardPeriodPreset =
  (typeof DASHBOARD_PERIOD_PRESETS)[keyof typeof DASHBOARD_PERIOD_PRESETS];

export const DASHBOARD_PERIOD_PRESET_LABELS: Record<DashboardPeriodPreset, string> = {
  '7d': 'Últimos 7 dias',
  '30d': 'Últimos 30 dias',
  '90d': 'Últimos 90 dias',
  month: 'Mês corrente',
  custom: 'Personalizado',
};

/** Metadados estáveis para UI / documentação dos indicadores. */
export const DASHBOARD_INDICATOR_DEFS = {
  availableVehicles: {
    id: 'availableVehicles',
    label: 'Veículos disponíveis',
    dateAxis: 'snapshot',
    description: 'Unidades com status disponível (não rascunho).',
  },
  preparingVehicles: {
    id: 'preparingVehicles',
    label: 'Em preparação',
    dateAxis: 'snapshot',
    description: 'Unidades com status em preparação (não rascunho).',
  },
  reservedVehicles: {
    id: 'reservedVehicles',
    label: 'Reservados',
    dateAxis: 'snapshot',
    description: 'Unidades com status reservado.',
  },
  stockWithoutListing: {
    id: 'stockWithoutListing',
    label: 'Estoque sem publicação',
    dateAxis: 'snapshot',
    description:
      'Disponíveis ou em preparação sem publicação ativa (ausente, rascunho, pausado, suspenso ou encerrado).',
  },
  listingsWithIssues: {
    id: 'listingsWithIssues',
    label: 'Publicações com pendências',
    dateAxis: 'snapshot',
    description: 'Publicações em rascunho, pausadas ou suspensas.',
  },
  customersAwaitingService: {
    id: 'customersAwaitingService',
    label: 'Clientes aguardando atendimento',
    dateAxis: 'snapshot',
    description: 'Oportunidades abertas na etapa novo lead.',
  },
  overdueActivities: {
    id: 'overdueActivities',
    label: 'Atividades vencidas',
    dateAxis: 'dueAt',
    description: 'Retornos pendentes com dueAt anterior a agora.',
  },
  reservationsNearExpiry: {
    id: 'reservationsNearExpiry',
    label: 'Reservas próximas do vencimento',
    dateAxis: 'expiresAt',
    description: `Reservas ativas com expiresAt nas próximas ${DASHBOARD_RESERVATION_EXPIRY_HOURS}h.`,
  },
  longStockVehicles: {
    id: 'longStockVehicles',
    label: 'Muito tempo em estoque',
    dateAxis: 'vehicle.enteredAt',
    description: `Disponíveis/preparação/reservados com entrada há mais de ${DASHBOARD_LONG_STOCK_DAYS} dias.`,
  },
  availabilityOverdue: {
    id: 'availabilityOverdue',
    label: 'Confirmação de estoque vencida',
    dateAxis: 'vehicle.availabilityDueAt',
    description:
      'Disponíveis/preparação com availabilityDueAt vencido — revisão de disponibilidade pendente.',
  },
  salesCount: {
    id: 'salesCount',
    label: 'Vendas no período',
    dateAxis: 'sale.soldAt',
    description: 'Vendas com status concluída e soldAt no período. Canceladas não entram.',
  },
  negotiatedVolumeCents: {
    id: 'negotiatedVolumeCents',
    label: 'Volume negociado',
    dateAxis: 'sale.soldAt',
    description:
      'Soma de negotiatedPriceCents das vendas concluídas no período. Não é pagamento recebido.',
  },
  averageTicketCents: {
    id: 'averageTicketCents',
    label: 'Ticket médio',
    dateAxis: 'sale.soldAt',
    description: 'Volume negociado ÷ quantidade de vendas concluídas no período.',
  },
  leadsReceived: {
    id: 'leadsReceived',
    label: 'Leads recebidos',
    dateAxis: 'opportunity.enteredAt',
    description: 'Oportunidades criadas no período (enteredAt), excluindo dismissed.',
  },
  negotiationsInProgress: {
    id: 'negotiationsInProgress',
    label: 'Negociações em andamento',
    dateAxis: 'snapshot',
    description: 'Oportunidades abertas na etapa em negociação (agora).',
  },
  conversionRate: {
    id: 'conversionRate',
    label: 'Taxa de conversão',
    dateAxis: 'mixed',
    description:
      'Numerador: oportunidades ganhas com closedAt no período. Denominador: leads com enteredAt no período (exclui dismissed).',
  },
  leadOrigins: {
    id: 'leadOrigins',
    label: 'Origem dos leads',
    dateAxis: 'opportunity.enteredAt',
    description: 'Distribuição de leads criados no período por origin.',
  },
  salesBySeller: {
    id: 'salesBySeller',
    label: 'Vendas por vendedor',
    dateAxis: 'sale.soldAt',
    description: 'Vendas concluídas no período agrupadas por sellerUserId.',
  },
  averageDaysInStock: {
    id: 'averageDaysInStock',
    label: 'Tempo médio em estoque',
    dateAxis: 'sale.soldAt − vehicle.enteredAt',
    description:
      'Média de dias entre entrada no estoque e soldAt das vendas concluídas no período.',
  },
  estimatedGrossResultCents: {
    id: 'estimatedGrossResultCents',
    label: 'Resultado bruto estimado',
    dateAxis: 'sale.soldAt',
    description:
      'Soma de grossResultCents das vendas concluídas com base confiável. Custos incompletos/consignados não entram na soma.',
  },
} as const;

export type DashboardOperationalMetrics = {
  availableVehicles: number;
  preparingVehicles: number;
  reservedVehicles: number;
  stockWithoutListing: number;
  listingsWithIssues: number;
  customersAwaitingService: number;
  overdueActivities: number;
  reservationsNearExpiry: number;
  longStockVehicles: number;
  availabilityOverdue: number;
};

export type DashboardConversion = {
  /** Oportunidades ganhas com closedAt no período. */
  numerator: number;
  /** Leads com enteredAt no período (exclui dismissed). */
  denominator: number;
  /** numerator / denominator; null se denominador = 0. */
  rate: number | null;
};

export type DashboardOriginBucket = {
  origin: string;
  count: number;
};

export type DashboardSellerBucket = {
  sellerUserId: string;
  sellerName: string;
  salesCount: number;
  volumeCents: number;
};

export type DashboardSalesSeriesPoint = {
  /** YYYY-MM-DD (UTC). */
  day: string;
  salesCount: number;
  volumeCents: number;
};

export type DashboardCommercialMetrics = {
  salesCount: number;
  negotiatedVolumeCents: number;
  averageTicketCents: number | null;
  leadsReceived: number;
  negotiationsInProgress: number;
  conversion: DashboardConversion;
  leadOrigins: DashboardOriginBucket[];
  salesBySeller: DashboardSellerBucket[];
  averageDaysInStock: number | null;
  estimatedGrossResultCents: number | null;
  /** Vendas concluídas no período sem grossResultCents utilizável. */
  incompleteGrossResultCount: number;
  salesSeries: DashboardSalesSeriesPoint[];
};

export type DashboardCapabilities = {
  canFilterSeller: boolean;
  canViewGrossResult: boolean;
};

export type DashboardSnapshot = {
  storeId: string;
  generatedAt: string;
  period: {
    preset: DashboardPeriodPreset;
    from: string;
    to: string;
  };
  sellerUserId: string | null;
  operational: DashboardOperationalMetrics;
  commercial: DashboardCommercialMetrics;
  capabilities: DashboardCapabilities;
  definitions: typeof DASHBOARD_INDICATOR_DEFS;
};

export function computeAverageTicket(
  volumeCents: number,
  salesCount: number
): number | null {
  if (salesCount <= 0) {
    return null;
  }

  return Math.round(volumeCents / salesCount);
}

export function computeConversionRate(
  numerator: number,
  denominator: number
): number | null {
  if (denominator <= 0) {
    return null;
  }

  return numerator / denominator;
}
