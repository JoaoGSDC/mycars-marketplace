'use client';

import { X } from 'lucide-react';

import { IconButton } from '@components/ui/IconButton';
import { Select, SelectItem } from '@components/ui/Select';
import { cn } from '@utils/cn';

import { FilterCard } from '../FilterCard';
import styles from './styles.module.css';

export type MakeModelRow = {
  id: string;
  make: string;
  models: string[];
};

export type MakeModelFilterProps = {
  rows: MakeModelRow[];
  makeOptions: { value: string; label: string }[];
  modelOptionsByMake: Record<string, { value: string; label: string }[]>;
  onMakeChange: (rowId: string, make: string) => void;
  onModelChange: (rowId: string, modelIndex: number, model: string) => void;
  onAddModel: (rowId: string) => void;
  onRemoveModel: (rowId: string, modelIndex: number) => void;
  onRemoveRow: (rowId: string) => void;
  onAddRow?: () => void;
  onClear?: () => void;
  className?: string;
};

export function MakeModelFilter({
  rows,
  makeOptions,
  modelOptionsByMake,
  onMakeChange,
  onModelChange,
  onAddModel,
  onRemoveModel,
  onRemoveRow,
  onAddRow,
  onClear,
  className,
}: MakeModelFilterProps) {
  return (
    <FilterCard title="Marca e modelo" onClear={onClear} className={className}>
      <div className={styles.makeModelFilter}>
        {rows.map((row) => {
          const modelOptions = modelOptionsByMake[row.make] ?? [];

          return (
            <div key={row.id} className={styles.makeModelFilter__row}>
              <div className={styles.makeModelFilter__rowHead}>
                <Select
                  label="Marca"
                  placeholder="Marca"
                  value={row.make || undefined}
                  onValueChange={(value) => {
                    onMakeChange(row.id, value);
                  }}
                >
                  {makeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </Select>
                <IconButton
                  variant="square-outline"
                  size="sm"
                  aria-label="Remover marca"
                  onClick={() => {
                    onRemoveRow(row.id);
                  }}
                  icon={<X className="size-4" strokeWidth={1.5} />}
                />
              </div>
              {row.models.map((model, modelIndex) => (
                <div key={`${row.id}-${modelIndex}`} className={styles.makeModelFilter__modelLine}>
                  <Select
                    label="Modelo"
                    placeholder="Modelo"
                    value={model || undefined}
                    onValueChange={(next) => {
                      onModelChange(row.id, modelIndex, next);
                    }}
                  >
                    {modelOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </Select>
                  <IconButton
                    variant="square-outline"
                    size="sm"
                    aria-label="Remover modelo"
                    onClick={() => {
                      onRemoveModel(row.id, modelIndex);
                    }}
                    icon={<X className="size-4" strokeWidth={1.5} />}
                  />
                </div>
              ))}
              <button
                type="button"
                className={styles.makeModelFilter__addModel}
                onClick={() => {
                  onAddModel(row.id);
                }}
              >
                + Adicionar modelo
              </button>
            </div>
          );
        })}
        {onAddRow ? (
          <button type="button" className={cn(styles.makeModelFilter__addRow)} onClick={onAddRow}>
            + Adicionar marca
          </button>
        ) : null}
      </div>
    </FilterCard>
  );
}
