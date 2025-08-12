import { PersistStoreMap } from './PersistStoreMap';

export const getPersistedStore = async <T extends Record<string, unknown>>(target: T): Promise<T | null> => {
  const store = PersistStoreMap.get(target as unknown as object);
  const result = store ? await store.getPersistedStore() : null;
  return (result as unknown as T) ?? null;
};
