/** Tipos compartilhados do CRM (clientes e oportunidades). */

export const OPPORTUNITY_ORIGINS = {
  MARKETPLACE: 'marketplace',
  STOREFRONT: 'storefront',
  FORM: 'form',
  WHATSAPP_MANUAL: 'whatsapp_manual',
  WALK_IN: 'walk_in',
  OTHER: 'other',
} as const;

export type OpportunityOrigin = (typeof OPPORTUNITY_ORIGINS)[keyof typeof OPPORTUNITY_ORIGINS];

export const OPPORTUNITY_ORIGIN_LABELS: Record<OpportunityOrigin, string> = {
  marketplace: 'Marketplace',
  storefront: 'Vitrine',
  form: 'Formulário',
  whatsapp_manual: 'WhatsApp (manual)',
  walk_in: 'Loja física',
  other: 'Outro',
};

export const ACTIVITY_TYPES = {
  CONTACT: 'contact',
  CONTACT_ATTEMPT: 'contact_attempt',
  NOTE: 'note',
  STAGE_CHANGE: 'stage_change',
  ASSIGNMENT: 'assignment',
  TASK_CREATED: 'task_created',
  TASK_COMPLETED: 'task_completed',
  SYSTEM: 'system',
} as const;

export type ActivityType = (typeof ACTIVITY_TYPES)[keyof typeof ACTIVITY_TYPES];

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  contact: 'Contato realizado',
  contact_attempt: 'Tentativa de contato',
  note: 'Anotação',
  stage_change: 'Mudança de etapa',
  assignment: 'Atribuição',
  task_created: 'Retorno agendado',
  task_completed: 'Retorno concluído',
  system: 'Sistema',
};

export const FOLLOW_UP_TASK_STATUS = {
  PENDING: 'pending',
  DONE: 'done',
  CANCELLED: 'cancelled',
} as const;

export type FollowUpTaskStatus =
  (typeof FOLLOW_UP_TASK_STATUS)[keyof typeof FOLLOW_UP_TASK_STATUS];

export const FOLLOW_UP_TASK_STATUS_LABELS: Record<FollowUpTaskStatus, string> = {
  pending: 'Pendente',
  done: 'Concluída',
  cancelled: 'Cancelada',
};

export const CUSTOMER_DATA_PURPOSES = {
  COMMERCIAL_CONTACT: 'commercial_contact',
  SERVICE: 'service',
  OTHER: 'other',
} as const;

export type CustomerDataPurpose =
  (typeof CUSTOMER_DATA_PURPOSES)[keyof typeof CUSTOMER_DATA_PURPOSES];

export const CUSTOMER_DATA_PURPOSE_LABELS: Record<CustomerDataPurpose, string> = {
  commercial_contact: 'Contato comercial',
  service: 'Atendimento',
  other: 'Outro',
};

export const ENGAGEMENT_EVENT_TYPES = {
  WHATSAPP_CLICK: 'whatsapp_click',
} as const;

export type EngagementEventType =
  (typeof ENGAGEMENT_EVENT_TYPES)[keyof typeof ENGAGEMENT_EVENT_TYPES];
