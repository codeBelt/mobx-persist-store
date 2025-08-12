import { PersistStoreMap } from './PersistStoreMap';

export const startPersisting = <T extends object>(target: T): void => {
  PersistStoreMap.get(target)?.startPersisting();
};
