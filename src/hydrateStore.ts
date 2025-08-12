import { PersistStoreMap } from './PersistStoreMap';

export const hydrateStore = async <T extends object>(target: T): Promise<void> => {
  await PersistStoreMap.get(target)?.hydrateStore();
};
