/** Situação de assinatura — independente do cadastro comercial. */

export const SUBSCRIPTION_STATUS = {
  NONE: 'none',
  TRIAL: 'trial',
  ACTIVE: 'active',
  PAST_DUE: 'past_due',
  CANCELED: 'canceled',
} as const;

export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUS)[keyof typeof SUBSCRIPTION_STATUS];

export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  none: 'Sem assinatura',
  trial: 'Período de teste',
  active: 'Assinatura ativa',
  past_due: 'Pagamento pendente',
  canceled: 'Cancelada',
};

/** Cores principais permitidas na vitrine (compatíveis com o DS). */
export const STOREFRONT_PRIMARY_COLORS = [
  { id: 'accent', value: '#C93A0C', label: 'Laranja marca' },
  { id: 'ink', value: '#111111', label: 'Preto' },
  { id: 'info', value: '#1A3A5C', label: 'Azul petróleo' },
  { id: 'success', value: '#1B5E20', label: 'Verde' },
] as const;

export type StorefrontPrimaryColorId = (typeof STOREFRONT_PRIMARY_COLORS)[number]['id'];

/** Modelos de hero permitidos — sem CSS/layout livre. */
export const STOREFRONT_HERO_VARIANTS = [
  {
    id: 'integrated',
    label: 'Identidade na capa',
    description: 'Logo e nome sobre a fotografia de capa.',
  },
  {
    id: 'split',
    label: 'Capa lateral',
    description: 'Texto à esquerda e capa em destaque à direita.',
  },
] as const;

export type StorefrontHeroVariant = (typeof STOREFRONT_HERO_VARIANTS)[number]['id'];

/** Enquadramento da fotografia de capa. */
export const STOREFRONT_COVER_FOCUS = [
  { id: 'center', label: 'Centro' },
  { id: 'top', label: 'Superior' },
  { id: 'bottom', label: 'Inferior' },
] as const;

export type StorefrontCoverFocus = (typeof STOREFRONT_COVER_FOCUS)[number]['id'];
