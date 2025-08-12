/** @jest-environment jsdom */
import { makeObservable, observable } from 'mobx';
import { configurePersistable, makePersistable, stopPersisting, isPersisting, PersistStoreMap } from './index';

class Store {
  value = 0;
  constructor() {
    makeObservable(this, { value: observable });
  }
}

describe('stopPersisting wrapper', () => {
  beforeEach(() => configurePersistable({ storage: localStorage, stringify: false }));

  test('stops persistence and clears internals', async () => {
    const store = new Store();
    await makePersistable(store, { name: 'stop', properties: ['value'] });

    stopPersisting(store);
    expect(isPersisting(store)).toBe(false);
    expect(PersistStoreMap.get(store)).toBeUndefined();
  });
});
