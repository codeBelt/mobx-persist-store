import { makeAutoObservable } from 'mobx';
import { getCastsRequest, getShowRequest } from '../../../domains/shows/shows.services';
import { initialResponseStatus, mobxPersistStorageAdapter } from '../../../utils/mobx.utils';
import { ICast, IShow } from '../../../domains/shows/shows.types';
import { ApiResponse } from '../../../utils/http/http.types';
import { defaultShowId } from '../../../domains/shows/shows.constants';
import orderBy from 'lodash.orderby';
import { getGlobalStore } from '../../shared/global-store-provider/GlobalStoreProvider';
import { MobxStorePersist, persistence } from 'mobx-persist-store';

export class IndexPageStore {
  readonly globalStore = getGlobalStore();
  sortValue = '';
  showResults = initialResponseStatus<IShow | null>(null);
  castsResults = initialResponseStatus<ICast[]>([]);

  storePersist: MobxStorePersist<this>;

  constructor() {
    this.storePersist = persistence({
      name: 'IndexPageStore',
      properties: ['castsResults', 'showResults', 'sortValue'],
      adapter: mobxPersistStorageAdapter,
      reactionOptions: {
        delay: 200,
      },
    })(this);

    makeAutoObservable(this, {}, { autoBind: true });
  }

  get isHydrated(): boolean {
    return this.storePersist.isHydrated;
  }

  get isRequesting(): boolean {
    return [this.showResults.isRequesting, this.castsResults.isRequesting].some(Boolean);
  }

  get actors(): ICast[] {
    return orderBy(this.castsResults.data, (cast) => cast.person[this.sortValue], 'asc');
  }

  setSortOption(sortValue: string) {
    this.sortValue = sortValue;
  }

  dispose(): void {
    this.storePersist.dispose();
  }

  /**
   * Store initializer. Should only be called once.
   */
  *init() {
    yield Promise.all([this.loadShow(), this.loadCasts()]);
  }

  *loadShow() {
    const response: ApiResponse<IShow> = yield getShowRequest(defaultShowId);

    this.showResults = {
      data: this.showResults.data,
      isRequesting: false,
      ...response, // Overwrites the default data prop or adds an error. Also adds the statusCode.
    };
  }

  *loadCasts() {
    const response: ApiResponse<ICast[]> = yield getCastsRequest(defaultShowId);

    this.castsResults = {
      data: this.castsResults.data,
      isRequesting: false,
      ...response, // Overwrites the default data prop or adds an error. Also adds the statusCode.
    };
  }
}
