'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import {
  ACTIVITY_TYPE_LABELS,
  ACTIVITY_TYPES,
  FOLLOW_UP_TASK_STATUS,
  OPPORTUNITY_ORIGIN_LABELS,
  type ActivityType,
  type OpportunityOrigin,
} from '@app-types/crm';
import type {
  CrmAssigneeOption,
  FollowUpTaskDto,
  OpportunityActivityDto,
  OpportunityListItemDto,
} from '@app-types/crm-dto';
import {
  OPPORTUNITY_STATUS,
  OPPORTUNITY_STATUS_LABELS,
  type OpportunityStatus,
} from '@app-types/status';
import { AdminPageHeader } from '@components/dashboard';
import { StatusBadge } from '@components/marketplace';
import { Button, Field, Select, SelectItem } from '@components/ui';
import {
  addOpportunityActivityAction,
  assignOpportunityAction,
  changeOpportunityStageAction,
  completeFollowUpAction,
  scheduleFollowUpAction,
} from '@server/crm/crm-actions';

import { formatDateTime, formatPhoneDisplay, fromDatetimeLocalValue, isOverdue } from './crm.format';
import styles from './crm.module.css';

export type OpportunityDetailViewProps = {
  storeId: string;
  opportunity: OpportunityListItemDto;
  activities: OpportunityActivityDto[];
  tasks: FollowUpTaskDto[];
  assignees: CrmAssigneeOption[];
  canWrite: boolean;
  /** Permite criar reserva quando o veículo da oportunidade está disponível. */
  canReserve?: boolean;
  activeReservationId?: string | null;
  canSell?: boolean;
  completedSaleId?: string | null;
};

const STAGE_OPTIONS = [
  OPPORTUNITY_STATUS.NEW_LEAD,
  OPPORTUNITY_STATUS.IN_SERVICE,
  OPPORTUNITY_STATUS.NEGOTIATING,
  OPPORTUNITY_STATUS.WON,
  OPPORTUNITY_STATUS.LOST,
  OPPORTUNITY_STATUS.DISMISSED,
] as const;

export function OpportunityDetailView({
  storeId,
  opportunity,
  activities,
  tasks,
  assignees,
  canWrite,
  canReserve = false,
  activeReservationId = null,
  canSell = false,
  completedSaleId = null,
}: OpportunityDetailViewProps) {
  const router = useRouter();
  const [stage, setStage] = useState(opportunity.stage);
  const [resultNotes, setResultNotes] = useState('');
  const [assigneeUserId, setAssigneeUserId] = useState(
    opportunity.assigneeUserId ?? 'none'
  );
  const [activityType, setActivityType] = useState<string>(ACTIVITY_TYPES.CONTACT);
  const [activityBody, setActivityBody] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDueAt, setTaskDueAt] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function run(action: () => Promise<{ ok: boolean; message?: string }>) {
    setPending(true);
    setError(null);
    const result = await action();
    setPending(false);

    if (!result.ok) {
      setError(result.message ?? 'Não foi possível concluir');
      return;
    }

    router.refresh();
  }

  async function onChangeStage(event: FormEvent) {
    event.preventDefault();
    await run(() =>
      changeOpportunityStageAction({
        storeId,
        opportunityId: opportunity.id,
        stage: stage as OpportunityStatus,
        resultNotes: resultNotes || undefined,
      })
    );
  }

  async function onAssign(event: FormEvent) {
    event.preventDefault();

    if (assigneeUserId === 'none') {
      setError('Selecione um responsável');
      return;
    }

    await run(() =>
      assignOpportunityAction({
        storeId,
        opportunityId: opportunity.id,
        assigneeUserId,
      })
    );
  }

  async function onAddActivity(event: FormEvent) {
    event.preventDefault();
    await run(() =>
      addOpportunityActivityAction({
        storeId,
        opportunityId: opportunity.id,
        type: activityType as 'contact' | 'contact_attempt' | 'note',
        body: activityBody,
      })
    );
    setActivityBody('');
  }

  async function onSchedule(event: FormEvent) {
    event.preventDefault();

    if (!taskDueAt) {
      setError('Informe a data do retorno');
      return;
    }

    await run(() =>
      scheduleFollowUpAction({
        storeId,
        opportunityId: opportunity.id,
        title: taskTitle,
        dueAt: fromDatetimeLocalValue(taskDueAt),
      })
    );
    setTaskTitle('');
    setTaskDueAt('');
  }

  return (
    <div className={styles.crm}>
      <AdminPageHeader
        title={opportunity.customerName}
        description={
          <>
            {formatPhoneDisplay(opportunity.customerPhone)}
            {opportunity.vehicleLabel ? ` · ${opportunity.vehicleLabel}` : ''}
            <span className="mt-2 flex flex-wrap items-center gap-2">
              <StatusBadge
                kind="opportunity"
                status={opportunity.stage as OpportunityStatus}
              />
              <span className={styles.crm__meta}>
                {OPPORTUNITY_ORIGIN_LABELS[opportunity.origin as OpportunityOrigin] ??
                  opportunity.origin}
                {' · '}
                Entrada {formatDateTime(opportunity.enteredAt)}
              </span>
            </span>
          </>
        }
        secondaryActions={
          <>
            <Button asChild variant="ghost">
              <Link href="/painel/oportunidades">Voltar</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/painel/clientes/${opportunity.customerId}`}>Cliente</Link>
            </Button>
            {activeReservationId ? (
              <Button asChild variant="outline">
                <Link href={`/painel/reservas/${activeReservationId}`}>Ver reserva</Link>
              </Button>
            ) : canReserve && opportunity.vehicleId ? (
              <Button asChild variant="outline">
                <Link
                  href={`/painel/reservas/nova?vehicleId=${opportunity.vehicleId}&customerId=${opportunity.customerId}&opportunityId=${opportunity.id}`}
                >
                  Reservar veículo
                </Link>
              </Button>
            ) : null}
            {completedSaleId ? (
              <Button asChild variant="outline">
                <Link href={`/painel/vendas/${completedSaleId}`}>Ver venda</Link>
              </Button>
            ) : null}
          </>
        }
        primaryAction={
          !completedSaleId && canSell && opportunity.vehicleId ? (
            <Button asChild>
              <Link
                href={`/painel/vendas/nova?vehicleId=${opportunity.vehicleId}&customerId=${opportunity.customerId}&opportunityId=${opportunity.id}`}
              >
                Registrar venda
              </Link>
            </Button>
          ) : undefined
        }
      />

      {error ? <p className={styles.crm__alert}>{error}</p> : null}

      <div className={styles.crm__detail}>
        <div className={styles.crm__stack}>
          <section className={styles.crm__panel}>
            <h2 className={styles.crm__panelTitle}>Histórico</h2>
            {activities.length === 0 ? (
              <p className={styles.crm__meta}>Sem atividades registradas.</p>
            ) : (
              activities.map((activity) => (
                <article key={activity.id} className={styles.crm__activity}>
                  <div className={styles.crm__activityType}>
                    {ACTIVITY_TYPE_LABELS[activity.type as ActivityType] ?? activity.type}
                    {activity.actorName ? ` · ${activity.actorName}` : ''}
                  </div>
                  <p className="mt-1 text-sm text-text">{activity.body}</p>
                  <p className={styles.crm__meta}>{formatDateTime(activity.createdAt)}</p>
                </article>
              ))
            )}
          </section>

          <section className={styles.crm__panel}>
            <h2 className={styles.crm__panelTitle}>Retornos</h2>
            {tasks.length === 0 ? (
              <p className={styles.crm__meta}>Nenhum retorno agendado.</p>
            ) : (
              tasks.map((task) => {
                const overdue =
                  task.status === FOLLOW_UP_TASK_STATUS.PENDING && isOverdue(task.dueAt);

                return (
                  <div
                    key={task.id}
                    className={`${styles.crm__taskRow} ${overdue ? styles.crm__taskOverdue : ''}`}
                  >
                    <div>
                      <div className={styles.crm__kanbanCardTitle}>{task.title}</div>
                      <div className={styles.crm__meta}>
                        {formatDateTime(task.dueAt)} · {task.status}
                        {overdue ? ' · atrasado' : ''}
                      </div>
                    </div>
                    {canWrite && task.status === FOLLOW_UP_TASK_STATUS.PENDING ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={pending}
                        onClick={() =>
                          run(() =>
                            completeFollowUpAction({ storeId, taskId: task.id })
                          )
                        }
                      >
                        Concluir
                      </Button>
                    ) : null}
                  </div>
                );
              })
            )}
          </section>
        </div>

        <aside className={styles.crm__stack}>
          {canWrite ? (
            <>
              <form className={styles.crm__panel} onSubmit={onChangeStage}>
                <h2 className={styles.crm__panelTitle}>Etapa</h2>
                <Select value={stage} onValueChange={setStage} label="Nova etapa">
                  {STAGE_OPTIONS.map((value) => (
                    <SelectItem key={value} value={value}>
                      {OPPORTUNITY_STATUS_LABELS[value]}
                    </SelectItem>
                  ))}
                </Select>
                {(stage === OPPORTUNITY_STATUS.WON ||
                  stage === OPPORTUNITY_STATUS.LOST ||
                  stage === OPPORTUNITY_STATUS.DISMISSED) && (
                  <Field
                    label="Resultado / motivo"
                    name="resultNotes"
                    value={resultNotes}
                    onChange={(e) => setResultNotes(e.target.value)}
                    placeholder={
                      stage === OPPORTUNITY_STATUS.DISMISSED
                        ? 'Ex.: contato inválido ou duplicado'
                        : 'Observação do encerramento'
                    }
                  />
                )}
                <Button type="submit" disabled={pending} size="sm">
                  Atualizar etapa
                </Button>
              </form>

              <form className={styles.crm__panel} onSubmit={onAssign}>
                <h2 className={styles.crm__panelTitle}>Responsável</h2>
                <Select
                  label="Vendedor"
                  value={assigneeUserId}
                  onValueChange={setAssigneeUserId}
                >
                  <SelectItem value="none">Selecionar…</SelectItem>
                  {assignees.map((member) => (
                    <SelectItem key={member.userId} value={member.userId}>
                      {member.name}
                    </SelectItem>
                  ))}
                </Select>
                <Button type="submit" disabled={pending} size="sm">
                  Atribuir
                </Button>
              </form>

              <form className={styles.crm__panel} onSubmit={onAddActivity}>
                <h2 className={styles.crm__panelTitle}>Registrar atendimento</h2>
                <Select
                  label="Tipo"
                  value={activityType}
                  onValueChange={setActivityType}
                >
                  <SelectItem value={ACTIVITY_TYPES.CONTACT}>Contato realizado</SelectItem>
                  <SelectItem value={ACTIVITY_TYPES.CONTACT_ATTEMPT}>
                    Tentativa de contato
                  </SelectItem>
                  <SelectItem value={ACTIVITY_TYPES.NOTE}>Anotação</SelectItem>
                </Select>
                <Field
                  label="Descrição"
                  name="activityBody"
                  required
                  value={activityBody}
                  onChange={(e) => setActivityBody(e.target.value)}
                />
                <Button type="submit" disabled={pending} size="sm">
                  Registrar
                </Button>
              </form>

              <form className={styles.crm__panel} onSubmit={onSchedule}>
                <h2 className={styles.crm__panelTitle}>Agendar retorno</h2>
                <Field
                  label="Título"
                  name="taskTitle"
                  required
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                />
                <Field
                  label="Quando"
                  name="taskDueAt"
                  type="datetime-local"
                  required
                  value={taskDueAt}
                  onChange={(e) => setTaskDueAt(e.target.value)}
                />
                <Button type="submit" disabled={pending} size="sm">
                  Agendar
                </Button>
              </form>
            </>
          ) : (
            <section className={styles.crm__panel}>
              <h2 className={styles.crm__panelTitle}>Resumo</h2>
              <p className={styles.crm__meta}>
                Responsável: {opportunity.assigneeName ?? '—'}
              </p>
              {opportunity.notes ? (
                <p className="text-sm text-text">{opportunity.notes}</p>
              ) : null}
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
