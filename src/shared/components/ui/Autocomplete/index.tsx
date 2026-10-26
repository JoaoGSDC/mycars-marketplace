'use client';

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';

import { Field, type FieldProps } from '@components/ui/Field';
import { cn } from '@utils/cn';

import styles from './styles.module.css';

export type AutocompleteOption = {
  value: string;
  /** Texto exibido na lista (ex.: "FIAT Siena • Veículo"). */
  label: string;
  /** Valor escrito no input ao escolher a opção. Default: `label`. */
  inputValue?: string;
  description?: string;
};

export type AutocompleteProps = {
  options: AutocompleteOption[];
  value: string;
  onValueChange: (value: string) => void;
  /** Disparado ao escolher uma opção da lista (além de onValueChange). */
  onSelectOption?: (option: AutocompleteOption) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  name?: string;
  id?: string;
  className?: string;
  emptyMessage?: string;
  /** Limite de sugestões visíveis. Default 8. */
  maxSuggestions?: number;
  prefix?: ReactNode;
  /** Filtra opções localmente. Default: inclui label/value case-insensitive. */
  filterOption?: (option: AutocompleteOption, query: string) => boolean;
  fieldProps?: Omit<FieldProps, 'value' | 'onChange' | 'label' | 'prefix' | 'id' | 'name'>;
};

function defaultFilter(option: AutocompleteOption, query: string): boolean {
  const q = query.trim().toLowerCase();

  if (!q) {
    return true;
  }

  return (
    option.label.toLowerCase().includes(q) ||
    option.value.toLowerCase().includes(q) ||
    (option.inputValue?.toLowerCase().includes(q) ?? false) ||
    (option.description?.toLowerCase().includes(q) ?? false)
  );
}

/**
 * Campo de texto com lista de sugestões filtráveis.
 * Não substitui Select — use quando o usuário pode digitar livremente.
 */
export function Autocomplete({
  options,
  value,
  onValueChange,
  onSelectOption,
  label,
  placeholder,
  disabled = false,
  name,
  id,
  className,
  emptyMessage = 'Nenhuma sugestão',
  maxSuggestions = 8,
  prefix,
  filterOption = defaultFilter,
  fieldProps,
}: AutocompleteProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const listId = `${inputId}-listbox`;
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);

  const suggestions = useMemo(() => {
    return options.filter((option) => filterOption(option, value)).slice(0, maxSuggestions);
  }, [options, value, filterOption, maxSuggestions]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  useEffect(() => {
    setHighlight(0);
  }, [value, open]);

  function commitOption(option: AutocompleteOption) {
    onValueChange(option.inputValue ?? option.label);
    onSelectOption?.(option);
    setOpen(false);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!open && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      setOpen(true);
      return;
    }

    if (!open) {
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlight((current) => Math.min(current + 1, Math.max(suggestions.length - 1, 0)));
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlight((current) => Math.max(current - 1, 0));
      return;
    }

    if (event.key === 'Enter' && suggestions[highlight]) {
      event.preventDefault();
      commitOption(suggestions[highlight]!);
      return;
    }

    if (event.key === 'Escape') {
      setOpen(false);
    }
  }

  const showList = open && !disabled;

  return (
    <div ref={rootRef} className={cn(styles.autocomplete, className)}>
      <Field
        {...fieldProps}
        id={inputId}
        name={name}
        label={label}
        prefix={prefix}
        placeholder={placeholder}
        disabled={disabled}
        value={value}
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        onChange={(event) => {
          onValueChange(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />

      {showList ? (
        <ul id={listId} role="listbox" className={styles.autocomplete__list}>
          {suggestions.length === 0 ? (
            <li className={styles.autocomplete__empty}>{emptyMessage}</li>
          ) : (
            suggestions.map((option, index) => (
              <li key={option.value} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={index === highlight}
                  className={cn(
                    styles.autocomplete__option,
                    index === highlight && styles['autocomplete__option--active']
                  )}
                  onMouseEnter={() => setHighlight(index)}
                  onClick={() => commitOption(option)}
                >
                  <span className={styles.autocomplete__optionLabel}>
                    {option.label}
                    {option.description ? (
                      <span className={styles.autocomplete__optionMeta}>
                        {' '}
                        • {option.description}
                      </span>
                    ) : null}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
