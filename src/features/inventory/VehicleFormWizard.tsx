'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, type FormEvent } from 'react';

import {
  INVENTORY_FORM_STEPS,
  VEHICLE_CONDITION_LABELS,
  VEHICLE_OWNERSHIP_LABELS,
} from '@app-types/inventory';
import type { MediaItem } from '@app-types/media';
import { MEDIA_PURPOSE } from '@app-types/media';
import { VEHICLE_COST_TYPES, VEHICLE_OWNERSHIP } from '@app-types/membership';
import { VEHICLE_STATUS } from '@app-types/status';
import {
  AdminEntitySummary,
  AdminFormActions,
  AdminFormActionsSpacer,
  AdminFormErrorSummary,
  AdminFormLayout,
  AdminFormStatus,
  AdminFormStepper,
  AdminPageHeader,
  AdminSection,
  type AdminFormSaveState,
  type AdminFormStepStatus,
} from '@components/dashboard';
import { ImageUploader } from '@components/media';
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Field,
  Select,
  SelectItem,
  useToast,
} from '@components/ui';
import { fixtureCatalog } from '@fixtures';
import type { VehicleRow } from '@lib/db';
import {
  createVehicleAction,
  updateVehicleAction,
  replaceVehicleMediaAction,
  addVehicleCostAction,
} from '@server/vehicles/inventory-actions';

import { centsToReaisInput, reaisInputToCents } from './inventory.format';
import styles from './inventory.module.css';
import { PricingAssistant } from './PricingAssistant';

export type VehicleFormWizardProps = {
  storeId: string;
  mode: 'create' | 'edit';
  vehicle?: VehicleRow | null;
  initialMedia?: MediaItem[];
};

type FormState = {
  internalCode: string;
  makeSlug: string;
  modelSlug: string;
  version: string;
  condition: 'new' | 'seminew' | 'used';
  ownership: string;
  enteredAt: string;
  mileageKm: string;
  fuel: string;
  transmission: string;
  yearManufacture: string;
  yearModel: string;
  bodyType: string;
  color: string;
  powerKw: string;
  drivetrain: string;
  vin: string;
  plate: string;
  askingPrice: string;
  consignorName: string;
  consignorPhone: string;
  consignorDocument: string;
  notesInternal: string;
  notesCommercial: string;
  acquisitionAmount: string;
  acquisitionDescription: string;
};

type PendingMakeChange = {
  nextMakeSlug: string;
};

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function initialState(vehicle?: VehicleRow | null): FormState {
  return {
    internalCode: vehicle?.internalCode ?? '',
    makeSlug: vehicle?.makeSlug ?? '',
    modelSlug: vehicle?.modelSlug ?? '',
    version: vehicle?.version ?? '',
    condition: (vehicle?.condition as FormState['condition']) ?? 'used',
    ownership: vehicle?.ownership ?? VEHICLE_OWNERSHIP.OWN,
    enteredAt: vehicle?.enteredAt?.slice(0, 10) ?? todayIsoDate(),
    mileageKm: String(vehicle?.mileageKm ?? 0),
    fuel: vehicle?.fuel ?? 'flex',
    transmission: vehicle?.transmission ?? 'automatic',
    yearManufacture: String(vehicle?.yearManufacture ?? new Date().getFullYear()),
    yearModel: String(vehicle?.yearModel ?? new Date().getFullYear()),
    bodyType: vehicle?.bodyType ?? 'hatch',
    color: vehicle?.color ?? '',
    powerKw: vehicle?.powerKw != null ? String(vehicle.powerKw) : '',
    drivetrain: vehicle?.drivetrain ?? '',
    vin: vehicle?.vin ?? '',
    plate: vehicle?.plate ?? '',
    askingPrice: centsToReaisInput(vehicle?.askingPriceCents),
    consignorName: vehicle?.consignorName ?? '',
    consignorPhone: vehicle?.consignorPhone ?? '',
    consignorDocument: vehicle?.consignorDocument ?? '',
    notesInternal: vehicle?.notesInternal ?? '',
    notesCommercial: vehicle?.notesCommercial ?? '',
    acquisitionAmount: '',
    acquisitionDescription:
      vehicle?.ownership === VEHICLE_OWNERSHIP.CONSIGNED
        ? 'Entrada consignação'
        : 'Aquisição estoque próprio',
  };
}

function fuelLabel(value: string): string {
  const map: Record<string, string> = {
    flex: 'Flex',
    gasoline: 'Gasolina',
    ethanol: 'Etanol',
    diesel: 'Diesel',
    hybrid: 'Híbrido',
    electric: 'Elétrico',
  };
  return map[value] ?? value;
}

function transmissionLabel(value: string): string {
  const map: Record<string, string> = {
    manual: 'Manual',
    automatic: 'Automático',
    cvt: 'CVT',
  };
  return map[value] ?? value;
}

export function VehicleFormWizard({
  storeId,
  mode,
  vehicle,
  initialMedia = [],
}: VehicleFormWizardProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [pending, setPending] = useState(false);
  const [saveState, setSaveState] = useState<AdminFormSaveState>(
    mode === 'edit' ? 'idle' : 'idle'
  );
  const [errors, setErrors] = useState<{ id: string; message: string; fieldId?: string }[]>([]);
  const [form, setForm] = useState<FormState>(() => initialState(vehicle));
  const [photos, setPhotos] = useState<MediaItem[]>(initialMedia);
  const [dirty, setDirty] = useState(false);
  const [persistedVehicleId, setPersistedVehicleId] = useState<string | null>(vehicle?.id ?? null);
  const [makeChange, setMakeChange] = useState<PendingMakeChange | null>(null);
  const [maxVisited, setMaxVisited] = useState(0);

  const make = fixtureCatalog.find((m) => m.slug === form.makeSlug);
  const models = make?.models ?? [];
  const modelName = models.find((m) => m.slug === form.modelSlug)?.name ?? form.modelSlug;
  const makeName = make?.name ?? form.makeSlug;
  const primaryPhoto =
    photos.find((p) => p.isPrimary && p.status === 'ready') ??
    photos.find((p) => p.status === 'ready');

  useEffect(() => {
    if (!dirty) {
      return;
    }

    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = '';
    }

    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  function markDirty() {
    setDirty(true);
    setSaveState('dirty');
  }

  function patch(partial: Partial<FormState>) {
    markDirty();
    setForm((prev) => ({ ...prev, ...partial }));
  }

  function requestMakeChange(nextMakeSlug: string) {
    if (
      form.makeSlug &&
      nextMakeSlug !== form.makeSlug &&
      (form.modelSlug || form.version.trim())
    ) {
      setMakeChange({ nextMakeSlug });
      return;
    }

    patch({ makeSlug: nextMakeSlug, modelSlug: '' });
  }

  function confirmMakeChange() {
    if (!makeChange) {
      return;
    }

    patch({ makeSlug: makeChange.nextMakeSlug, modelSlug: '', version: '' });
    setMakeChange(null);
  }

  function validateStep(index: number): { id: string; message: string; fieldId?: string }[] {
    const stepId = INVENTORY_FORM_STEPS[index]?.id;
    const next: { id: string; message: string; fieldId?: string }[] = [];

    if (stepId === 'identification') {
      if (!form.makeSlug) {
        next.push({ id: 'make', message: 'Selecione a marca', fieldId: 'makeSlug' });
      }
      if (!form.modelSlug) {
        next.push({ id: 'model', message: 'Selecione o modelo', fieldId: 'modelSlug' });
      }
      if (!form.version.trim()) {
        next.push({ id: 'version', message: 'Informe a versão', fieldId: 'version' });
      }
      if (form.vin.trim() && (form.vin.trim().length < 11 || form.vin.trim().length > 17)) {
        next.push({
          id: 'vin',
          message: 'Chassi/VIN deve ter entre 11 e 17 caracteres',
          fieldId: 'vin',
        });
      }
    }

    if (stepId === 'characteristics') {
      if (!form.fuel || !form.transmission || !form.bodyType) {
        next.push({
          id: 'specs',
          message: 'Preencha combustível, câmbio e carroceria',
        });
      }

      const ym = Number(form.yearManufacture);
      const ymo = Number(form.yearModel);

      if (!ym || !ymo || ym < 1950 || ymo < 1950) {
        next.push({
          id: 'years',
          message: 'Informe anos de fabricação e modelo válidos',
          fieldId: 'yearManufacture',
        });
      } else if (ymo < ym) {
        next.push({
          id: 'yearModel',
          message: 'Ano modelo não pode ser anterior ao ano de fabricação',
          fieldId: 'yearModel',
        });
      }

      if (form.mileageKm.trim() === '' || Number(form.mileageKm) < 0 || Number.isNaN(Number(form.mileageKm))) {
        next.push({
          id: 'mileage',
          message: 'Informe a quilometragem',
          fieldId: 'mileageKm',
        });
      }
    }

    if (stepId === 'acquisition') {
      if (form.ownership === VEHICLE_OWNERSHIP.CONSIGNED && !form.consignorName.trim()) {
        next.push({
          id: 'consignor',
          message: 'Informe o consignante',
          fieldId: 'consignorName',
        });
      }
      if (!form.enteredAt) {
        next.push({
          id: 'enteredAt',
          message: 'Informe a data de entrada',
          fieldId: 'enteredAt',
        });
      }
    }

    if (stepId === 'photos') {
      if (photos.some((item) => item.status === 'uploading')) {
        next.push({ id: 'photos-upload', message: 'Aguarde o término do upload das fotos' });
      }
    }

    return next;
  }

  function collectPendencies(): string[] {
    const items: string[] = [];

    if (!form.makeSlug || !form.modelSlug || !form.version.trim()) {
      items.push('Identificação incompleta');
    }
    if (!form.plate.trim()) {
      items.push('Placa não informada');
    }
    if (photos.filter((p) => p.status === 'ready').length === 0) {
      items.push('Nenhuma fotografia');
    }
    if (!form.askingPrice.trim()) {
      items.push('Preço pretendido vazio');
    }
    if (form.ownership === VEHICLE_OWNERSHIP.CONSIGNED && !form.consignorName.trim()) {
      items.push('Consignante pendente');
    }

    return items;
  }

  function buildPayload(isDraft: boolean) {
    return {
      storeId,
      internalCode: form.internalCode || null,
      make: makeName || form.makeSlug,
      makeSlug: form.makeSlug,
      model: modelName || form.modelSlug,
      modelSlug: form.modelSlug,
      version: form.version.trim(),
      condition: form.condition,
      status: VEHICLE_STATUS.PREPARING,
      ownership: form.ownership as 'own' | 'consigned',
      enteredAt: new Date(form.enteredAt || todayIsoDate()).toISOString(),
      mileageKm: Number(form.mileageKm) || 0,
      fuel: form.fuel,
      transmission: form.transmission,
      yearManufacture: Number(form.yearManufacture) || new Date().getFullYear(),
      yearModel: Number(form.yearModel) || new Date().getFullYear(),
      bodyType: form.bodyType,
      color: form.color || null,
      powerKw: form.powerKw ? Number(form.powerKw) : null,
      drivetrain: form.drivetrain || null,
      vin: form.vin || null,
      plate: form.plate || null,
      askingPriceCents: reaisInputToCents(form.askingPrice),
      consignorName: form.consignorName || null,
      consignorPhone: form.consignorPhone || null,
      consignorDocument: form.consignorDocument || null,
      isDraft,
      notesInternal: form.notesInternal || null,
      notesCommercial: form.notesCommercial || null,
    };
  }

  async function persist(isDraft: boolean) {
    if (!isDraft) {
      const allErrors: { id: string; message: string; fieldId?: string }[] = [];

      for (let i = 0; i < INVENTORY_FORM_STEPS.length; i += 1) {
        allErrors.push(...validateStep(i));
      }

      if (allErrors.length > 0) {
        setErrors(allErrors);
        const firstStepWithError = INVENTORY_FORM_STEPS.findIndex((_, index) =>
          validateStep(index).length > 0
        );
        if (firstStepWithError >= 0) {
          setStep(firstStepWithError);
        }
        setSaveState('error');
        return null;
      }
    } else {
      const identityErrors = validateStep(0);
      if (identityErrors.length > 0) {
        setErrors(identityErrors);
        setStep(0);
        setSaveState('error');
        return null;
      }
    }

    setPending(true);
    setErrors([]);
    setSaveState('saving');

    const payload = buildPayload(isDraft);
    const editingId = persistedVehicleId ?? vehicle?.id;
    const isCreate = mode === 'create' && !editingId;

    const result = isCreate
      ? await createVehicleAction(payload)
      : await updateVehicleAction({
          ...payload,
          vehicleId: editingId!,
        });

    if (!result.ok) {
      setPending(false);
      setSaveState('error');
      setErrors([{ id: 'server', message: result.message }]);
      toast({ title: 'Não foi possível salvar', description: result.message, variant: 'error' });
      return null;
    }

    const vehicleId = result.data.id;
    setPersistedVehicleId(vehicleId);

    if (photos.some((item) => item.status === 'uploading')) {
      setPending(false);
      setSaveState('error');
      setErrors([{ id: 'photos-upload', message: 'Aguarde o término do upload das fotos' }]);
      toast({ title: 'Upload em andamento', variant: 'error' });
      return null;
    }

    const readyPhotos = photos.filter((item) => item.status === 'ready');

    const mediaResult = await replaceVehicleMediaAction({
      storeId,
      vehicleId,
      items: readyPhotos.map((item, index) => ({
        url: item.detailUrl || item.url,
        cardUrl: item.cardUrl ?? null,
        detailUrl: item.detailUrl ?? item.url,
        storageKey: item.storageKey ?? null,
        mediaAssetId: item.id.startsWith('local-') ? null : item.id,
        sortOrder: item.sortOrder ?? index,
        isPrimary: item.isPrimary || index === 0,
        alt: item.alt ?? null,
        width: item.width ?? null,
        height: item.height ?? null,
        mimeType: item.mimeType ?? null,
      })),
    });

    if (!mediaResult.ok) {
      toast({
        title: 'Veículo salvo, mídia incompleta',
        description: mediaResult.message,
        variant: 'error',
      });
    }

    if (isCreate && form.acquisitionAmount.trim()) {
      const amountCents = reaisInputToCents(form.acquisitionAmount);

      if (amountCents != null && amountCents > 0) {
        const costResult = await addVehicleCostAction({
          storeId,
          vehicleId,
          type: VEHICLE_COST_TYPES.ACQUISITION,
          amountCents,
          incurredAt: new Date(form.enteredAt).toISOString(),
          description:
            form.acquisitionDescription ||
            (form.ownership === VEHICLE_OWNERSHIP.CONSIGNED
              ? 'Entrada consignação'
              : 'Aquisição estoque próprio'),
        });

        if (!costResult.ok) {
          toast({
            title: 'Veículo salvo, custo não registrado',
            description: costResult.message,
            variant: 'error',
          });
        }
      }
    }

    setPending(false);
    setDirty(false);
    setSaveState(isDraft ? 'draft_saved' : 'saved');
    const created = mode === 'create' && isCreate && !isDraft;
    toast({
      title: isDraft
        ? 'Rascunho salvo'
        : created
          ? 'Veículo cadastrado'
          : 'Veículo atualizado',
      description: created
        ? 'Publique quando quiser na aba Publicação da ficha.'
        : undefined,
      variant: 'success',
    });

    if (isDraft) {
      router.replace(`/painel/estoque/${vehicleId}?editar=1`);
      router.refresh();
      return vehicleId;
    }

    router.push(`/painel/estoque/${vehicleId}`);
    router.refresh();
    return vehicleId;
  }

  function goToStep(index: number) {
    setStep(index);
    setMaxVisited((prev) => Math.max(prev, index));
    setErrors([]);
  }

  function onNext() {
    const stepErrors = validateStep(step);

    if (stepErrors.length > 0) {
      setErrors(stepErrors);
      const first = stepErrors.find((e) => e.fieldId);
      if (first?.fieldId && typeof document !== 'undefined') {
        document.getElementById(first.fieldId)?.focus();
      }
      return;
    }

    setErrors([]);
    const next = Math.min(step + 1, INVENTORY_FORM_STEPS.length - 1);
    goToStep(next);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    await persist(false);
  }

  const stepId = INVENTORY_FORM_STEPS[step]?.id;
  const pendencies = collectPendencies();

  const stepperSteps = useMemo(
    () =>
      INVENTORY_FORM_STEPS.map((item, index) => {
        let status: AdminFormStepStatus = 'upcoming';

        if (index === step) {
          status = 'current';
        } else if (errors.length > 0 && index < step && validateStep(index).length > 0) {
          status = 'error';
        } else if (index < step || index <= maxVisited) {
          const stepPendencies =
            index === 0 && (!form.makeSlug || !form.modelSlug || !form.version.trim())
              ? true
              : index === 3 && photos.filter((p) => p.status === 'ready').length === 0
                ? true
                : false;
          status = stepPendencies && index < step ? 'pending' : 'done';
        }

        return { id: item.id, label: item.label, status };
      }),
    // validateStep/form deps covered via form + photos + step + errors + maxVisited
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [step, errors, maxVisited, form.makeSlug, form.modelSlug, form.version, photos]
  );

  const summaryTitle =
    makeName && modelName ? `${makeName} ${modelName}` : 'Novo veículo';
  const summarySubtitle = form.version.trim()
    ? `${form.version}${form.yearModel ? ` · ${form.yearModel}` : ''}`
    : form.yearModel
      ? String(form.yearModel)
      : 'Preencha a identificação';

  return (
    <>
      <form className={styles.inventory__wizard} onSubmit={onSubmit}>
        <AdminPageHeader
          title={mode === 'create' && !persistedVehicleId ? 'Cadastrar veículo' : 'Editar veículo'}
          description="Cadastro operacional do estoque. A publicação no marketplace/vitrine é feita depois, na ficha."
          titleAs="h2"
          secondaryActions={<AdminFormStatus state={saveState} />}
        />

        <AdminFormStepper
          steps={stepperSteps}
          currentIndex={step}
          onStepSelect={(index) => {
            if (index <= Math.max(step, maxVisited)) {
              goToStep(index);
            }
          }}
        />

        <AdminFormLayout
          width="full"
          card
          fill={stepId === 'photos'}
          summary={
            <AdminEntitySummary
              title={summaryTitle}
              subtitle={summarySubtitle}
              imageUrl={
                primaryPhoto
                  ? primaryPhoto.previewUrl || primaryPhoto.cardUrl || primaryPhoto.url
                  : null
              }
              imageAlt={summaryTitle}
              badge={
                <span className={styles.inventory__summaryBadge}>
                  {dirty
                    ? 'Alterações locais'
                    : saveState === 'draft_saved' || vehicle?.isDraft === 'true'
                      ? 'Rascunho'
                      : mode === 'edit'
                        ? 'Cadastro'
                        : 'Novo'}
                </span>
              }
              items={[
                {
                  label: 'Ano',
                  value: form.yearModel || '—',
                },
                {
                  label: 'Situação',
                  value:
                    VEHICLE_OWNERSHIP_LABELS[
                      form.ownership as keyof typeof VEHICLE_OWNERSHIP_LABELS
                    ] ?? form.ownership,
                },
                {
                  label: 'Preço',
                  value: form.askingPrice.trim() ? `R$ ${form.askingPrice}` : '—',
                },
                {
                  label: 'Fotos',
                  value: String(photos.filter((p) => p.status === 'ready').length),
                },
              ]}
              pending={pendencies}
            />
          }
        >
          <AdminFormErrorSummary errors={errors} />

          {stepId === 'identification' ? (
            <AdminSection
              title="Identificação"
              description="Marca, modelo e identificadores internos. Placa e chassi não são expostos publicamente neste cadastro."
            >
              <div className={styles.inventory__formGrid}>
                <Select
                  label="Marca"
                  value={form.makeSlug || undefined}
                  onValueChange={requestMakeChange}
                  placeholder="Selecione"
                >
                  {fixtureCatalog.map((item) => (
                    <SelectItem key={item.slug} value={item.slug}>
                      {item.name}
                    </SelectItem>
                  ))}
                </Select>
                <Select
                  label="Modelo"
                  value={form.modelSlug || undefined}
                  onValueChange={(value) => patch({ modelSlug: value })}
                  placeholder="Selecione"
                  disabled={!form.makeSlug}
                >
                  {models.map((item) => (
                    <SelectItem key={item.slug} value={item.slug}>
                      {item.name}
                    </SelectItem>
                  ))}
                </Select>
                <Field
                  id="version"
                  label="Versão"
                  name="version"
                  required
                  value={form.version}
                  onChange={(e) => patch({ version: e.target.value })}
                  placeholder="Ex.: XEi 2.0"
                  hint="Informe a versão mesmo se não estiver no catálogo."
                />
                <Field
                  id="internalCode"
                  label="Código interno"
                  name="internalCode"
                  value={form.internalCode}
                  onChange={(e) => patch({ internalCode: e.target.value })}
                />
                <Field
                  id="plate"
                  label="Placa"
                  name="plate"
                  value={form.plate}
                  onChange={(e) => patch({ plate: e.target.value.toUpperCase() })}
                  placeholder="ABC1D23"
                  autoCapitalize="characters"
                />
                <Field
                  id="vin"
                  label="Chassi (VIN)"
                  name="vin"
                  value={form.vin}
                  onChange={(e) => patch({ vin: e.target.value.toUpperCase() })}
                  hint="11 a 17 caracteres · privado da loja"
                  autoCapitalize="characters"
                />
              </div>
            </AdminSection>
          ) : null}

          {stepId === 'characteristics' ? (
            <AdminSection
              title="Características"
              description="Dados essenciais e técnicos. Quilometragem zero não implica veículo novo."
            >
              <div className={styles.inventory__formGrid}>
                <Select
                  label="Condição"
                  value={form.condition}
                  onValueChange={(value) => patch({ condition: value as FormState['condition'] })}
                >
                  <SelectItem value="new">Novo</SelectItem>
                  <SelectItem value="seminew">Seminovo</SelectItem>
                  <SelectItem value="used">Usado</SelectItem>
                </Select>
                <Field
                  id="mileageKm"
                  label="Quilometragem"
                  name="mileageKm"
                  inputMode="numeric"
                  value={form.mileageKm}
                  onChange={(e) => patch({ mileageKm: e.target.value.replace(/\D/g, '') })}
                />
                <Field
                  id="yearManufacture"
                  label="Ano fabricação"
                  name="yearManufacture"
                  inputMode="numeric"
                  value={form.yearManufacture}
                  onChange={(e) => patch({ yearManufacture: e.target.value.replace(/\D/g, '') })}
                />
                <Field
                  id="yearModel"
                  label="Ano modelo"
                  name="yearModel"
                  inputMode="numeric"
                  value={form.yearModel}
                  onChange={(e) => patch({ yearModel: e.target.value.replace(/\D/g, '') })}
                />
                <Select
                  label="Combustível"
                  value={form.fuel}
                  onValueChange={(value) => patch({ fuel: value })}
                >
                  <SelectItem value="flex">Flex</SelectItem>
                  <SelectItem value="gasoline">Gasolina</SelectItem>
                  <SelectItem value="ethanol">Etanol</SelectItem>
                  <SelectItem value="diesel">Diesel</SelectItem>
                  <SelectItem value="hybrid">Híbrido</SelectItem>
                  <SelectItem value="electric">Elétrico</SelectItem>
                </Select>
                <Select
                  label="Câmbio"
                  value={form.transmission}
                  onValueChange={(value) => patch({ transmission: value })}
                >
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="automatic">Automático</SelectItem>
                  <SelectItem value="cvt">CVT</SelectItem>
                </Select>
                <Select
                  label="Carroceria"
                  value={form.bodyType}
                  onValueChange={(value) => patch({ bodyType: value })}
                >
                  <SelectItem value="hatch">Hatch</SelectItem>
                  <SelectItem value="sedan">Sedã</SelectItem>
                  <SelectItem value="suv">SUV</SelectItem>
                  <SelectItem value="pickup">Picape</SelectItem>
                  <SelectItem value="van">Van</SelectItem>
                </Select>
                <Field
                  id="color"
                  label="Cor"
                  name="color"
                  value={form.color}
                  onChange={(e) => patch({ color: e.target.value })}
                />
              </div>

              <details className={styles.inventory__details}>
                <summary>Dados técnicos complementares</summary>
                <div className={styles.inventory__formGrid}>
                  <Field
                    id="powerKw"
                    label="Potência (kW)"
                    name="powerKw"
                    inputMode="decimal"
                    value={form.powerKw}
                    onChange={(e) => patch({ powerKw: e.target.value })}
                  />
                  <Field
                    id="drivetrain"
                    label="Tração"
                    name="drivetrain"
                    value={form.drivetrain}
                    onChange={(e) => patch({ drivetrain: e.target.value })}
                    placeholder="Ex.: 4x2, AWD"
                  />
                </div>
              </details>
            </AdminSection>
          ) : null}

          {stepId === 'acquisition' ? (
            <AdminSection
              title="Entrada e custos"
              description="Custos são privados da loja e nunca aparecem no marketplace. Não substituem um ERP financeiro."
            >
              <div className={styles.inventory__formGrid}>
                <Select
                  label="Propriedade"
                  value={form.ownership}
                  onValueChange={(value) => patch({ ownership: value })}
                >
                  <SelectItem value={VEHICLE_OWNERSHIP.OWN}>Próprio</SelectItem>
                  <SelectItem value={VEHICLE_OWNERSHIP.CONSIGNED}>Consignado</SelectItem>
                </Select>
                <Field
                  id="enteredAt"
                  label="Data de entrada"
                  name="enteredAt"
                  type="date"
                  value={form.enteredAt}
                  onChange={(e) => patch({ enteredAt: e.target.value })}
                />
                {form.ownership === VEHICLE_OWNERSHIP.CONSIGNED ? (
                  <>
                    <p className={`${styles.inventory__notice} ${styles.inventory__formFull}`}>
                      Em consignação, o custo de entrada não equivale à compra de estoque próprio.
                      Registre valores com descrição clara.
                    </p>
                    <Field
                      id="consignorName"
                      label="Consignante"
                      name="consignorName"
                      required
                      value={form.consignorName}
                      onChange={(e) => patch({ consignorName: e.target.value })}
                    />
                    <Field
                      id="consignorPhone"
                      label="Telefone consignante"
                      name="consignorPhone"
                      value={form.consignorPhone}
                      onChange={(e) => patch({ consignorPhone: e.target.value })}
                    />
                    <Field
                      id="consignorDocument"
                      label="Documento consignante"
                      name="consignorDocument"
                      value={form.consignorDocument}
                      onChange={(e) => patch({ consignorDocument: e.target.value })}
                    />
                  </>
                ) : null}

                {mode === 'create' && !persistedVehicleId ? (
                  <>
                    <Field
                      id="acquisitionAmount"
                      label={
                        form.ownership === VEHICLE_OWNERSHIP.CONSIGNED
                          ? 'Custo de entrada (R$)'
                          : 'Custo de aquisição (R$)'
                      }
                      name="acquisitionAmount"
                      value={form.acquisitionAmount}
                      onChange={(e) => patch({ acquisitionAmount: e.target.value })}
                      placeholder="0,00"
                      inputMode="decimal"
                    />
                    <Field
                      id="acquisitionDescription"
                      label="Descrição do custo"
                      name="acquisitionDescription"
                      value={form.acquisitionDescription}
                      onChange={(e) => patch({ acquisitionDescription: e.target.value })}
                    />
                  </>
                ) : (
                  <p className={`${styles.inventory__sectionText} ${styles.inventory__formFull}`}>
                    Despesas adicionais podem ser registradas na ficha do veículo após salvar.
                  </p>
                )}
              </div>
            </AdminSection>
          ) : null}

          {stepId === 'photos' ? (
            <AdminSection
              fill
              title="Fotografias"
              description="Organize a galeria. A imagem principal aparece no resumo e nos cards públicos."
            >
              <ImageUploader
                storeId={storeId}
                purpose={MEDIA_PURPOSE.VEHICLE_PHOTO}
                value={photos}
                onChange={(items) => {
                  markDirty();
                  setPhotos(items);
                }}
                entityType={persistedVehicleId || mode === 'edit' ? 'vehicle' : undefined}
                entityId={persistedVehicleId ?? vehicle?.id}
                label="Galeria do veículo"
                disabled={pending}
                variant="gallery"
              />
            </AdminSection>
          ) : null}

          {stepId === 'commercial' ? (
            <>
              <AdminSection
                title="Comercial"
                description="Salvar no estoque não publica automaticamente. Dados internos permanecem privados."
              >
                <div className={styles.inventory__formGrid}>
                  <Field
                    id="askingPrice"
                    label="Preço pretendido (R$)"
                    name="askingPrice"
                    value={form.askingPrice}
                    onChange={(e) => patch({ askingPrice: e.target.value })}
                    placeholder="0,00"
                    inputMode="decimal"
                  />
                  <div className={styles.inventory__formFull}>
                    <PricingAssistant
                      storeId={storeId}
                      vehicleId={persistedVehicleId ?? vehicle?.id}
                      ownership={form.ownership}
                      askingPriceCents={reaisInputToCents(form.askingPrice)}
                      draftAcquisitionCents={reaisInputToCents(form.acquisitionAmount)}
                      onUseCalculatedPrice={(priceCents) => {
                        patch({ askingPrice: centsToReaisInput(priceCents) });
                      }}
                    />
                  </div>
                  <div className={styles.inventory__formFull}>
                    <label
                      className="mb-1.5 block text-sm font-medium text-text"
                      htmlFor="notesCommercial"
                    >
                      Observações comerciais
                    </label>
                    <textarea
                      id="notesCommercial"
                      rows={3}
                      className={styles.inventory__textarea}
                      value={form.notesCommercial}
                      onChange={(e) => patch({ notesCommercial: e.target.value })}
                      placeholder="Visíveis internamente para a equipe comercial"
                    />
                  </div>
                  <div className={styles.inventory__formFull}>
                    <label
                      className="mb-1.5 block text-sm font-medium text-text"
                      htmlFor="notesInternal"
                    >
                      Notas internas
                    </label>
                    <textarea
                      id="notesInternal"
                      rows={3}
                      className={styles.inventory__textarea}
                      value={form.notesInternal}
                      onChange={(e) => patch({ notesInternal: e.target.value })}
                      placeholder="Privadas da loja"
                    />
                  </div>
                </div>
              </AdminSection>

              <AdminSection
                title="Revisão"
                description="Confira os dados antes de concluir. A publicação no marketplace e na vitrine fica na ficha do estoque, quando quiser."
              >
                <div className={styles.inventory__review}>
                  {(
                    [
                      {
                        stepIndex: 0,
                        title: 'Identificação',
                        lines: [
                          `${makeName || '—'} ${modelName || ''} ${form.version}`.trim(),
                          form.internalCode ? `Código ${form.internalCode}` : null,
                          form.plate ? `Placa ${form.plate}` : 'Placa não informada',
                          form.vin ? `VIN ${form.vin}` : null,
                        ],
                      },
                      {
                        stepIndex: 1,
                        title: 'Características',
                        lines: [
                          `${VEHICLE_CONDITION_LABELS[form.condition]} · ${form.mileageKm || 0} km`,
                          `${form.yearManufacture}/${form.yearModel}`,
                          `${fuelLabel(form.fuel)} · ${transmissionLabel(form.transmission)} · ${form.bodyType}`,
                          form.color || null,
                        ],
                      },
                      {
                        stepIndex: 2,
                        title: 'Entrada e custos',
                        lines: [
                          VEHICLE_OWNERSHIP_LABELS[
                            form.ownership as keyof typeof VEHICLE_OWNERSHIP_LABELS
                          ],
                          form.enteredAt ? `Entrada ${form.enteredAt}` : null,
                          form.ownership === VEHICLE_OWNERSHIP.CONSIGNED
                            ? form.consignorName
                              ? `Consignante: ${form.consignorName}`
                              : 'Consignante pendente'
                            : null,
                          form.acquisitionAmount
                            ? `Custo informado: R$ ${form.acquisitionAmount}`
                            : null,
                        ],
                      },
                      {
                        stepIndex: 3,
                        title: 'Fotografias',
                        lines: [
                          `${photos.filter((p) => p.status === 'ready').length} foto(s) pronta(s)`,
                        ],
                      },
                      {
                        stepIndex: 4,
                        title: 'Comercial',
                        lines: [
                          form.askingPrice.trim()
                            ? `Preço pretendido R$ ${form.askingPrice}`
                            : 'Preço não informado',
                          form.notesCommercial ? 'Há observações comerciais' : null,
                          form.notesInternal ? 'Há notas internas' : null,
                        ],
                      },
                    ] as const
                  ).map((block) => (
                    <div key={block.title} className={styles.inventory__reviewBlock}>
                      <div className={styles.inventory__reviewHead}>
                        <h3>{block.title}</h3>
                        <Button type="button" size="sm" variant="ghost" onClick={() => goToStep(block.stepIndex)}>
                          Corrigir
                        </Button>
                      </div>
                      <ul>
                        {block.lines
                          .filter((line): line is string => Boolean(line))
                          .map((line) => (
                            <li key={line}>{line}</li>
                          ))}
                      </ul>
                    </div>
                  ))}

                  {pendencies.length > 0 ? (
                    <div className={styles.inventory__reviewPending}>
                      <p className={styles.inventory__reviewPendingTitle}>Pendências</p>
                      <ul>
                        {pendencies.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                      <p className={styles.inventory__sectionText}>
                        Pendências não bloqueiam rascunho. Concluir exige os campos obrigatórios.
                      </p>
                    </div>
                  ) : (
                    <p className={styles.inventory__sectionText}>Nenhuma pendência listada.</p>
                  )}
                </div>
              </AdminSection>
            </>
          ) : null}

          <AdminFormActions sticky>
            {step > 0 ? (
              <Button type="button" variant="outline" onClick={() => goToStep(step - 1)}>
                Voltar
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (dirty && !window.confirm('Há alterações não salvas. Sair mesmo assim?')) {
                    return;
                  }
                  router.push('/painel/estoque');
                }}
              >
                Cancelar
              </Button>
            )}
            <AdminFormActionsSpacer />
            <Button
              type="button"
              variant="outline-accent"
              disabled={pending}
              onClick={() => void persist(true)}
            >
              Salvar rascunho
            </Button>
            {step < INVENTORY_FORM_STEPS.length - 1 ? (
              <Button type="button" onClick={onNext}>
                Continuar
              </Button>
            ) : (
              <Button type="submit" disabled={pending}>
                {pending ? 'Salvando…' : 'Concluir'}
              </Button>
            )}
          </AdminFormActions>
        </AdminFormLayout>
      </form>

      <Dialog open={Boolean(makeChange)} onOpenChange={(open) => !open && setMakeChange(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar marca?</DialogTitle>
            <DialogDescription>
              Modelo e versão preenchidos serão limpos. Esta ação não pode ser desfeita no
              formulário.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6 flex flex-wrap justify-end gap-2">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Manter marca
              </Button>
            </DialogClose>
            <Button type="button" onClick={confirmMakeChange}>
              Alterar e limpar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
