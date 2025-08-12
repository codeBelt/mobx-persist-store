import { describe, test, expect, beforeEach } from 'vitest';
import { makeObservable, observable } from 'mobx';
import {
  configurePersistable,
  isPersisting,
  makePersistable,
  pausePersisting,
  startPersisting,
  stopPersisting,
} from './index';

class Store {
  value = 0;
  constructor() {
    makeObservable(this, { value: observable });
  }
}

describe('isPersisting and lifecycle', () => {
  beforeEach(() => configurePersistable({ storage: localStorage, stringify: false }));

  test('tracks lifecycle changes', async () => {
    const store = new Store();
    await makePersistable(store, { name: 'lifecycle', properties: ['value'] });

    expect(isPersisting(store)).toBe(true);

    pausePersisting(store);
    expect(isPersisting(store)).toBe(false);

    startPersisting(store);
    expect(isPersisting(store)).toBe(true);

    stopPersisting(store);
    expect(isPersisting(store)).toBe(false);

    // further startPersisting should be a no-op after stop
    startPersisting(store);
    expect(isPersisting(store)).toBe(false);
  });
});
