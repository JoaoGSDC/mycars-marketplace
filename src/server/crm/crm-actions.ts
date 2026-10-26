'use server';

import { revalidatePath } from 'next/cache';

import { requireSession } from '@server/auth/access';
import {
  createCustomer,
  getCustomerDetail,
  searchCustomers,
  updateCustomer,
} from '@server/crm/customers.service';
import {
  addOpportunityActivity,
  assignOpportunity,
  changeOpportunityStage,
  completeFollowUp,
  createOpportunity,
  scheduleFollowUp,
  updateOpportunityNotes,
} from '@server/crm/opportunities.service';
import type {
  AddActivityInput,
  AssignOpportunityInput,
  ChangeOpportunityStageInput,
  CompleteFollowUpInput,
  CreateCustomerInput,
  CreateOpportunityInput,
  ScheduleFollowUpInput,
  SearchCustomersInput,
  UpdateCustomerInput,
  UpdateOpportunityNotesInput,
} from '@server/crm/crm.validators';
import { revalidateDealerDashboard } from '@server/dashboard/dashboard.service';

function fail(message: string, code?: string) {
  return { ok: false as const, message, code };
}

function revalidateCrm(storeId?: string) {
  if (storeId) {
    revalidateDealerDashboard(storeId);
  }
  revalidatePath('/painel');
  revalidatePath('/painel/clientes');
  revalidatePath('/painel/oportunidades');
}

export async function createCustomerAction(input: CreateCustomerInput) {
  const session = await requireSession();

  if (!session.ok) {
    return fail(session.message, session.code);
  }

  const result = await createCustomer(input, session.data.userId);

  if (!result.ok) {
    return fail(result.message, result.code);
  }

  revalidateCrm(input.storeId);

  return { ok: true as const, data: result.data };
}

export async function updateCustomerAction(input: UpdateCustomerInput) {
  const session = await requireSession();

  if (!session.ok) {
    return fail(session.message, session.code);
  }

  const result = await updateCustomer(input, session.data.userId);

  if (!result.ok) {
    return fail(result.message, result.code);
  }

  revalidateCrm(input.storeId);

  return { ok: true as const, data: result.data };
}

export async function searchCustomersAction(input: SearchCustomersInput) {
  const session = await requireSession();

  if (!session.ok) {
    return fail(session.message, session.code);
  }

  const result = await searchCustomers(input, session.data.userId);

  if (!result.ok) {
    return fail(result.message, result.code);
  }

  return { ok: true as const, data: result.data };
}

export async function getCustomerDetailAction(storeId: string, customerId: string) {
  const session = await requireSession();

  if (!session.ok) {
    return fail(session.message, session.code);
  }

  const result = await getCustomerDetail(storeId, customerId, session.data.userId);

  if (!result.ok) {
    return fail(result.message, result.code);
  }

  return { ok: true as const, data: result.data };
}

export async function createOpportunityAction(input: CreateOpportunityInput) {
  const session = await requireSession();

  if (!session.ok) {
    return fail(session.message, session.code);
  }

  const result = await createOpportunity(input, session.data.userId);

  if (!result.ok) {
    return fail(result.message, result.code);
  }

  revalidateCrm(input.storeId);

  return { ok: true as const, data: { id: result.data.id } };
}

export async function changeOpportunityStageAction(input: ChangeOpportunityStageInput) {
  const session = await requireSession();

  if (!session.ok) {
    return fail(session.message, session.code);
  }

  const result = await changeOpportunityStage(input, session.data.userId);

  if (!result.ok) {
    return fail(result.message, result.code);
  }

  revalidateCrm(input.storeId);

  return { ok: true as const, data: result.data };
}

export async function assignOpportunityAction(input: AssignOpportunityInput) {
  const session = await requireSession();

  if (!session.ok) {
    return fail(session.message, session.code);
  }

  const result = await assignOpportunity(input, session.data.userId);

  if (!result.ok) {
    return fail(result.message, result.code);
  }

  revalidateCrm(input.storeId);

  return { ok: true as const, data: result.data };
}

export async function addOpportunityActivityAction(input: AddActivityInput) {
  const session = await requireSession();

  if (!session.ok) {
    return fail(session.message, session.code);
  }

  const result = await addOpportunityActivity(input, session.data.userId);

  if (!result.ok) {
    return fail(result.message, result.code);
  }

  revalidateCrm(input.storeId);

  return { ok: true as const, data: result.data };
}

export async function scheduleFollowUpAction(input: ScheduleFollowUpInput) {
  const session = await requireSession();

  if (!session.ok) {
    return fail(session.message, session.code);
  }

  const result = await scheduleFollowUp(input, session.data.userId);

  if (!result.ok) {
    return fail(result.message, result.code);
  }

  revalidateCrm(input.storeId);

  return { ok: true as const, data: result.data };
}

export async function completeFollowUpAction(input: CompleteFollowUpInput) {
  const session = await requireSession();

  if (!session.ok) {
    return fail(session.message, session.code);
  }

  const result = await completeFollowUp(input, session.data.userId);

  if (!result.ok) {
    return fail(result.message, result.code);
  }

  revalidateCrm(input.storeId);

  return { ok: true as const, data: result.data };
}

export async function updateOpportunityNotesAction(input: UpdateOpportunityNotesInput) {
  const session = await requireSession();

  if (!session.ok) {
    return fail(session.message, session.code);
  }

  const result = await updateOpportunityNotes(input, session.data.userId);

  if (!result.ok) {
    return fail(result.message, result.code);
  }

  revalidateCrm(input.storeId);

  return { ok: true as const, data: result.data };
}
