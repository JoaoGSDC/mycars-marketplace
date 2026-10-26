import { cn } from '@utils/cn';

import styles from '../admin.module.css';

export type AdminFormSaveState =
  | 'idle'
  | 'dirty'
  | 'saving'
  | 'draft_saved'
  | 'saved'
  | 'error';

export type AdminFormStatusProps = {
  state: AdminFormSaveState;
  message?: string;
  className?: string;
};

const STATE_LABEL: Record<AdminFormSaveState, string> = {
  idle: 'Sem alterações',
  dirty: 'Alterações não salvas',
  saving: 'Salvando…',
  draft_saved: 'Rascunho salvo',
  saved: 'Salvo',
  error: 'Erro ao salvar',
};

export function AdminFormStatus({ state, message, className }: AdminFormStatusProps) {
  return (
    <p
      className={cn(
        styles.adminFormStatus,
        styles[`adminFormStatus--${state}`],
        className
      )}
      role="status"
      aria-live="polite"
    >
      <span className={styles.adminFormStatus__dot} aria-hidden />
      <span>{message ?? STATE_LABEL[state]}</span>
    </p>
  );
}
