import { makeObservable, observable, runInAction } from 'mobx';
import { clearPersistedStore, configurePersistable, makePersistable } from './index';

class Store {
  value = 0;
  constructor() {
    makeObservable(this, { value: observable });
  }
}

describe('clearPersistedStore wrapper', () => {
  beforeEach(() => configurePersistable({ storage: localStorage, stringify: true }));

  test('clears persisted content from storage', async () => {
    const store = new Store();
    await makePersistable(store, { name: 'clear-persisted-store', properties: ['value'] });

    runInAction(() => {
      store.value = 42;
    });

    expect(localStorage.getItem('clear-persisted-store')).toBeTruthy();

    await clearPersistedStore(store);
    expect(localStorage.getItem('clear-persisted-store')).toBeNull();
  });
});
