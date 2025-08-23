import { describe, test, expect, beforeEach } from 'vitest';
import { makeObservable, observable } from 'mobx';
import { configurePersistable, isHydrated, makePersistable } from './index';

class Store {
  value = 0;
  constructor() {
    makeObservable(this, { value: observable });
  }
}

describe('isHydrated', () => {
  beforeEach(() => configurePersistable({ storage: localStorage, stringify: false }));

  test('returns false for unknown targets', () => {
    expect(isHydrated(new Store())).toBe(false);
  });

  test('returns true after hydration', async () => {
    const store = new Store();
    await makePersistable(store, { name: 's', properties: ['value'] });

    expect(isHydrated(store)).toBe(true);
  });
});
