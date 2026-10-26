'use client';

import * as SliderPrimitive from '@radix-ui/react-slider';
import { useEffect, useState, useTransition } from 'react';

import {
  DEFAULT_DESIRED_MARGIN_BPS,
  FIPE_MATCH_STATUS,
  type FipeCandidate,
  type PricingAnalysisDto,
  type PricingExplanationDto,
} from '@app-types/pricing';
import {
  Badge,
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
  Skeleton,
  useToast,
} from '@components/ui';

import { formatCents } from './inventory.format';
import styles from './PricingAssistant.module.css';
import {
  applyManualFipeCodeAction,
  getManualFipeYearsAction,
  getPricingAnalysisAction,
  getPricingExplanationAction,
  matchVehicleFipeAction,
  previewPricingAction,
  selectFipeCandidateAction,
  updateDesiredMarginAction,
} from '@server/pricing/pricing-actions';

export type PricingAssistantProps = {
  storeId: string;
  vehicleId?: string | null;
  ownership: string;
  askingPriceCents: number | null;
  draftAcquisitionCents?: number | null;
  variant?: 'full' | 'compact';
  canReadCosts?: boolean;
  onUseCalculatedPrice?: (priceCents: number) => void;
};

function statusBadge(status: PricingAnalysisDto['matchStatus']) {
  switch (status) {
    case FIPE_MATCH_STATUS.MATCHED:
      return <Badge variant="offer">FIPE vinculada</Badge>;
    case FIPE_MATCH_STATUS.CANDIDATES:
      return <Badge variant="soft">Selecione a versão</Badge>;
    case FIPE_MATCH_STATUS.STALE:
      return <Badge variant="soft">Cotação desatualizada</Badge>;
    case FIPE_MATCH_STATUS.UNAVAILABLE:
      return <Badge variant="neutral">Provedor indisponível</Badge>;
    default:
      return <Badge variant="neutral">Sem FIPE</Badge>;
  }
}

function bpsToPercentLabel(bps: number): string {
  const pct = bps / 100;
  return Number.isInteger(pct) ? `${pct}%` : `${pct.toFixed(1)}%`;
}

export function PricingAssistant({
  storeId,
  vehicleId,
  ownership,
  askingPriceCents,
  draftAcquisitionCents,
  variant = 'full',
  canReadCosts = true,
  onUseCalculatedPrice,
}: PricingAssistantProps) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [analysis, setAnalysis] = useState<PricingAnalysisDto | null>(null);
  const [marginBps, setMarginBps] = useState(DEFAULT_DESIRED_MARGIN_BPS);
  const [manualCode, setManualCode] = useState('');
  const [manualYearId, setManualYearId] = useState('');
  const [manualYears, setManualYears] = useState<{ code: string; name: string }[]>([]);
  const [explainOpen, setExplainOpen] = useState(false);
  const [explanation, setExplanation] = useState<PricingExplanationDto | null>(null);
  const [loading, setLoading] = useState(true);

  const draftCosts =
    draftAcquisitionCents != null
      ? [{ type: 'acquisition', amountCents: draftAcquisitionCents }]
      : undefined;

  function applyAnalysis(data: PricingAnalysisDto) {
    setAnalysis(data);
    setMarginBps(data.desiredMarginBps);
  }

  function load() {
    setLoading(true);
    startTransition(async () => {
      if (!vehicleId) {
        const result = await previewPricingAction({
          storeId,
          ownership: ownership === 'consigned' ? 'consigned' : 'own',
          askingPriceCents,
          desiredMarginBps: marginBps,
          draftCosts,
        });

        if (result.ok) {
          applyAnalysis(result.data);
        } else {
          toast({ title: 'Precificação', description: result.message, variant: 'error' });
        }

        setLoading(false);
        return;
      }

      const result = await getPricingAnalysisAction({ storeId, vehicleId });

      if (result.ok) {
        applyAnalysis(result.data);
      } else {
        toast({ title: 'Precificação', description: result.message, variant: 'error' });
      }

      setLoading(false);
    });
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- carrega ao montar / mudar veículo
  }, [storeId, vehicleId]);

  function handleMatch(force = false) {
    if (!vehicleId) {
      toast({
        title: 'Salve o veículo',
        description: 'É preciso salvar o cadastro antes de buscar a FIPE.',
        variant: 'error',
      });
      return;
    }

    startTransition(async () => {
      const result = await matchVehicleFipeAction({ storeId, vehicleId, force });

      if (!result.ok) {
        toast({ title: 'FIPE', description: result.message, variant: 'error' });
        return;
      }

      applyAnalysis(result.data);
    });
  }

  function handleSelectCandidate(candidate: FipeCandidate) {
    if (!vehicleId) {
      return;
    }

    startTransition(async () => {
      const result = await selectFipeCandidateAction({
        storeId,
        vehicleId,
        brandCode: candidate.brandCode,
        modelCode: candidate.modelCode,
        yearId: candidate.yearId,
        fipeCode: candidate.fipeCode,
      });

      if (!result.ok) {
        toast({ title: 'FIPE', description: result.message, variant: 'error' });
        return;
      }

      applyAnalysis(result.data);
    });
  }

  function handleMarginCommit(nextBps: number) {
    setMarginBps(nextBps);

    if (!vehicleId) {
      startTransition(async () => {
        const result = await previewPricingAction({
          storeId,
          ownership: ownership === 'consigned' ? 'consigned' : 'own',
          askingPriceCents,
          desiredMarginBps: nextBps,
          draftCosts,
        });

        if (result.ok) {
          applyAnalysis(result.data);
        }
      });
      return;
    }

    startTransition(async () => {
      const result = await updateDesiredMarginAction({
        storeId,
        vehicleId,
        desiredMarginBps: nextBps,
      });

      if (!result.ok) {
        toast({ title: 'Margem', description: result.message, variant: 'error' });
        return;
      }

      applyAnalysis(result.data);
    });
  }

  function handleLoadManualYears() {
    if (!manualCode.trim()) {
      return;
    }

    startTransition(async () => {
      const result = await getManualFipeYearsAction({
        storeId,
        fipeCode: manualCode.trim(),
      });

      if (!result.ok) {
        toast({ title: 'Código FIPE', description: result.message, variant: 'error' });
        setManualYears([]);
        return;
      }

      setManualYears(result.data.years);
      setManualYearId(result.data.years[0]?.code ?? '');
    });
  }

  function handleApplyManual() {
    if (!vehicleId) {
      toast({
        title: 'Salve o veículo',
        description: 'É preciso salvar o cadastro antes de vincular o código FIPE.',
        variant: 'error',
      });
      return;
    }

    startTransition(async () => {
      const result = await applyManualFipeCodeAction({
        storeId,
        vehicleId,
        fipeCode: manualCode.trim(),
        yearId: manualYearId,
      });

      if (!result.ok) {
        toast({ title: 'Código FIPE', description: result.message, variant: 'error' });
        return;
      }

      applyAnalysis(result.data);
      toast({ title: 'FIPE vinculada', description: 'Referência salva neste veículo.' });
    });
  }

  function handleOpenExplanation() {
    if (!vehicleId) {
      setExplanation({
        fipePriceCents: analysis?.fipe?.priceCents ?? null,
        fipeReferenceLabel: analysis?.fipe?.referenceLabel ?? null,
        knownCostCents: analysis?.costs.knownCostCents ?? null,
        desiredMarginBps: marginBps,
        formula: `Preço = Custo conhecido ÷ (1 − ${bpsToPercentLabel(marginBps)} / 100)`,
        priceFromMarginCents: analysis?.priceFromMarginCents ?? null,
        limitations: [
          'A referência FIPE é informativa e vem de provedor terceiro (não é API oficial da Fundação FIPE).',
          'Salve o veículo para persistir a análise completa.',
        ],
      });
      setExplainOpen(true);
      return;
    }

    startTransition(async () => {
      const result = await getPricingExplanationAction({ storeId, vehicleId });

      if (!result.ok) {
        toast({ title: 'Explicação', description: result.message, variant: 'error' });
        return;
      }

      setExplanation(result.data);
      setExplainOpen(true);
    });
  }

  if (loading && !analysis) {
    return (
      <div className={styles.assistant} aria-busy="true">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (!analysis) {
    return null;
  }

  if (variant === 'compact') {
    return (
      <div className={styles.assistant}>
        <div className={styles.assistant__header}>
          <div>
            <h3 className={styles.assistant__title}>Precificação</h3>
            <p className={styles.assistant__subtitle}>
              Referência interna · não aparece no marketplace
            </p>
          </div>
          {statusBadge(analysis.matchStatus)}
        </div>

        <div className={styles.assistant__compact}>
          <div className={styles.assistant__compactRow}>
            <span className={styles.assistant__compactLabel}>FIPE</span>
            <span className={styles.assistant__compactValue}>
              {formatCents(analysis.fipe?.priceCents)}
            </span>
          </div>
          {canReadCosts ? (
            <div className={styles.assistant__compactRow}>
              <span className={styles.assistant__compactLabel}>
                Preço pela margem ({bpsToPercentLabel(analysis.desiredMarginBps)})
              </span>
              <span className={styles.assistant__compactValue}>
                {formatCents(analysis.priceFromMarginCents)}
              </span>
            </div>
          ) : null}
          <div className={styles.assistant__compactRow}>
            <span className={styles.assistant__compactLabel}>Preço pretendido</span>
            <span className={styles.assistant__compactValue}>
              {formatCents(analysis.askingPriceCents)}
            </span>
          </div>
          {analysis.diffAskingVsFipe ? (
            <p className={styles.assistant__metricHint}>{analysis.diffAskingVsFipe.label}</p>
          ) : null}
        </div>

        <div className={styles.assistant__actions}>
          <Button type="button" size="sm" variant="outline" onClick={handleOpenExplanation}>
            Como este preço foi calculado
          </Button>
          {vehicleId && analysis.matchStatus !== FIPE_MATCH_STATUS.MATCHED ? (
            <Button type="button" size="sm" onClick={() => handleMatch(true)} disabled={pending}>
              Buscar FIPE
            </Button>
          ) : null}
        </div>

        <ExplanationDialog
          open={explainOpen}
          onOpenChange={setExplainOpen}
          explanation={explanation}
        />
      </div>
    );
  }

  return (
    <div className={styles.assistant}>
      <div className={styles.assistant__header}>
        <div>
          <h3 className={styles.assistant__title}>Assistente de precificação</h3>
          <p className={styles.assistant__subtitle}>
            Dados via provedor terceiro com base na Tabela FIPE. Apenas painel interno — nunca
            preenchidos automaticamente no preço pretendido.
          </p>
        </div>
        {statusBadge(analysis.matchStatus)}
      </div>

      <div className={styles.assistant__grid}>
        <div className={styles.assistant__metric}>
          <span className={styles.assistant__metricLabel}>Referência FIPE</span>
          <span className={styles.assistant__metricValue}>
            {formatCents(analysis.fipe?.priceCents)}
          </span>
          <span className={styles.assistant__metricHint}>
            {analysis.fipe
              ? `${analysis.fipe.modelName} · ${analysis.fipe.referenceLabel}`
              : 'Sem vínculo'}
          </span>
        </div>
        <div className={styles.assistant__metric}>
          <span className={styles.assistant__metricLabel}>Preço pela margem</span>
          <span className={styles.assistant__metricValue}>
            {formatCents(analysis.priceFromMarginCents)}
          </span>
          <span className={styles.assistant__metricHint}>
            {analysis.diffMarginPriceVsFipe?.label ??
              (analysis.costs.marginAnalysisAvailable
                ? 'Com base nos custos registrados'
                : 'Margem indisponível')}
          </span>
        </div>
        <div className={styles.assistant__metric}>
          <span className={styles.assistant__metricLabel}>Preço pretendido atual</span>
          <span className={styles.assistant__metricValue}>
            {formatCents(askingPriceCents ?? analysis.askingPriceCents)}
          </span>
          <span className={styles.assistant__metricHint}>
            {analysis.diffAskingVsFipe?.label ??
              (analysis.estimatedMarginOnAskingBps != null
                ? `Margem estimada ${bpsToPercentLabel(analysis.estimatedMarginOnAskingBps)}`
                : '—')}
          </span>
        </div>
      </div>

      {canReadCosts && analysis.costs.marginAnalysisAvailable ? (
        <div className={styles.assistant__margin}>
          <div className={styles.assistant__marginRow}>
            <Field
              id="desiredMarginPct"
              label="Margem desejada (%)"
              type="number"
              inputMode="decimal"
              value={String(marginBps / 100)}
              onChange={(e) => {
                const pct = Number(e.target.value.replace(',', '.'));

                if (!Number.isFinite(pct)) {
                  return;
                }

                const next = Math.max(0, Math.min(99.99, pct));
                setMarginBps(Math.round(next * 100));
              }}
              onBlur={() => handleMarginCommit(marginBps)}
              className="w-28"
            />
            <div className={styles.assistant__slider}>
              <SliderPrimitive.Root
                className="relative flex h-5 w-full touch-none select-none items-center"
                value={[marginBps]}
                min={0}
                max={4000}
                step={25}
                onValueChange={(value) => setMarginBps(value[0] ?? marginBps)}
                onValueCommit={(value) => handleMarginCommit(value[0] ?? marginBps)}
                disabled={pending}
              >
                <SliderPrimitive.Track className="relative h-1.5 grow rounded-full bg-border">
                  <SliderPrimitive.Range className="absolute h-full rounded-full bg-accent" />
                </SliderPrimitive.Track>
                <SliderPrimitive.Thumb className="block size-4 rounded-full border border-border bg-surface shadow outline-none focus-visible:ring-2 focus-visible:ring-accent-strong" />
              </SliderPrimitive.Root>
            </div>
          </div>
        </div>
      ) : null}

      {analysis.candidates.length > 0 ? (
        <div className={styles.assistant__candidates} role="list">
          {analysis.candidates.map((candidate) => (
            <button
              key={`${candidate.brandCode}-${candidate.modelCode}-${candidate.yearId}-${candidate.label}`}
              type="button"
              className={styles.assistant__candidate}
              onClick={() => handleSelectCandidate(candidate)}
              disabled={pending || !candidate.modelCode}
              role="listitem"
            >
              <span className={styles.assistant__candidateLabel}>{candidate.label}</span>
              <Badge variant="neutral">Usar</Badge>
            </button>
          ))}
        </div>
      ) : null}

      <div className={styles.assistant__manual}>
        <Field
          id="manualFipeCode"
          label="Código FIPE (manual)"
          value={manualCode}
          onChange={(e) => setManualCode(e.target.value)}
          placeholder="005340-6"
          onBlur={handleLoadManualYears}
        />
        <div>
          <label className="mb-1.5 block text-sm font-medium text-text" htmlFor="manualFipeYear">
            Ano / combustível
          </label>
          <Select
            value={manualYearId || undefined}
            onValueChange={setManualYearId}
            disabled={!manualYears.length}
            placeholder={manualYears.length ? 'Selecione' : 'Informe o código'}
          >
            {manualYears.map((year) => (
              <SelectItem key={year.code} value={year.code}>
                {year.name}
              </SelectItem>
            ))}
          </Select>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={handleApplyManual}
          disabled={pending || !manualCode.trim() || !manualYearId}
        >
          Vincular código
        </Button>
      </div>

      {analysis.messages.length > 0 ? (
        <ul className={styles.assistant__messages}>
          {analysis.messages.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      ) : null}

      <div className={styles.assistant__actions}>
        <Button
          type="button"
          onClick={() => handleMatch(true)}
          disabled={pending || !vehicleId}
          variant="outline"
        >
          {analysis.matchStatus === FIPE_MATCH_STATUS.MATCHED ? 'Atualizar FIPE' : 'Buscar FIPE'}
        </Button>
        <Button
          type="button"
          onClick={() => {
            if (
              analysis.canUseCalculatedPrice &&
              analysis.priceFromMarginCents != null &&
              onUseCalculatedPrice
            ) {
              onUseCalculatedPrice(analysis.priceFromMarginCents);
              toast({
                title: 'Preço aplicado',
                description: 'O preço pretendido foi preenchido com o valor calculado. Revise antes de salvar.',
              });
            }
          }}
          disabled={!analysis.canUseCalculatedPrice || !onUseCalculatedPrice || pending}
        >
          Usar preço calculado
        </Button>
        <Button type="button" variant="ghost" onClick={handleOpenExplanation} disabled={pending}>
          Como este preço foi calculado
        </Button>
      </div>

      <ExplanationDialog
        open={explainOpen}
        onOpenChange={setExplainOpen}
        explanation={explanation}
      />
    </div>
  );
}

function ExplanationDialog({
  open,
  onOpenChange,
  explanation,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  explanation: PricingExplanationDto | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Como este preço foi calculado</DialogTitle>
          <DialogDescription>
            Transparência da sugestão — sem julgamento de “barato” ou “caro”.
          </DialogDescription>
        </DialogHeader>
        {explanation ? (
          <div className={styles.explanation}>
            <p>
              FIPE: <strong>{formatCents(explanation.fipePriceCents)}</strong>
              {explanation.fipeReferenceLabel
                ? ` (${explanation.fipeReferenceLabel})`
                : ''}
            </p>
            <p>
              Custo conhecido:{' '}
              <strong>{formatCents(explanation.knownCostCents)}</strong>
            </p>
            <p>
              Margem desejada:{' '}
              <strong>{bpsToPercentLabel(explanation.desiredMarginBps)}</strong>
            </p>
            <p className={styles.explanation__formula}>{explanation.formula}</p>
            <p>
              Preço pela margem:{' '}
              <strong>{formatCents(explanation.priceFromMarginCents)}</strong>
            </p>
            <ul className={styles.explanation__list}>
              {explanation.limitations.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ) : (
          <Skeleton className="h-24 w-full" />
        )}
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Fechar
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
