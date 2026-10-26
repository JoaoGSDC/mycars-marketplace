'use client';

/**
 * Favoritos provisórios no localStorage (sem conta de consumidor).
 * Seguro para SSR: snapshot no servidor e na 1ª pintura é []; hidrata via microtask.
 */

import { useCallback, useSyncExternalStore } from 'react';

const STORAGE_KEY = 'mycars:favorites:v1';

type FavoritesStore = {
  ids: string[];
  hydrated: boolean;
  listeners: Set<() => void>;
};

const store: FavoritesStore = {
  ids: [],
  hydrated: false,
  listeners: new Set(),
};

function emit() {
  store.listeners.forEach((listener) => {
    listener();
  });
}

function readStorage(): string[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((id): id is string => typeof id === 'string');
  } catch {
    return [];
  }
}

function writeStorage(ids: string[]) {
  store.ids = ids;
  store.hydrated = true;

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  }

  emit();
}

function ensureHydrated() {
  if (typeof window === 'undefined' || store.hydrated) {
    return;
  }

  store.ids = readStorage();
  store.hydrated = true;
}

function subscribe(listener: () => void) {
  store.listeners.add(listener);

  queueMicrotask(() => {
    const before = store.ids;
    ensureHydrated();

    if (before !== store.ids || store.hydrated) {
      emit();
    }
  });

  return () => {
    store.listeners.delete(listener);
  };
}

function getSnapshot() {
  return store.ids;
}

/** Referência estável — `getServerSnapshot` não pode retornar array novo a cada chamada. */
const SERVER_SNAPSHOT: string[] = [];

function getServerSnapshot(): string[] {
  return SERVER_SNAPSHOT;
}

export function useFavorites() {
  const ids = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggle = useCallback((vehicleId: string) => {
    ensureHydrated();
    const next = store.ids.includes(vehicleId) ? store.ids.filter((id) => id !== vehicleId) : [...store.ids, vehicleId];

    writeStorage(next);
  }, []);

  const has = useCallback((vehicleId: string) => ids.includes(vehicleId), [ids]);

  return {
    ids,
    count: ids.length,
    has,
    toggle,
    hydrated: store.hydrated,
  };
}
