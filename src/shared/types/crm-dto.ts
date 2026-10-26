import type { OpportunityOrigin } from './crm';
import type { OpportunityStatus } from './status';

/** Item de lista/kanban de oportunidade (DTO compartilhado com a UI). */
export type OpportunityListItemDto = {
  id: string;
  storeId: string;
  customerId: string;
  vehicleId: string | null;
  listingId: string | null;
  listingLeadId: string | null;
  origin: string;
  stage: string;
  assigneeUserId: string | null;
  enteredAt: string;
  nextActionAt: string | null;
  nextActionLabel: string | null;
  notes: string | null;
  resultNotes: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  customerName: string;
  customerPhone: string;
  assigneeName: string | null;
  vehicleLabel: string | null;
};

export type OpportunityFunnelCounts = Partial<Record<OpportunityStatus, number>> &
  Record<string, number>;

export type CrmAssigneeOption = {
  userId: string;
  name: string;
  email: string;
};

export type OpportunityActivityDto = {
  id: string;
  storeId: string;
  opportunityId: string;
  type: string;
  body: string;
  actorUserId: string | null;
  metadataJson: string | null;
  createdAt: string;
  updatedAt: string;
  actorName: string | null;
};

export type FollowUpTaskDto = {
  id: string;
  storeId: string;
  opportunityId: string;
  title: string;
  dueAt: string;
  status: string;
  completedAt: string | null;
  createdByUserId: string | null;
  assignedToUserId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type OpportunityFiltersDto = {
  stage?: OpportunityStatus;
  origin?: OpportunityOrigin;
  assigneeUserId?: string;
  q?: string;
  view?: 'list' | 'kanban';
};
