/**
 * Contrato de busca do diretório público de lojas — URL é a fonte de verdade.
 */

export const STORE_DIRECTORY_PATH = '/lojas';

export const STORE_DIRECTORY_SORTS = ['relevancia', 'anuncios', 'nome'] as const;
export type StoreDirectorySort = (typeof STORE_DIRECTORY_SORTS)[number];

export const DEFAULT_STORE_DIRECTORY_SORT: StoreDirectorySort = 'relevancia';
export const DEFAULT_STORE_DIRECTORY_PAGE = 1;
export const STORE_DIRECTORY_PAGE_SIZE = 12;

export type StoreDirectoryParams = {
  q?: string;
  /** Slug `cidade-uf` (ex.: limeira-sp). Vazio = todas. */
  cidade?: string;
  ordem: StoreDirectorySort;
  pagina: number;
};

export function createEmptyStoreDirectoryParams(): StoreDirectoryParams {
  return {
    ordem: DEFAULT_STORE_DIRECTORY_SORT,
    pagina: DEFAULT_STORE_DIRECTORY_PAGE,
  };
}

function isSort(value: string): value is StoreDirectorySort {
  return (STORE_DIRECTORY_SORTS as readonly string[]).includes(value);
}

function parsePositiveInt(raw: string | null): number | undefined {
  if (raw === null || raw === '') {
    return undefined;
  }

  const n = Number.parseInt(raw, 10);

  if (!Number.isFinite(n) || n < 1) {
    return undefined;
  }

  return n;
}

export function parseStoreDirectoryParams(search: URLSearchParams): StoreDirectoryParams {
  const q = search.get('q')?.trim() || undefined;
  const cidade = search.get('cidade')?.trim() || undefined;
  const ordemRaw = search.get('ordem')?.trim() ?? '';
  const ordem = isSort(ordemRaw) ? ordemRaw : DEFAULT_STORE_DIRECTORY_SORT;
  const pagina = parsePositiveInt(search.get('pagina')) ?? DEFAULT_STORE_DIRECTORY_PAGE;

  return { q, cidade, ordem, pagina };
}

export function serializeStoreDirectoryParams(params: Partial<StoreDirectoryParams>): string {
  const sp = new URLSearchParams();

  if (params.q?.trim()) {
    sp.set('q', params.q.trim());
  }

  if (params.cidade?.trim()) {
    sp.set('cidade', params.cidade.trim());
  }

  if (params.ordem && params.ordem !== DEFAULT_STORE_DIRECTORY_SORT) {
    sp.set('ordem', params.ordem);
  }

  if (params.pagina && params.pagina > DEFAULT_STORE_DIRECTORY_PAGE) {
    sp.set('pagina', String(params.pagina));
  }

  return sp.toString();
}

export function buildStoreDirectoryHref(params: Partial<StoreDirectoryParams>): string {
  const qs = serializeStoreDirectoryParams(params);

  return qs ? `${STORE_DIRECTORY_PATH}?${qs}` : STORE_DIRECTORY_PATH;
}

export function mergeStoreDirectoryParams(
  current: StoreDirectoryParams,
  patch: Partial<StoreDirectoryParams>
): StoreDirectoryParams {
  const next: StoreDirectoryParams = {
    ...current,
    ...patch,
    ordem: patch.ordem ?? current.ordem,
    pagina: patch.pagina ?? current.pagina,
  };

  if ('q' in patch && !patch.q) {
    delete next.q;
  }

  if ('cidade' in patch && !patch.cidade) {
    delete next.cidade;
  }

  return next;
}
