import { makeAutoObservable, runInAction } from 'mobx';
import { getUserRequest } from '../../../domains/auth/auth.services';
import { IUser } from '../../../domains/auth/auth.types';
import {
  clearPersist,
  disposePersist,
  isHydrated,
  isPersisting,
  persistence,
  rehydrateStore,
  startPersist,
  stopPersist,
} from 'mobx-persist-store';
import { mobxPersistStorageAdapter } from '../../../utils/mobx.utils';

export class UserProfilesPageStore {
  user: IUser | null = null;

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });

    persistence({
      name: 'UserProfilesPageStore',
      properties: ['user'],
      adapter: mobxPersistStorageAdapter,
      reactionOptions: {
        delay: 200,
      },
    })(this);
  }

  get isHydrated(): boolean {
    return isHydrated(this);
  }

  get isPersisting(): boolean {
    return isPersisting(this);
  }

  async clearStore(): Promise<void> {
    await clearPersist(this);
  }

  stopPersist(): void {
    stopPersist(this);
  }

  startPersist(): void {
    startPersist(this);
  }

  disposePersist(): void {
    disposePersist(this);
  }

  async rehydrateStore(): Promise<void> {
    await rehydrateStore(this);
  }

  async loadRandomUser(): Promise<void> {
    const { data } = await getUserRequest();

    if (data) {
      runInAction(() => {
        this.user = data.results[0];
      });
    }
  }
}
