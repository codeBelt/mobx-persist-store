import { PersistStoreMap } from './PersistStoreMap';

export const isPersisting = <T extends object>(target: T): boolean => {
  return PersistStoreMap.get(target)?.isPersisting ?? false;
};
