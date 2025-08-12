import {
  action,
  IReactionDisposer,
  isAction,
  isComputedProp,
  makeObservable,
  observable,
  ObservableMap,
  ObservableSet,
  reaction,
  runInAction,
  toJS,
  comparer,
} from 'mobx';
import { PersistStoreMap } from './PersistStoreMap';
import { PersistenceStorageOptions, ReactionOptions } from './types';
import { StorageAdapter } from './StorageAdapter';
import { mpsConfig, mpsReactionOptions } from './configurePersistable';
import { makeSerializableProperties, SerializableProperty } from './serializableProperty';
import {
  actionPersistWarningIf,
  computedPersistWarningIf,
  consoleDebug,
  invalidStorageAdaptorWarningIf,
  isArrayForMap,
  isArrayForSet,
} from './utils';

export class PersistStore<T, P extends keyof T> {
  private cancelWatch: IReactionDisposer | null = null;
  private properties: SerializableProperty<T, P>[] = [];
  private reactionOptions: ReactionOptions = {};
  private storageAdapter: StorageAdapter | null = null;
  private target: T | null = null;
  private version: number | undefined = undefined;
  private readonly debugMode: boolean = false;
  private propertyMeta = new Map<P, { isComputed: boolean; isAction: boolean }>();
  private pendingWrite: Promise<void> | null = null;
  private enqueuedData: Record<P, unknown> | null = null;

  public isHydrated = false;
  public isPersisting = false;
  public readonly storageName: string = '';

  constructor(target: T, options: PersistenceStorageOptions<T, P>, reactionOptions: ReactionOptions = {}) {
    this.target = target;
    this.storageName = options.name;
    this.version = options.version ?? mpsConfig.version;
    this.properties = makeSerializableProperties(options.properties);
    const mergedReactionOptions: ReactionOptions = Object.assign(
      { fireImmediately: true },
      mpsReactionOptions,
      reactionOptions
    );

    if (mergedReactionOptions.optimizeWrites) {
      // Only apply conservative defaults if not explicitly set
      if (typeof mergedReactionOptions.delay !== 'number') {
        mergedReactionOptions.delay = 100;
      }
      if (typeof mergedReactionOptions.fireImmediately === 'undefined') {
        mergedReactionOptions.fireImmediately = false;
      }
      if (!mergedReactionOptions.equals) {
        mergedReactionOptions.equals = comparer.structural;
      }
    }

    this.reactionOptions = mergedReactionOptions;
    this.debugMode = options.debugMode ?? mpsConfig.debugMode ?? false;
    this.storageAdapter = new StorageAdapter({
      version: this.version,
      expireIn: options.expireIn ?? mpsConfig.expireIn,
      removeOnExpiration: options.removeOnExpiration ?? mpsConfig.removeOnExpiration ?? true,
      stringify: options.stringify ?? mpsConfig.stringify ?? true,
      storage: options.storage ? options.storage : mpsConfig.storage,
      debugMode: this.debugMode,
    });

    // Cache per-property metadata and warn once (not on every reaction run)
    const metaTarget: any = this.target;
    this.properties.forEach((property) => {
      const isComputed = isComputedProp(metaTarget, property.key);
      const isAct = isAction(metaTarget[property.key]);
      this.propertyMeta.set(property.key, { isComputed, isAction: isAct });
      computedPersistWarningIf(isComputed, String(property.key));
      actionPersistWarningIf(isAct, String(property.key));
    });

    makeObservable(
      this,
      {
        clearPersistedStore: action,
        hydrateStore: action,
        isHydrated: observable,
        isPersisting: observable,
        pausePersisting: action,
        startPersisting: action,
        stopPersisting: action,
      },
      { autoBind: true, deep: false }
    );

    invalidStorageAdaptorWarningIf(this.storageAdapter.options.storage, this.storageName);

    consoleDebug(this.debugMode, `${this.storageName} - (makePersistable)`, {
      properties: this.properties,
      storageAdapter: this.storageAdapter,
      reactionOptions: this.reactionOptions,
    });
  }

  public async init(): Promise<PersistStore<T, P>> {
    await this.hydrateStore();

    this.startPersisting();

    return this;
  }

  public async hydrateStore(): Promise<void> {
    // If the user calls stopPersist and then rehydrateStore we don't want to automatically call startPersist below
    const isBeingWatched = Boolean(this.cancelWatch);

    if (this.isPersisting) {
      this.pausePersisting();
    }

    runInAction(() => {
      this.isHydrated = false;
      consoleDebug(this.debugMode, `${this.storageName} - (hydrateStore) isHydrated:`, this.isHydrated);
    });

    if (this.storageAdapter && this.target) {
      // Ensure any pending writes are flushed before reading from storage
      if (this.pendingWrite) {
        try {
          await this.pendingWrite;
        } catch (e) {
          consoleDebug(this.debugMode, `${this.storageName} - pending write flush failed`, e);
        }
      }

      const data: Record<P, unknown> | undefined = await this.storageAdapter.getItem<Record<P, unknown>>(
        this.storageName
      );

      // Reassigning so TypeScript doesn't complain (Object is possibly 'null') about this.target within forEach
      const target: any = this.target;

      if (data) {
        runInAction(() => {
          this.properties.forEach((property) => {
            const allowPropertyHydration = [property.key in target, typeof data[property.key] !== 'undefined'].every(
              Boolean
            );

            if (allowPropertyHydration) {
              const propertyData = data[property.key];

              if (target[property.key] instanceof ObservableMap && isArrayForMap(propertyData)) {
                const deserialized = property.deserialize(new Map(propertyData));
                if (deserialized instanceof Map) {
                  const map = target[property.key] as ObservableMap<any, any>;
                  map.clear();
                  deserialized.forEach((v, k) => map.set(k, v));
                } else {
                  target[property.key] = deserialized;
                }
              } else if (target[property.key] instanceof ObservableSet && isArrayForSet(propertyData)) {
                const deserialized = property.deserialize(new Set(propertyData));
                if (deserialized instanceof Set) {
                  const set = target[property.key] as ObservableSet<any>;
                  // replace maintains observers
                  set.replace(Array.from(deserialized.values()));
                } else {
                  target[property.key] = deserialized;
                }
              } else {
                target[property.key] = property.deserialize(propertyData);
              }
            }
          });
        });
      }
    }

    runInAction(() => {
      this.isHydrated = true;
      consoleDebug(this.debugMode, `${this.storageName} - isHydrated:`, this.isHydrated);
    });

    if (isBeingWatched) {
      this.startPersisting();
    }
  }

  private enqueueWrite(data: Record<P, unknown>): void {
    this.enqueuedData = data;
    if (this.pendingWrite) return;

    this.pendingWrite = (async () => {
      while (this.enqueuedData) {
        const next = this.enqueuedData;
        this.enqueuedData = null;
        try {
          if (this.storageAdapter) {
            await this.storageAdapter.setItem(this.storageName, next as Record<string, unknown> as any);
          }
        } catch (error) {
          consoleDebug(this.debugMode, `${this.storageName} - setItem failed`, error);
        }
      }
      this.pendingWrite = null;
    })();
  }

  public startPersisting(): void {
    if (!this.storageAdapter || !this.target || this.cancelWatch) {
      return;
    }

    // Reassigning so TypeScript doesn't complain (Object is possibly 'null') about and this.target within reaction
    const target: any = this.target;

    this.cancelWatch = reaction(
      () => {
        const propertiesToWatch = {} as Record<P, unknown>;

        this.properties.forEach((property) => {
          const meta = this.propertyMeta.get(property.key) || { isComputed: false, isAction: false };

          if (!meta.isComputed && !meta.isAction) {
            let propertyData = property.serialize(target[property.key]);

            if (propertyData instanceof ObservableMap) {
              const mapArray: any[] = [];
              propertyData.forEach((v, k) => {
                mapArray.push([k, toJS(v)]);
              });
              propertiesToWatch[property.key] = mapArray;
              return;
            }

            if (propertyData instanceof ObservableSet) {
              propertiesToWatch[property.key] = Array.from(propertyData).map(toJS);
              return;
            }

            propertiesToWatch[property.key] = toJS(propertyData);
          }
        });

        return propertiesToWatch;
      },
      (dataToSave) => {
        if (this.storageAdapter) {
          // Coalesce and serialize writes
          this.enqueueWrite(dataToSave as Record<P, unknown>);
        }
      },
      this.reactionOptions
    );

    this.isPersisting = true;

    consoleDebug(this.debugMode, `${this.storageName} - (startPersisting) isPersisting:`, this.isPersisting);
  }

  public pausePersisting(): void {
    this.isPersisting = false;

    consoleDebug(this.debugMode, `${this.storageName} - pausePersisting (isPersisting):`, this.isPersisting);

    if (this.cancelWatch) {
      this.cancelWatch();
      this.cancelWatch = null;
    }
  }

  public stopPersisting(): void {
    this.pausePersisting();

    consoleDebug(this.debugMode, `${this.storageName} - (stopPersisting)`);

    PersistStoreMap.delete(this.target);
    try {
      // Lazy import to avoid circular at module load; but it's a value import so accepted.
      // If not available, skip silently.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { PersistStoreNameMap } = require('./PersistStoreMap') as typeof import('./PersistStoreMap');
      if (PersistStoreNameMap.get(this.storageName) === (this as unknown as PersistStore<any, any>)) {
        PersistStoreNameMap.delete(this.storageName);
      }
    } catch {}

    this.cancelWatch = null;
    this.properties = [];
    this.reactionOptions = {};
    this.storageAdapter = null;
    this.target = null;
  }

  public async clearPersistedStore(): Promise<void> {
    if (this.storageAdapter) {
      consoleDebug(this.debugMode, `${this.storageName} - (clearPersistedStore)`);

      await this.storageAdapter.removeItem(this.storageName);
    }
  }

  public async getPersistedStore<T extends Record<string, any>>(): Promise<T | null> {
    if (this.storageAdapter) {
      consoleDebug(this.debugMode, `${this.storageName} - (getPersistedStore)`);

      // @ts-ignore
      return this.storageAdapter.getItem(this.storageName);
    }

    return null;
  }
}
