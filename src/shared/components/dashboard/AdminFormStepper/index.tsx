'use client';

import { Check, AlertCircle } from 'lucide-react';

import { cn } from '@utils/cn';

import styles from '../admin.module.css';

export type AdminFormStepStatus = 'upcoming' | 'current' | 'done' | 'error' | 'pending';

export type AdminFormStepItem = {
  id: string;
  label: string;
  status: AdminFormStepStatus;
};

export type AdminFormStepperProps = {
  steps: AdminFormStepItem[];
  currentIndex: number;
  onStepSelect?: (index: number) => void;
  /** Permite clicar em etapas já visitadas / concluídas. Default true. */
  allowNavigate?: boolean;
  className?: string;
};

function statusLabel(status: AdminFormStepStatus): string {
  switch (status) {
    case 'done':
      return 'concluída';
    case 'error':
      return 'com erros';
    case 'pending':
      return 'com pendências';
    case 'current':
      return 'atual';
    default:
      return 'próxima';
  }
}

export function AdminFormStepper({
  steps,
  currentIndex,
  onStepSelect,
  allowNavigate = true,
  className,
}: AdminFormStepperProps) {
  const current = steps[currentIndex];

  return (
    <nav
      className={cn(styles.adminFormStepper, className)}
      aria-label="Etapas do formulário"
    >
      <p className={styles.adminFormStepper__mobile} aria-live="polite">
        Etapa {currentIndex + 1} de {steps.length}
        {current ? `: ${current.label}` : ''}
      </p>

      <ol className={styles.adminFormStepper__list}>
        {steps.map((step, index) => {
          const interactive =
            allowNavigate &&
            Boolean(onStepSelect) &&
            (index <= currentIndex || step.status === 'done' || step.status === 'error');

          const content = (
            <>
              <span
                className={cn(
                  styles.adminFormStepper__marker,
                  step.status === 'done' && styles['adminFormStepper__marker--done'],
                  step.status === 'current' && styles['adminFormStepper__marker--current'],
                  step.status === 'error' && styles['adminFormStepper__marker--error'],
                  step.status === 'pending' && styles['adminFormStepper__marker--pending']
                )}
                aria-hidden
              >
                {step.status === 'done' ? (
                  <Check className="size-3.5" strokeWidth={2} />
                ) : step.status === 'error' ? (
                  <AlertCircle className="size-3.5" strokeWidth={2} />
                ) : (
                  index + 1
                )}
              </span>
              <span className={styles.adminFormStepper__label}>{step.label}</span>
              <span className="sr-only"> ({statusLabel(step.status)})</span>
            </>
          );

          return (
            <li
              key={step.id}
              className={cn(
                styles.adminFormStepper__item,
                step.status === 'current' && styles['adminFormStepper__item--current'],
                step.status === 'done' && styles['adminFormStepper__item--done'],
                step.status === 'error' && styles['adminFormStepper__item--error'],
                step.status === 'pending' && styles['adminFormStepper__item--pending']
              )}
              aria-current={step.status === 'current' ? 'step' : undefined}
            >
              {interactive ? (
                <button
                  type="button"
                  className={styles.adminFormStepper__button}
                  onClick={() => onStepSelect?.(index)}
                >
                  {content}
                </button>
              ) : (
                <span className={styles.adminFormStepper__static}>{content}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
