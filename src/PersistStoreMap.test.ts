/** @jest-environment jsdom */
import { describe, test, expect, beforeEach } from 'vitest';
import { makeObservable, observable } from 'mobx';
import { PersistStoreMap, configurePersistable, makePersistable, stopPersisting } from './index';

class Store {
  value = 0;
  constructor() {
    makeObservable(this, { value: observable });
  }
}

describe('PersistStoreMap', () => {
  beforeEach(() => {
    PersistStoreMap.clear();
    configurePersistable({ storage: localStorage, stringify: false });
  });

  test('tracks instances by target', async () => {
    const a = new Store();
    const b = new Store();

    const pa = await makePersistable(a, { name: 'a', properties: ['value'] });
    const pb = await makePersistable(b, { name: 'b', properties: ['value'] });

    expect(PersistStoreMap.get(a)).toBe(pa);
    expect(PersistStoreMap.get(b)).toBe(pb);

    stopPersisting(a);
    expect(PersistStoreMap.get(a)).toBeUndefined();
    expect(PersistStoreMap.get(b)).toBe(pb);
  });
});
