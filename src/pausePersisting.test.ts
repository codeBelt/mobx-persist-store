import { describe, test, expect, beforeEach } from 'vitest';
import { makeObservable, observable } from 'mobx';
import { configurePersistable, makePersistable, pausePersisting, isPersisting } from './index';

class Store {
  value = 0;
  constructor() {
    makeObservable(this, { value: observable });
  }
}

describe('pausePersisting wrapper', () => {
  beforeEach(() => configurePersistable({ storage: localStorage, stringify: false }));

  test('pauses persistence', async () => {
    const store = new Store();
    await makePersistable(store, { name: 'pause', properties: ['value'] });

    expect(isPersisting(store)).toBe(true);
    pausePersisting(store);
    expect(isPersisting(store)).toBe(false);
  });
});
