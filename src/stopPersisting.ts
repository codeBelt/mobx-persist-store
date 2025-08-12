import { PersistStoreMap } from './PersistStoreMap';

export const stopPersisting = <T extends object>(target: T): void => {
  PersistStoreMap.get(target)?.stopPersisting();
};
