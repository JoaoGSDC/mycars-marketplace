'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { DEFAULT_RESERVATION_HOURS } from '@app-types/reservation';
import type { CrmAssigneeOption } from '@app-types/crm-dto';
import {
  AdminFormActions,
  AdminFormActionsSpacer,
  AdminFormLayout,
  AdminPageHeader,
} from '@components/dashboard';
import { Button, Field, Select, SelectItem, useToast } from '@components/ui';
import { createReservationAction } from '@server/reservations/reservation-actions';

import styles from './reservations.module.css';

export type ReservationCustomerOption = {
  id: string;
  name: string;
  phone: string;
};

export type ReservationVehicleOption = {
  id: string;
  label: string;
};

export type CreateReservationViewProps = {
  storeId: string;
  customers: ReservationCustomerOption[];
  vehicles: ReservationVehicleOption[];
  assignees: CrmAssigneeOption[];
  initialVehicleId?: string;
  initialCustomerId?: string;
  initialOpportunityId?: string;
};

function toDatetimeLocalValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function CreateReservationView({
  storeId,
  customers,
  vehicles,
  assignees,
  initialVehicleId,
  initialCustomerId,
  initialOpportunityId,
}: CreateReservationViewProps) {
  const router = useRouter();
  const { toast } = useToast();
  const defaultExpiry = new Date(Date.now() + DEFAULT_RESERVATION_HOURS * 60 * 60 * 1000);

  const [vehicleId, setVehicleId] = useState(initialVehicleId ?? vehicles[0]?.id ?? '');
  const [customerId, setCustomerId] = useState(initialCustomerId ?? customers[0]?.id ?? '');
  const [assigneeUserId, setAssigneeUserId] = useState('self');
  const [expiresAt, setExpiresAt] = useState(toDatetimeLocalValue(defaultExpiry));
  const [notes, setNotes] = useState('');
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);

    const result = await createReservationAction({
      storeId,
      vehicleId,
      customerId,
      opportunityId: initialOpportunityId,
      assigneeUserId: assigneeUserId === 'self' ? undefined : assigneeUserId,
      expiresAt: new Date(expiresAt).toISOString(),
      notes: notes || undefined,
      durationHours: DEFAULT_RESERVATION_HOURS,
    });

    setPending(false);

    if (!result.ok) {
      toast({
        title: 'Não foi possível reservar',
        description: result.message,
        variant: 'error',
      });
      return;
    }

    toast({
      title: 'Reserva criada',
      description: 'O veículo ficou indisponível para novas reservas.',
      variant: 'success',
    });
    router.push(`/painel/reservas/${result.data.id}`);
    router.refresh();
  }

  if (vehicles.length === 0) {
    return (
      <div className={styles.reservations}>
        <p className={styles.reservations__alert}>
          Não há veículos disponíveis para reservar. Libere ou cadastre uma unidade no estoque.
        </p>
        <Button asChild variant="outline">
          <Link href="/painel/estoque">Ir ao estoque</Link>
        </Button>
      </div>
    );
  }

  if (customers.length === 0) {
    return (
      <div className={styles.reservations}>
        <p className={styles.reservations__alert}>
          Cadastre um cliente antes de criar a reserva.
        </p>
        <Button asChild variant="outline">
          <Link href="/painel/clientes/novo">Novo cliente</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className={styles.reservations}>
      <AdminPageHeader
        title="Nova reserva"
        description={`Bloqueio temporário da unidade · prazo padrão ${DEFAULT_RESERVATION_HOURS}h`}
      />

      <AdminFormLayout width="sm">
        <form className={styles.reservations__formFields} onSubmit={onSubmit}>
          <Select label="Veículo" value={vehicleId} onValueChange={setVehicleId}>
            {vehicles.map((vehicle) => (
              <SelectItem key={vehicle.id} value={vehicle.id}>
                {vehicle.label}
              </SelectItem>
            ))}
          </Select>

          <Select label="Cliente" value={customerId} onValueChange={setCustomerId}>
            {customers.map((customer) => (
              <SelectItem key={customer.id} value={customer.id}>
                {customer.name} · {customer.phone}
              </SelectItem>
            ))}
          </Select>

          <Select label="Responsável" value={assigneeUserId} onValueChange={setAssigneeUserId}>
            <SelectItem value="self">Eu (criador)</SelectItem>
            {assignees.map((member) => (
              <SelectItem key={member.userId} value={member.userId}>
                {member.name}
              </SelectItem>
            ))}
          </Select>

          <Field
            label="Validade"
            name="expiresAt"
            type="datetime-local"
            required
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
          />

          <Field
            label="Observações"
            name="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          {initialOpportunityId ? (
            <p className={styles.reservations__meta}>
              Vinculada à oportunidade {initialOpportunityId.slice(0, 8)}…
            </p>
          ) : null}

          <AdminFormActions>
            <Button asChild variant="outline">
              <Link href="/painel/reservas">Cancelar</Link>
            </Button>
            <AdminFormActionsSpacer />
            <Button type="submit" disabled={pending || !vehicleId || !customerId}>
              {pending ? 'Reservando…' : 'Confirmar reserva'}
            </Button>
          </AdminFormActions>
        </form>
      </AdminFormLayout>
    </div>
  );
}
