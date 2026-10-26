import type { VehicleOwnership, VehicleCostType } from './membership';
import type { VehicleStatus } from './status';

export type VehicleListSort = 'entered_at' | 'asking_price' | 'days_in_stock';
export type SortDir = 'asc' | 'desc';

export type VehicleListFilters = {
  q?: string;
  status?: VehicleStatus;
  makeSlug?: string;
  modelSlug?: string;
  yearFrom?: number;
  yearTo?: number;
  ownership?: VehicleOwnership;
  sort?: VehicleListSort;
  sortDir?: SortDir;
  page?: number;
  pageSize?: number;
};

export type VehicleStatusCounts = Record<VehicleStatus, number> & { total: number };

export const VEHICLE_OWNERSHIP_LABELS: Record<VehicleOwnership, string> = {
  own: 'Próprio',
  consigned: 'Consignado',
};

export const VEHICLE_COST_TYPE_LABELS: Record<VehicleCostType, string> = {
  acquisition: 'Aquisição / entrada',
  transport: 'Transporte',
  repair: 'Reparo',
  detailing: 'Estética',
  other: 'Outro',
};

export const VEHICLE_CONDITION_LABELS = {
  new: 'Novo',
  seminew: 'Seminovo',
  used: 'Usado',
} as const;

export type VehicleCondition = keyof typeof VEHICLE_CONDITION_LABELS;

export const INVENTORY_FORM_STEPS = [
  { id: 'identification', label: 'Identificação' },
  { id: 'characteristics', label: 'Características' },
  { id: 'acquisition', label: 'Entrada e custos' },
  { id: 'photos', label: 'Fotografias' },
  { id: 'commercial', label: 'Comercial e revisão' },
] as const;

export type InventoryFormStepId = (typeof INVENTORY_FORM_STEPS)[number]['id'];
