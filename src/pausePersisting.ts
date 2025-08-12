import { PersistStoreMap } from './PersistStoreMap';

export const pausePersisting = <T extends object>(target: T): void => {
  PersistStoreMap.get(target)?.pausePersisting();
};
