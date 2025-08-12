/** @jest-environment jsdom */
import { makeObservable, observable } from 'mobx';
import { configurePersistable, makePersistable, pausePersisting, startPersisting, isPersisting } from './index';

class Store {
  value = 0;
  constructor() {
    makeObservable(this, { value: observable });
  }
}

describe('startPersisting wrapper', () => {
  beforeEach(() => configurePersistable({ storage: localStorage, stringify: false }));

  test('starts persistence', async () => {
    const store = new Store();
    await makePersistable(store, { name: 'start', properties: ['value'] });
    pausePersisting(store);

    expect(isPersisting(store)).toBe(false);
    startPersisting(store);
    expect(isPersisting(store)).toBe(true);
  });
});
