'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import type { CrmAssigneeOption } from '@app-types/crm-dto';
import {
  SALE_MODALITIES,
  SALE_MODALITY_LABELS,
  type SaleModality,
} from '@app-types/sale';
import { AdminPageHeader, ConfirmDialog } from '@components/dashboard';
import { Button, Field, Select, SelectItem, useToast } from '@components/ui';
import { createSaleAction } from '@server/sales/sale-actions';

import { formatCents, reaisInputToCents } from './sales.format';
import styles from './sales.module.css';

export type SaleCustomerOption = { id: string; name: string; phone: string };
export type SaleVehicleOption = {
  id: string;
  label: string;
  ownership: string;
  listedPriceCents: number | null;
  costsCents: number | null;
  costsIncomplete: boolean;
};

export type CreateSaleViewProps = {
  storeId: string;
  customers: SaleCustomerOption[];
  vehicles: SaleVehicleOption[];
  sellers: CrmAssigneeOption[];
  initialVehicleId?: string;
  initialCustomerId?: string;
  initialOpportunityId?: string;
  defaultSellerUserId?: string;
  canViewCosts?: boolean;
};

export function CreateSaleView({
  storeId,
  customers,
  vehicles,
  sellers,
  initialVehicleId,
  initialCustomerId,
  initialOpportunityId,
  defaultSellerUserId,
  canViewCosts = false,
}: CreateSaleViewProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [vehicleId, setVehicleId] = useState(initialVehicleId ?? vehicles[0]?.id ?? '');
  const [customerId, setCustomerId] = useState(initialCustomerId ?? customers[0]?.id ?? '');
  const [sellerUserId, setSellerUserId] = useState(
    defaultSellerUserId ?? sellers[0]?.userId ?? 'self'
  );
  const [priceInput, setPriceInput] = useState('');
  const [modality, setModality] = useState<SaleModality>(SALE_MODALITIES.CASH);
  const [hasTradeIn, setHasTradeIn] = useState(false);
  const [tradeInDescription, setTradeInDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [pending, setPending] = useState(false);

  const selectedVehicle = vehicles.find((v) => v.id === vehicleId);

  async function submitSale() {
    const negotiatedPriceCents = reaisInputToCents(priceInput);

    if (!negotiatedPriceCents) {
      toast({
        title: 'Valor inválido',
        description: 'Informe o valor negociado em reais.',
        variant: 'error',
      });
      return;
    }

    setPending(true);

    const result = await createSaleAction({
      storeId,
      vehicleId,
      customerId,
      sellerUserId: sellerUserId === 'self' ? undefined : sellerUserId,
      opportunityId: initialOpportunityId,
      negotiatedPriceCents,
      modality,
      hasTradeIn,
      tradeInDescription: hasTradeIn ? tradeInDescription : undefined,
      notes: notes || undefined,
    });

    setPending(false);

    if (!result.ok) {
      toast({
        title: 'Não foi possível registrar a venda',
        description: result.message,
        variant: 'error',
      });
      return;
    }

    toast({
      title: 'Venda registrada',
      description: 'Estoque, anúncio e vínculos comerciais foram atualizados.',
      variant: 'success',
    });
    router.push(`/painel/vendas/${result.data.id}`);
    router.refresh();
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
  }

  if (vehicles.length === 0) {
    return (
      <div className={styles.sales}>
        <p className={styles.sales__alert}>
          Não há veículos disponíveis ou reservados para venda.
        </p>
        <Button asChild variant="outline">
          <Link href="/painel/estoque">Ir ao estoque</Link>
        </Button>
      </div>
    );
  }

  if (customers.length === 0) {
    return (
      <div className={styles.sales}>
        <p className={styles.sales__alert}>Cadastre um cliente antes de registrar a venda.</p>
        <Button asChild variant="outline">
          <Link href="/painel/clientes/novo">Novo cliente</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className={styles.sales}>
      <AdminPageHeader
        title="Registrar venda"
        description="Conclusão comercial · não implica recebimento financeiro"
        secondaryActions={
          <Button asChild variant="ghost">
            <Link href="/painel/vendas">Voltar</Link>
          </Button>
        }
      />

      <form className={styles.sales__form} onSubmit={onSubmit}>
        <Select label="Veículo" value={vehicleId} onValueChange={setVehicleId}>
          {vehicles.map((vehicle) => (
            <SelectItem key={vehicle.id} value={vehicle.id}>
              {vehicle.label}
            </SelectItem>
          ))}
        </Select>

        {selectedVehicle ? (
          <div className={styles.sales__alert}>
            <p>
              Referência anunciada/pretendida:{' '}
              <strong>{formatCents(selectedVehicle.listedPriceCents)}</strong>
            </p>
            {canViewCosts && selectedVehicle.costsCents != null ? (
              <>
                <p>
                  Custos registrados: <strong>{formatCents(selectedVehicle.costsCents)}</strong>
                  {selectedVehicle.costsIncomplete ? ' · dados incompletos' : ''}
                </p>
                {selectedVehicle.ownership === 'consigned' ? (
                  <p className={styles.sales__hint}>
                    Veículo consignado — o resultado bruto estimado não será tratado como lucro da
                    loja.
                  </p>
                ) : (
                  <p className={styles.sales__hint}>
                    Resultado bruto estimado = valor negociado − custos (não é lucro líquido).
                  </p>
                )}
              </>
            ) : (
              <p className={styles.sales__hint}>
                Custos internos ocultos (permissão de custos necessária).
              </p>
            )}
          </div>
        ) : null}

        <Select label="Cliente" value={customerId} onValueChange={setCustomerId}>
          {customers.map((customer) => (
            <SelectItem key={customer.id} value={customer.id}>
              {customer.name} · {customer.phone}
            </SelectItem>
          ))}
        </Select>

        <Select label="Vendedor" value={sellerUserId} onValueChange={setSellerUserId}>
          <SelectItem value="self">Eu (registrante)</SelectItem>
          {sellers.map((seller) => (
            <SelectItem key={seller.userId} value={seller.userId}>
              {seller.name}
            </SelectItem>
          ))}
        </Select>

        <Field
          label="Valor negociado (R$)"
          name="price"
          required
          value={priceInput}
          onChange={(e) => setPriceInput(e.target.value)}
          placeholder="Ex.: 89500,00"
        />

        <Select
          label="Modalidade"
          value={modality}
          onValueChange={(v) => setModality(v as SaleModality)}
        >
          {Object.values(SALE_MODALITIES).map((value) => (
            <SelectItem key={value} value={value}>
              {SALE_MODALITY_LABELS[value]}
            </SelectItem>
          ))}
        </Select>

        <label className="flex items-center gap-2 text-sm text-text">
          <input
            type="checkbox"
            checked={hasTradeIn}
            onChange={(e) => setHasTradeIn(e.target.checked)}
          />
          Houve veículo recebido como parte do pagamento
        </label>

        {hasTradeIn ? (
          <Field
            label="Descrição do veículo na troca"
            name="tradeInDescription"
            required
            value={tradeInDescription}
            onChange={(e) => setTradeInDescription(e.target.value)}
            placeholder="Marca, modelo, ano — sem avaliação nesta fase"
          />
        ) : null}

        <Field
          label="Observações"
          name="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        {initialOpportunityId ? (
          <p className={styles.sales__meta}>
            Vinculada à oportunidade · será marcada como ganha
          </p>
        ) : null}

        <div className={styles.sales__formActions}>
          <ConfirmDialog
            title="Confirmar registro da venda?"
            description="O veículo será marcado como vendido, o anúncio deixará de ser público e a reserva ativa será concluída. Esta ação não registra pagamento."
            confirmLabel="Registrar venda"
            trigger={
              <Button type="button" disabled={pending || !vehicleId || !customerId}>
                {pending ? 'Registrando…' : 'Revisar e confirmar'}
              </Button>
            }
            action={submitSale}
          />
        </div>
      </form>
    </div>
  );
}
