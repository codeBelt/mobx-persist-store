/** @jest-environment jsdom */
import { makeObservable, observable, runInAction } from 'mobx';
import { configurePersistable, hydrateStore, makePersistable } from './index';

class Store {
  list: string[] = [];
  constructor() {
    makeObservable(this, { list: observable });
  }
}

describe('hydrateStore wrapper', () => {
  beforeEach(() => configurePersistable({ storage: localStorage, stringify: true }));

  test('rehydrates data from storage', async () => {
    const store = new Store();
    const ps = await makePersistable(store, { name: 'rehydrate', properties: ['list'] });

    runInAction(() => {
      store.list = ['a', 'b'];
    });

    // simulate clearing in-memory state
    ps.pausePersisting();
    runInAction(() => {
      store.list = [];
    });

    await hydrateStore(store);
    expect(store.list).toEqual(['a', 'b']);
  });
});
