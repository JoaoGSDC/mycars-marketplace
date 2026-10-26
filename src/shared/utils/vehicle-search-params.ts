/**
 * Contrato de busca de veículos — URL é a fonte de verdade.
 * Parse tolera valores inválidos (ignora). Serialize omite padrões e ordena chaves.
 */

export const VEHICLE_SEARCH_PATH = '/veiculos';

export const VEHICLE_CONDITIONS = ['novo', 'seminovo', 'usado'] as const;
export type VehicleSearchCondition = (typeof VEHICLE_CONDITIONS)[number];

export const VEHICLE_FUELS = ['gasolina', 'etanol', 'flex', 'diesel', 'eletrico', 'hibrido'] as const;
export type VehicleSearchFuel = (typeof VEHICLE_FUELS)[number];

export const VEHICLE_TRANSMISSIONS = ['manual', 'automatico', 'cvt', 'automatizado'] as const;
export type VehicleSearchTransmission = (typeof VEHICLE_TRANSMISSIONS)[number];

export const VEHICLE_BODIES = ['hatch', 'sedan', 'suv', 'picape', 'utilitario'] as const;
export type VehicleSearchBody = (typeof VEHICLE_BODIES)[number];

export const VEHICLE_SORTS = ['recentes', 'menor-preco', 'maior-preco', 'menor-km'] as const;
export type VehicleSearchSort = (typeof VEHICLE_SORTS)[number];

export const DEFAULT_VEHICLE_SORT: VehicleSearchSort = 'recentes';
export const DEFAULT_VEHICLE_PAGE = 1;

/** Faixas de preço predefinidas do hero (reais). */
export const PRICE_RANGE_PRESETS = [
  { id: 'ate-30', label: 'Até R$ 30 mil', min: undefined, max: 30_000 },
  { id: '30-50', label: 'R$ 30 a 50 mil', min: 30_000, max: 50_000 },
  { id: '50-80', label: 'R$ 50 a 80 mil', min: 50_000, max: 80_000 },
  { id: '80-120', label: 'R$ 80 a 120 mil', min: 80_000, max: 120_000 },
  { id: '120-200', label: 'R$ 120 a 200 mil', min: 120_000, max: 200_000 },
  { id: 'acima-200', label: 'Acima de R$ 200 mil', min: 200_000, max: undefined },
] as const;

export type VehicleSearchParams = {
  q?: string;
  condicao?: VehicleSearchCondition;
  marca: string[];
  modelo: string[];
  precoMin?: number;
  precoMax?: number;
  kmMin?: number;
  kmMax?: number;
  anoMin?: number;
  anoMax?: number;
  combustivel: VehicleSearchFuel[];
  cambio: VehicleSearchTransmission[];
  carroceria: VehicleSearchBody[];
  local?: string;
  ordem: VehicleSearchSort;
  pagina: number;
};

export function createEmptyVehicleSearchParams(): VehicleSearchParams {
  return {
    marca: [],
    modelo: [],
    combustivel: [],
    cambio: [],
    carroceria: [],
    ordem: DEFAULT_VEHICLE_SORT,
    pagina: DEFAULT_VEHICLE_PAGE,
  };
}

function isIn<T extends string>(value: string, list: readonly T[]): value is T {
  return (list as readonly string[]).includes(value);
}

function parsePositiveInt(raw: string | null): number | undefined {
  if (raw === null || raw === '') {
    return undefined;
  }

  const n = Number.parseInt(raw, 10);

  if (!Number.isFinite(n) || n < 0) {
    return undefined;
  }

  return n;
}

function parsePage(raw: string | null): number {
  const n = parsePositiveInt(raw);

  if (n === undefined || n < 1) {
    return DEFAULT_VEHICLE_PAGE;
  }

  return n;
}

function getAll(params: URLSearchParams, key: string): string[] {
  return params
    .getAll(key)
    .map((v) => v.trim())
    .filter(Boolean);
}

/** Interpreta query string / URLSearchParams; ignora valores inválidos. */
export function parseVehicleSearchParams(input: string | URLSearchParams): VehicleSearchParams {
  const params = typeof input === 'string' ? new URLSearchParams(input) : input;
  const result = createEmptyVehicleSearchParams();

  const q = params.get('q')?.trim();

  if (q) {
    result.q = q;
  }

  const condicao = params.get('condicao')?.trim();

  if (condicao && isIn(condicao, VEHICLE_CONDITIONS)) {
    result.condicao = condicao;
  }

  result.marca = getAll(params, 'marca');
  result.modelo = getAll(params, 'modelo').filter((m) => m.includes(':'));

  result.precoMin = parsePositiveInt(params.get('preco_min'));
  result.precoMax = parsePositiveInt(params.get('preco_max'));
  result.kmMin = parsePositiveInt(params.get('km_min'));
  result.kmMax = parsePositiveInt(params.get('km_max'));
  result.anoMin = parsePositiveInt(params.get('ano_min'));
  result.anoMax = parsePositiveInt(params.get('ano_max'));

  result.combustivel = getAll(params, 'combustivel').filter((v): v is VehicleSearchFuel => isIn(v, VEHICLE_FUELS));
  result.cambio = getAll(params, 'cambio').filter((v): v is VehicleSearchTransmission =>
    isIn(v, VEHICLE_TRANSMISSIONS)
  );
  result.carroceria = getAll(params, 'carroceria').filter((v): v is VehicleSearchBody => isIn(v, VEHICLE_BODIES));

  const local = params.get('local')?.trim();

  if (local && /^[a-z0-9]+(?:-[a-z0-9]+)*-[a-z]{2}$/i.test(local)) {
    result.local = local.toLowerCase();
  }

  const ordem = params.get('ordem')?.trim();

  if (ordem && isIn(ordem, VEHICLE_SORTS)) {
    result.ordem = ordem;
  }

  result.pagina = parsePage(params.get('pagina'));

  return result;
}

const SERIALIZE_ORDER = [
  'q',
  'condicao',
  'marca',
  'modelo',
  'preco_min',
  'preco_max',
  'km_min',
  'km_max',
  'ano_min',
  'ano_max',
  'combustivel',
  'cambio',
  'carroceria',
  'local',
  'ordem',
  'pagina',
] as const;

/** Serializa com ordem estável; omite defaults e arrays vazios. */
export function serializeVehicleSearchParams(input: Partial<VehicleSearchParams>): string {
  const params = new URLSearchParams();
  const data: VehicleSearchParams = {
    ...createEmptyVehicleSearchParams(),
    ...input,
    marca: input.marca ?? [],
    modelo: input.modelo ?? [],
    combustivel: input.combustivel ?? [],
    cambio: input.cambio ?? [],
    carroceria: input.carroceria ?? [],
  };

  const appendSorted = (key: string, values: string[]) => {
    [...values].sort((a, b) => a.localeCompare(b)).forEach((v) => params.append(key, v));
  };

  for (const key of SERIALIZE_ORDER) {
    switch (key) {
      case 'q':
        if (data.q) {
          params.set('q', data.q);
        }

        break;
      case 'condicao':
        if (data.condicao) {
          params.set('condicao', data.condicao);
        }

        break;
      case 'marca':
        appendSorted('marca', data.marca);
        break;
      case 'modelo':
        appendSorted('modelo', data.modelo);
        break;
      case 'preco_min':
        if (data.precoMin !== undefined) {
          params.set('preco_min', String(data.precoMin));
        }

        break;
      case 'preco_max':
        if (data.precoMax !== undefined) {
          params.set('preco_max', String(data.precoMax));
        }

        break;
      case 'km_min':
        if (data.kmMin !== undefined) {
          params.set('km_min', String(data.kmMin));
        }

        break;
      case 'km_max':
        if (data.kmMax !== undefined) {
          params.set('km_max', String(data.kmMax));
        }

        break;
      case 'ano_min':
        if (data.anoMin !== undefined) {
          params.set('ano_min', String(data.anoMin));
        }

        break;
      case 'ano_max':
        if (data.anoMax !== undefined) {
          params.set('ano_max', String(data.anoMax));
        }

        break;
      case 'combustivel':
        appendSorted('combustivel', data.combustivel);
        break;
      case 'cambio':
        appendSorted('cambio', data.cambio);
        break;
      case 'carroceria':
        appendSorted('carroceria', data.carroceria);
        break;
      case 'local':
        if (data.local) {
          params.set('local', data.local);
        }

        break;
      case 'ordem':
        if (data.ordem !== DEFAULT_VEHICLE_SORT) {
          params.set('ordem', data.ordem);
        }

        break;
      case 'pagina':
        if (data.pagina !== DEFAULT_VEHICLE_PAGE) {
          params.set('pagina', String(data.pagina));
        }

        break;
      default:
        break;
    }
  }

  return params.toString();
}

/** Monta pathname + query para a listagem. */
export function buildVehicleSearchHref(input: Partial<VehicleSearchParams> = {}): string {
  const qs = serializeVehicleSearchParams(input);

  return qs ? `${VEHICLE_SEARCH_PATH}?${qs}` : VEHICLE_SEARCH_PATH;
}

export function pricePresetToBounds(presetId: string): { precoMin?: number; precoMax?: number } {
  const preset = PRICE_RANGE_PRESETS.find((p) => p.id === presetId);

  if (!preset) {
    return {};
  }

  return {
    precoMin: preset.min,
    precoMax: preset.max,
  };
}
