import { PersistStoreMap } from './PersistStoreMap';

export const clearPersistedStore = async <T extends object>(target: T): Promise<void> => {
  await PersistStoreMap.get(target)?.clearPersistedStore();
};
