import { PersistenceStorageOptions, ReactionOptions } from './types';
import { PersistStore } from './PersistStore';
import { PersistStoreMap, PersistStoreNameMap } from './PersistStoreMap';
import { duplicatedStoreWarningIf } from './utils';

const setMobxPersistStore = <T extends Record<string, unknown>, P extends keyof T>(
  target: T,
  persistStore: PersistStore<T, P>
) => {
  const existingWithSameName = PersistStoreNameMap.get(persistStore.storageName);
  if (existingWithSameName) {
    existingWithSameName.stopPersisting();
    // Remove old target binding (search and delete)
    // @ts-ignore Type 'IterableIterator<[any, PersistStore<any, any>]>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher.
    for (const [key, store] of PersistStoreMap.entries()) {
      if (store === existingWithSameName) {
        PersistStoreMap.delete(key);
        break;
      }
    }
  }

  PersistStoreNameMap.set(
    persistStore.storageName,
    persistStore as unknown as PersistStore<Record<string, unknown>, string>
  );
  PersistStoreMap.set(target, persistStore as unknown as PersistStore<Record<string, unknown>, string>);
};

export const makePersistable = async <T extends Record<string, unknown>, P extends keyof T>(
  target: T,
  storageOptions: PersistenceStorageOptions<T, P>,
  reactionOptions?: ReactionOptions
): Promise<PersistStore<T, P>> => {
  const mobxPersistStore = new PersistStore(target, storageOptions, reactionOptions);

  const hasPersistedStoreAlready = PersistStoreNameMap.has(mobxPersistStore.storageName);

  duplicatedStoreWarningIf(hasPersistedStoreAlready, mobxPersistStore.storageName);
  setMobxPersistStore(target, mobxPersistStore);

  return mobxPersistStore.init();
};
