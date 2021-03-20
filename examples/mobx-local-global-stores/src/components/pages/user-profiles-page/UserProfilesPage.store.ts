import { makeAutoObservable, runInAction } from 'mobx';
import { getUserRequest } from '../../../domains/auth/auth.services';
import { IUser } from '../../../domains/auth/auth.types';
import { MobxStorePersist, persistence } from 'mobx-persist-store';
import { mobxPersistStorageAdapter } from '../../../utils/mobx.utils';

export class UserProfilesPageStore {
  user: IUser | null = null;
  storePersist: MobxStorePersist<this> = persistence({
    name: 'UserProfilesPageStore',
    properties: ['user'],
    adapter: mobxPersistStorageAdapter,
    reactionOptions: {
      delay: 200,
    },
  })(this);

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  get isHydrated(): boolean {
    return this.storePersist.isHydrated;
  }

  get isPersisting(): boolean {
    return this.storePersist.isPersisting;
  }

  async clearStore(): Promise<void> {
    await this.storePersist.clearPersist();
  }

  stopPersist(): void {
    this.storePersist.stopPersist();
  }

  startPersist(): void {
    this.storePersist.startPersist();
  }

  disposePersist(): void {
    this.storePersist.disposePersist();
  }

  async rehydrateStore(): Promise<void> {
    await this.storePersist.rehydrateStore();
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
