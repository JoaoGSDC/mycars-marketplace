import {
  ACTIVITY_TYPES,
  FOLLOW_UP_TASK_STATUS,
  OPPORTUNITY_ORIGIN_LABELS,
  OPPORTUNITY_ORIGINS,
  type OpportunityOrigin,
} from '@app-types/crm';
import { PERMISSIONS } from '@app-types/permissions';
import {
  OPPORTUNITY_STATUS,
  OPPORTUNITY_STATUS_LABELS,
  type OpportunityStatus,
} from '@app-types/status';
import type { FollowUpTaskRow, OpportunityRow } from '@lib/db';
import { nowIso } from '@lib/db';
import { authorizeStoreAction } from '@server/auth/access';
import * as auditRepo from '@server/repositories/audit-events.repository';
import * as activitiesRepo from '@server/repositories/opportunity-activities.repository';
import * as assignmentsRepo from '@server/repositories/opportunity-assignments.repository';
import * as customersRepo from '@server/repositories/customers.repository';
import * as followUpRepo from '@server/repositories/follow-up-tasks.repository';
import * as membershipsRepo from '@server/repositories/store-memberships.repository';
import * as opportunitiesRepo from '@server/repositories/opportunities.repository';
import * as usersRepo from '@server/repositories/users.repository';
import * as vehiclesRepo from '@server/repositories/vehicles.repository';
import { serviceError, serviceSuccess, type ServiceResult } from '@server/shared/service-result';

import { createCustomer, findOrCreateCustomerFromPublicLead } from './customers.service';
import {
  addActivitySchema,
  assignOpportunitySchema,
  changeOpportunityStageSchema,
  completeFollowUpSchema,
  createOpportunitySchema,
  scheduleFollowUpSchema,
  searchOpportunitiesSchema,
  updateOpportunityNotesSchema,
  type AddActivityInput,
  type AssignOpportunityInput,
  type ChangeOpportunityStageInput,
  type CompleteFollowUpInput,
  type CreateOpportunityInput,
  type ScheduleFollowUpInput,
  type SearchOpportunitiesInput,
  type UpdateOpportunityNotesInput,
} from './crm.validators';

const CLOSED_STAGES: OpportunityStatus[] = [
  OPPORTUNITY_STATUS.WON,
  OPPORTUNITY_STATUS.LOST,
  OPPORTUNITY_STATUS.DISMISSED,
];

function isClosedStage(stage: string): boolean {
  return CLOSED_STAGES.includes(stage as OpportunityStatus);
}

export function resolveOriginFromPath(originPath: string): OpportunityOrigin {
  if (originPath.startsWith('/vitrine') || originPath.includes('/lojas/')) {
    return OPPORTUNITY_ORIGINS.STOREFRONT;
  }

  return OPPORTUNITY_ORIGINS.MARKETPLACE;
}

async function assertAssigneeInStore(
  storeId: string,
  assigneeUserId: string
): Promise<ServiceResult<true>> {
  const membership = await membershipsRepo.findMembership(storeId, assigneeUserId);

  if (!membership || membership.status !== 'active') {
    return serviceError('VALIDATION', 'Responsável precisa ser membro ativo da loja');
  }

  return serviceSuccess(true);
}

async function applyAssignment(params: {
  storeId: string;
  opportunityId: string;
  assigneeUserId: string;
  assignedByUserId: string | null;
}): Promise<void> {
  const stamp = nowIso();
  await assignmentsRepo.endOpenAssignments(params.opportunityId, stamp);
  await assignmentsRepo.insertAssignment({
    storeId: params.storeId,
    opportunityId: params.opportunityId,
    assigneeUserId: params.assigneeUserId,
    assignedByUserId: params.assignedByUserId,
    assignedAt: stamp,
    endedAt: null,
  });
  await opportunitiesRepo.updateOpportunity(params.opportunityId, {
    assigneeUserId: params.assigneeUserId,
  });

  const assignee = await usersRepo.findUserById(params.assigneeUserId);
  await activitiesRepo.insertActivity({
    storeId: params.storeId,
    opportunityId: params.opportunityId,
    type: ACTIVITY_TYPES.ASSIGNMENT,
    body: `Responsável: ${assignee?.name ?? params.assigneeUserId}`,
    actorUserId: params.assignedByUserId,
    metadataJson: JSON.stringify({ assigneeUserId: params.assigneeUserId }),
  });
}

export async function createOpportunity(
  raw: CreateOpportunityInput,
  actorUserId: string
): Promise<ServiceResult<OpportunityRow>> {
  const parsed = createOpportunitySchema.safeParse(raw);

  if (!parsed.success) {
    return serviceError('VALIDATION', parsed.error.issues[0]?.message ?? 'Dados inválidos');
  }

  const data = parsed.data;
  const access = await authorizeStoreAction(
    actorUserId,
    data.storeId,
    PERMISSIONS.OPPORTUNITIES_WRITE
  );

  if (!access.ok) {
    return access;
  }

  let customerId = data.customerId;

  if (!customerId && data.customer) {
    const created = await createCustomer(
      {
        storeId: data.storeId,
        name: data.customer.name,
        phone: data.customer.phone,
        email: data.customer.email,
        source: data.origin,
        dataPurpose: 'commercial_contact',
        allowDuplicate: data.customer.allowDuplicate,
      },
      actorUserId
    );

    if (!created.ok) {
      return created;
    }

    customerId = created.data.customer.id;
  }

  if (!customerId) {
    return serviceError('VALIDATION', 'Informe o cliente ou dados para cadastro rápido');
  }

  const customer = await customersRepo.findCustomerInStore(data.storeId, customerId);

  if (!customer) {
    return serviceError('NOT_FOUND', 'Cliente não encontrado nesta loja');
  }

  if (data.vehicleId) {
    const vehicle = await vehiclesRepo.findVehicleInStore(data.storeId, data.vehicleId);

    if (!vehicle) {
      return serviceError('NOT_FOUND', 'Veículo não encontrado nesta loja');
    }
  }

  if (data.assigneeUserId) {
    const ok = await assertAssigneeInStore(data.storeId, data.assigneeUserId);

    if (!ok.ok) {
      return ok;
    }
  }

  const enteredAt = nowIso();
  const opportunity = await opportunitiesRepo.insertOpportunity({
    storeId: data.storeId,
    customerId,
    vehicleId: data.vehicleId ?? null,
    listingId: data.listingId ?? null,
    listingLeadId: null,
    origin: data.origin,
    stage: OPPORTUNITY_STATUS.NEW_LEAD,
    assigneeUserId: null,
    enteredAt,
    nextActionAt: data.nextActionAt ?? null,
    nextActionLabel: data.nextActionLabel ?? null,
    notes: data.notes ?? null,
    resultNotes: null,
    closedAt: null,
  });

  await activitiesRepo.insertActivity({
    storeId: data.storeId,
    opportunityId: opportunity.id,
    type: ACTIVITY_TYPES.SYSTEM,
    body: `Oportunidade criada · origem ${OPPORTUNITY_ORIGIN_LABELS[data.origin]}`,
    actorUserId,
    metadataJson: JSON.stringify({ origin: data.origin }),
  });

  if (data.assigneeUserId) {
    await applyAssignment({
      storeId: data.storeId,
      opportunityId: opportunity.id,
      assigneeUserId: data.assigneeUserId,
      assignedByUserId: actorUserId,
    });
  }

  if (data.nextActionAt && data.nextActionLabel) {
    await followUpRepo.insertFollowUpTask({
      storeId: data.storeId,
      opportunityId: opportunity.id,
      title: data.nextActionLabel,
      dueAt: data.nextActionAt,
      status: FOLLOW_UP_TASK_STATUS.PENDING,
      completedAt: null,
      createdByUserId: actorUserId,
      assignedToUserId: data.assigneeUserId ?? actorUserId,
    });
  }

  await auditRepo.insertAuditEvent({
    storeId: data.storeId,
    actorUserId,
    action: 'opportunity.created',
    entityType: 'opportunity',
    entityId: opportunity.id,
    payloadJson: JSON.stringify({ origin: data.origin, customerId }),
  });

  const fresh = await opportunitiesRepo.findOpportunityById(opportunity.id);

  return serviceSuccess(fresh!);
}

/** Lead público confirmado (formulário) → cliente + oportunidade. */
export async function createOpportunityFromPublicLead(input: {
  storeId: string;
  listingLeadId: string;
  listingId: string;
  vehicleId: string;
  name: string;
  phone: string;
  email?: string | null;
  message: string;
  originPath: string;
}): Promise<OpportunityRow> {
  const origin = resolveOriginFromPath(input.originPath);
  const customer = await findOrCreateCustomerFromPublicLead({
    storeId: input.storeId,
    name: input.name,
    phone: input.phone,
    email: input.email,
    source: origin,
  });

  const enteredAt = nowIso();
  const opportunity = await opportunitiesRepo.insertOpportunity({
    storeId: input.storeId,
    customerId: customer.id,
    vehicleId: input.vehicleId,
    listingId: input.listingId,
    listingLeadId: input.listingLeadId,
    origin,
    stage: OPPORTUNITY_STATUS.NEW_LEAD,
    assigneeUserId: null,
    enteredAt,
    nextActionAt: null,
    nextActionLabel: null,
    notes: null,
    resultNotes: null,
    closedAt: null,
  });

  await activitiesRepo.insertActivity({
    storeId: input.storeId,
    opportunityId: opportunity.id,
    type: ACTIVITY_TYPES.SYSTEM,
    body: `Interesse via formulário (${OPPORTUNITY_ORIGIN_LABELS[origin]})`,
    actorUserId: null,
    metadataJson: JSON.stringify({ listingLeadId: input.listingLeadId, origin }),
  });

  if (input.message.trim()) {
    await activitiesRepo.insertActivity({
      storeId: input.storeId,
      opportunityId: opportunity.id,
      type: ACTIVITY_TYPES.NOTE,
      body: input.message.trim(),
      actorUserId: null,
      metadataJson: JSON.stringify({ from: 'public_form' }),
    });
  }

  return opportunity;
}

export async function searchOpportunities(
  raw: SearchOpportunitiesInput,
  actorUserId: string
): Promise<
  ServiceResult<{
    items: Awaited<ReturnType<typeof opportunitiesRepo.searchOpportunitiesInStore>>['items'];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    funnel: Record<string, number>;
  }>
> {
  const parsed = searchOpportunitiesSchema.safeParse(raw);

  if (!parsed.success) {
    return serviceError('VALIDATION', parsed.error.issues[0]?.message ?? 'Dados inválidos');
  }

  const data = parsed.data;
  const access = await authorizeStoreAction(
    actorUserId,
    data.storeId,
    PERMISSIONS.OPPORTUNITIES_READ
  );

  if (!access.ok) {
    return access;
  }

  const [result, funnel] = await Promise.all([
    opportunitiesRepo.searchOpportunitiesInStore(data),
    opportunitiesRepo.countOpportunitiesByStage(data.storeId),
  ]);

  const totalPages = Math.max(1, Math.ceil(result.total / data.pageSize));

  return serviceSuccess({
    items: result.items,
    total: result.total,
    page: data.page,
    pageSize: data.pageSize,
    totalPages,
    funnel,
  });
}

export async function listKanbanBoard(
  storeId: string,
  actorUserId: string,
  filters: { origin?: OpportunityOrigin; assigneeUserId?: string } = {}
): Promise<
  ServiceResult<{
    columns: Record<OpportunityStatus, Awaited<ReturnType<typeof opportunitiesRepo.listKanbanOpportunities>>>;
    funnel: Record<string, number>;
  }>
> {
  const access = await authorizeStoreAction(
    actorUserId,
    storeId,
    PERMISSIONS.OPPORTUNITIES_READ
  );

  if (!access.ok) {
    return access;
  }

  const [items, funnel] = await Promise.all([
    opportunitiesRepo.listKanbanOpportunities(storeId, filters),
    opportunitiesRepo.countOpportunitiesByStage(storeId),
  ]);

  const columns = {
    [OPPORTUNITY_STATUS.NEW_LEAD]: [] as typeof items,
    [OPPORTUNITY_STATUS.IN_SERVICE]: [] as typeof items,
    [OPPORTUNITY_STATUS.NEGOTIATING]: [] as typeof items,
    [OPPORTUNITY_STATUS.WON]: [] as typeof items,
    [OPPORTUNITY_STATUS.LOST]: [] as typeof items,
    [OPPORTUNITY_STATUS.DISMISSED]: [] as typeof items,
  };

  for (const item of items) {
    const stage = item.stage as OpportunityStatus;

    if (columns[stage]) {
      columns[stage].push(item);
    }
  }

  return serviceSuccess({ columns, funnel });
}

export async function getOpportunityDetail(
  storeId: string,
  opportunityId: string,
  actorUserId: string
): Promise<
  ServiceResult<{
    opportunity: NonNullable<
      Awaited<ReturnType<typeof opportunitiesRepo.findOpportunityListItem>>
    >;
    activities: Awaited<ReturnType<typeof activitiesRepo.listActivitiesForOpportunity>>;
    tasks: FollowUpTaskRow[];
    assignments: Awaited<ReturnType<typeof assignmentsRepo.listAssignmentsForOpportunity>>;
  }>
> {
  const access = await authorizeStoreAction(
    actorUserId,
    storeId,
    PERMISSIONS.OPPORTUNITIES_READ
  );

  if (!access.ok) {
    return access;
  }

  const opportunity = await opportunitiesRepo.findOpportunityListItem(storeId, opportunityId);

  if (!opportunity) {
    return serviceError('NOT_FOUND', 'Oportunidade não encontrada');
  }

  const [activities, tasks, assignments] = await Promise.all([
    activitiesRepo.listActivitiesForOpportunity(storeId, opportunityId),
    followUpRepo.listTasksForOpportunity(storeId, opportunityId),
    assignmentsRepo.listAssignmentsForOpportunity(storeId, opportunityId),
  ]);

  return serviceSuccess({ opportunity, activities, tasks, assignments });
}

export async function changeOpportunityStage(
  raw: ChangeOpportunityStageInput,
  actorUserId: string
): Promise<ServiceResult<OpportunityRow>> {
  const parsed = changeOpportunityStageSchema.safeParse(raw);

  if (!parsed.success) {
    return serviceError('VALIDATION', parsed.error.issues[0]?.message ?? 'Dados inválidos');
  }

  const data = parsed.data;
  const access = await authorizeStoreAction(
    actorUserId,
    data.storeId,
    PERMISSIONS.OPPORTUNITIES_WRITE
  );

  if (!access.ok) {
    return access;
  }

  const current = await opportunitiesRepo.findOpportunityInStore(
    data.storeId,
    data.opportunityId
  );

  if (!current) {
    return serviceError('NOT_FOUND', 'Oportunidade não encontrada');
  }

  if (current.stage === data.stage) {
    return serviceSuccess(current);
  }

  const closing = isClosedStage(data.stage);
  const updated = await opportunitiesRepo.updateOpportunity(current.id, {
    stage: data.stage,
    resultNotes: data.resultNotes ?? current.resultNotes,
    closedAt: closing ? nowIso() : null,
  });

  await activitiesRepo.insertActivity({
    storeId: data.storeId,
    opportunityId: current.id,
    type: ACTIVITY_TYPES.STAGE_CHANGE,
    body: `${OPPORTUNITY_STATUS_LABELS[current.stage as OpportunityStatus] ?? current.stage} → ${OPPORTUNITY_STATUS_LABELS[data.stage]}`,
    actorUserId,
    metadataJson: JSON.stringify({
      from: current.stage,
      to: data.stage,
      resultNotes: data.resultNotes ?? null,
    }),
  });

  await auditRepo.insertAuditEvent({
    storeId: data.storeId,
    actorUserId,
    action: 'opportunity.stage_changed',
    entityType: 'opportunity',
    entityId: current.id,
    payloadJson: JSON.stringify({ from: current.stage, to: data.stage }),
  });

  return serviceSuccess(updated);
}

export async function assignOpportunity(
  raw: AssignOpportunityInput,
  actorUserId: string
): Promise<ServiceResult<OpportunityRow>> {
  const parsed = assignOpportunitySchema.safeParse(raw);

  if (!parsed.success) {
    return serviceError('VALIDATION', parsed.error.issues[0]?.message ?? 'Dados inválidos');
  }

  const data = parsed.data;
  const access = await authorizeStoreAction(
    actorUserId,
    data.storeId,
    PERMISSIONS.OPPORTUNITIES_WRITE
  );

  if (!access.ok) {
    return access;
  }

  const current = await opportunitiesRepo.findOpportunityInStore(
    data.storeId,
    data.opportunityId
  );

  if (!current) {
    return serviceError('NOT_FOUND', 'Oportunidade não encontrada');
  }

  const ok = await assertAssigneeInStore(data.storeId, data.assigneeUserId);

  if (!ok.ok) {
    return ok;
  }

  await applyAssignment({
    storeId: data.storeId,
    opportunityId: current.id,
    assigneeUserId: data.assigneeUserId,
    assignedByUserId: actorUserId,
  });

  const updated = await opportunitiesRepo.findOpportunityById(current.id);

  return serviceSuccess(updated!);
}

export async function addOpportunityActivity(
  raw: AddActivityInput,
  actorUserId: string
): Promise<ServiceResult<{ id: string }>> {
  const parsed = addActivitySchema.safeParse(raw);

  if (!parsed.success) {
    return serviceError('VALIDATION', parsed.error.issues[0]?.message ?? 'Dados inválidos');
  }

  const data = parsed.data;
  const access = await authorizeStoreAction(
    actorUserId,
    data.storeId,
    PERMISSIONS.OPPORTUNITIES_WRITE
  );

  if (!access.ok) {
    return access;
  }

  const current = await opportunitiesRepo.findOpportunityInStore(
    data.storeId,
    data.opportunityId
  );

  if (!current) {
    return serviceError('NOT_FOUND', 'Oportunidade não encontrada');
  }

  const activity = await activitiesRepo.insertActivity({
    storeId: data.storeId,
    opportunityId: current.id,
    type: data.type,
    body: data.body,
    actorUserId,
    metadataJson: null,
  });

  return serviceSuccess({ id: activity.id });
}

export async function scheduleFollowUp(
  raw: ScheduleFollowUpInput,
  actorUserId: string
): Promise<ServiceResult<FollowUpTaskRow>> {
  const parsed = scheduleFollowUpSchema.safeParse(raw);

  if (!parsed.success) {
    return serviceError('VALIDATION', parsed.error.issues[0]?.message ?? 'Dados inválidos');
  }

  const data = parsed.data;
  const access = await authorizeStoreAction(
    actorUserId,
    data.storeId,
    PERMISSIONS.OPPORTUNITIES_WRITE
  );

  if (!access.ok) {
    return access;
  }

  const current = await opportunitiesRepo.findOpportunityInStore(
    data.storeId,
    data.opportunityId
  );

  if (!current) {
    return serviceError('NOT_FOUND', 'Oportunidade não encontrada');
  }

  if (data.assignedToUserId) {
    const ok = await assertAssigneeInStore(data.storeId, data.assignedToUserId);

    if (!ok.ok) {
      return ok;
    }
  }

  const task = await followUpRepo.insertFollowUpTask({
    storeId: data.storeId,
    opportunityId: current.id,
    title: data.title,
    dueAt: data.dueAt,
    status: FOLLOW_UP_TASK_STATUS.PENDING,
    completedAt: null,
    createdByUserId: actorUserId,
    assignedToUserId: data.assignedToUserId ?? current.assigneeUserId ?? actorUserId,
  });

  await opportunitiesRepo.updateOpportunity(current.id, {
    nextActionAt: data.dueAt,
    nextActionLabel: data.title,
  });

  await activitiesRepo.insertActivity({
    storeId: data.storeId,
    opportunityId: current.id,
    type: ACTIVITY_TYPES.TASK_CREATED,
    body: `Retorno: ${data.title}`,
    actorUserId,
    metadataJson: JSON.stringify({ taskId: task.id, dueAt: data.dueAt }),
  });

  return serviceSuccess(task);
}

export async function completeFollowUp(
  raw: CompleteFollowUpInput,
  actorUserId: string
): Promise<ServiceResult<FollowUpTaskRow>> {
  const parsed = completeFollowUpSchema.safeParse(raw);

  if (!parsed.success) {
    return serviceError('VALIDATION', parsed.error.issues[0]?.message ?? 'Dados inválidos');
  }

  const data = parsed.data;
  const access = await authorizeStoreAction(
    actorUserId,
    data.storeId,
    PERMISSIONS.OPPORTUNITIES_WRITE
  );

  if (!access.ok) {
    return access;
  }

  const task = await followUpRepo.findFollowUpTaskInStore(data.storeId, data.taskId);

  if (!task) {
    return serviceError('NOT_FOUND', 'Tarefa não encontrada');
  }

  if (task.status !== FOLLOW_UP_TASK_STATUS.PENDING) {
    return serviceSuccess(task);
  }

  const updated = await followUpRepo.updateFollowUpTask(task.id, {
    status: FOLLOW_UP_TASK_STATUS.DONE,
    completedAt: nowIso(),
  });

  await activitiesRepo.insertActivity({
    storeId: data.storeId,
    opportunityId: task.opportunityId,
    type: ACTIVITY_TYPES.TASK_COMPLETED,
    body: `Concluído: ${task.title}`,
    actorUserId,
    metadataJson: JSON.stringify({ taskId: task.id }),
  });

  const pending = await followUpRepo.listTasksForOpportunity(data.storeId, task.opportunityId);
  const next = pending.find((t) => t.status === FOLLOW_UP_TASK_STATUS.PENDING);

  await opportunitiesRepo.updateOpportunity(task.opportunityId, {
    nextActionAt: next?.dueAt ?? null,
    nextActionLabel: next?.title ?? null,
  });

  return serviceSuccess(updated);
}

export async function updateOpportunityNotes(
  raw: UpdateOpportunityNotesInput,
  actorUserId: string
): Promise<ServiceResult<OpportunityRow>> {
  const parsed = updateOpportunityNotesSchema.safeParse(raw);

  if (!parsed.success) {
    return serviceError('VALIDATION', parsed.error.issues[0]?.message ?? 'Dados inválidos');
  }

  const data = parsed.data;
  const access = await authorizeStoreAction(
    actorUserId,
    data.storeId,
    PERMISSIONS.OPPORTUNITIES_WRITE
  );

  if (!access.ok) {
    return access;
  }

  const current = await opportunitiesRepo.findOpportunityInStore(
    data.storeId,
    data.opportunityId
  );

  if (!current) {
    return serviceError('NOT_FOUND', 'Oportunidade não encontrada');
  }

  const updated = await opportunitiesRepo.updateOpportunity(current.id, {
    notes: data.notes,
  });

  return serviceSuccess(updated);
}

export async function listStoreAssignees(
  storeId: string,
  actorUserId: string
): Promise<ServiceResult<Array<{ userId: string; name: string; email: string }>>> {
  const access = await authorizeStoreAction(
    actorUserId,
    storeId,
    PERMISSIONS.OPPORTUNITIES_READ
  );

  if (!access.ok) {
    return access;
  }

  const memberships = await membershipsRepo.listMembershipsByStore(storeId);
  const active = memberships.filter((m) => m.status === 'active');
  const users = await Promise.all(active.map((m) => usersRepo.findUserById(m.userId)));

  return serviceSuccess(
    users
      .filter((u): u is NonNullable<typeof u> => Boolean(u))
      .map((u) => ({ userId: u.id, name: u.name, email: u.email }))
  );
}

export async function listPendingFollowUps(
  storeId: string,
  actorUserId: string
): Promise<ServiceResult<{ pending: FollowUpTaskRow[]; overdue: FollowUpTaskRow[] }>> {
  const access = await authorizeStoreAction(
    actorUserId,
    storeId,
    PERMISSIONS.OPPORTUNITIES_READ
  );

  if (!access.ok) {
    return access;
  }

  const [pending, overdue] = await Promise.all([
    followUpRepo.listPendingTasksForStore(storeId),
    followUpRepo.listOverduePendingTasks(storeId, nowIso()),
  ]);

  return serviceSuccess({ pending, overdue });
}
