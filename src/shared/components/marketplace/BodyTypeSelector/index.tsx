'use client';

import type { BodyType } from '@app-types/vehicle';
import { BODY_TYPE_LABELS } from '@app-types/vehicle';
import { cn } from '@utils/cn';

import styles from './styles.module.css';

const MARKETPLACE_BODY_TYPES: BodyType[] = ['hatch', 'sedan', 'suv', 'pickup', 'utility'];

type SilhouetteVariant = (typeof MARKETPLACE_BODY_TYPES)[number];

function BodySilhouette({ type }: { type: SilhouetteVariant }) {
  const common = 'fill-text-subtle/35 stroke-text-subtle/50';

  switch (type) {
    case 'suv':
      return (
        <svg viewBox="0 0 80 32" className={styles.bodyTypeSelector__svg} aria-hidden>
          <path d="M6 22h10l5-10h28l6 8h14v4H6z" className={common} strokeWidth="1.5" />
          <circle cx="22" cy="24" r="4" className="fill-text-subtle/50" />
          <circle cx="58" cy="24" r="4" className="fill-text-subtle/50" />
        </svg>
      );
    case 'hatch':
      return (
        <svg viewBox="0 0 80 32" className={styles.bodyTypeSelector__svg} aria-hidden>
          <path d="M8 22h12l4-8h24l8 8h8v4H8z" className={common} strokeWidth="1.5" />
          <path d="M20 14l6-6h16l4 6" className="fill-none stroke-text-subtle/50" strokeWidth="1.5" />
          <circle cx="24" cy="24" r="4" className="fill-text-subtle/50" />
          <circle cx="56" cy="24" r="4" className="fill-text-subtle/50" />
        </svg>
      );
    case 'pickup':
      return (
        <svg viewBox="0 0 80 32" className={styles.bodyTypeSelector__svg} aria-hidden>
          <path d="M6 22h28l4-8h18l8 8h6v4H6z" className={common} strokeWidth="1.5" />
          <rect x="8" y="16" width="22" height="6" rx="1" className="fill-text-subtle/25" />
          <circle cx="22" cy="24" r="4" className="fill-text-subtle/50" />
          <circle cx="58" cy="24" r="4" className="fill-text-subtle/50" />
        </svg>
      );
    case 'utility':
      return (
        <svg viewBox="0 0 80 32" className={styles.bodyTypeSelector__svg} aria-hidden>
          <path d="M4 22h72v4H4z" className={common} strokeWidth="1.5" />
          <rect x="8" y="12" width="28" height="10" rx="1" className="fill-text-subtle/30" />
          <rect x="40" y="14" width="28" height="8" rx="1" className="fill-text-subtle/25" />
          <circle cx="20" cy="24" r="4" className="fill-text-subtle/50" />
          <circle cx="60" cy="24" r="4" className="fill-text-subtle/50" />
        </svg>
      );
    case 'sedan':
    default:
      return (
        <svg viewBox="0 0 80 32" className={styles.bodyTypeSelector__svg} aria-hidden>
          <path d="M8 22h10l5-9h26l7 7h10v5H8z" className={common} strokeWidth="1.5" />
          <circle cx="24" cy="24" r="4" className="fill-text-subtle/50" />
          <circle cx="56" cy="24" r="4" className="fill-text-subtle/50" />
        </svg>
      );
  }
}

export type BodyTypeSelectorProps = {
  value?: BodyType | null;
  onChange?: (value: BodyType | null) => void;
  className?: string;
};

export function BodyTypeSelector({ value, onChange, className }: BodyTypeSelectorProps) {
  return (
    <div className={cn(styles.bodyTypeSelector, className)} role="listbox" aria-label="Tipo de carroceria">
      {MARKETPLACE_BODY_TYPES.map((type) => {
        const selected = value === type;

        return (
          <button
            key={type}
            type="button"
            role="option"
            aria-selected={selected}
            className={cn(styles.bodyTypeSelector__item, selected && styles['bodyTypeSelector__item--selected'])}
            onClick={() => {
              onChange?.(selected ? null : type);
            }}
          >
            <span className={styles.bodyTypeSelector__icon}>
              <BodySilhouette type={type} />
            </span>
            <span className={styles.bodyTypeSelector__label}>{BODY_TYPE_LABELS[type]}</span>
          </button>
        );
      })}
    </div>
  );
}
