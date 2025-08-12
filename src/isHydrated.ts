import { PersistStoreMap } from './PersistStoreMap';

export const isHydrated = <T extends object>(target: T): boolean => {
  return PersistStoreMap.get(target)?.isHydrated ?? false;
};
