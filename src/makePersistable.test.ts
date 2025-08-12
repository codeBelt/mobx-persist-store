/** @jest-environment jsdom */
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { makeObservable, observable } from 'mobx';

import { PersistStore, PersistStoreMap, configurePersistable, makePersistable } from './index';

class CounterStore {
  value = 0;
  constructor() {
    makeObservable(this, { value: observable });
  }
}

describe('makePersistable', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    configurePersistable({ storage: localStorage, stringify: true });
  });

  afterEach(() => {
    warnSpy.mockRestore();
    PersistStoreMap.clear();
  });

  test('registers store in PersistStoreMap and starts persisting', async () => {
    const store = new CounterStore();
    const ps = await makePersistable(store, { name: 'counter', properties: ['value'] });

    expect(PersistStoreMap.get(store)).toBe(ps);
    expect(ps.isPersisting).toBe(true);
  });

  test('creating a store with the same name replaces the previous and warns', async () => {
    const first = new CounterStore();
    await makePersistable(first, { name: 'dup', properties: ['value'] });

    const stopSpy = vi.spyOn(PersistStore.prototype, 'stopPersisting');

    const second = new CounterStore();
    await makePersistable(second, { name: 'dup', properties: ['value'] });

    expect(stopSpy).toHaveBeenCalled();
    expect(PersistStoreMap.get(first)).toBeUndefined();
    expect(PersistStoreMap.get(second)).toBeDefined();

    expect(warnSpy.mock.calls.map((c) => c.join(' ')).join('\n')).toContain(
      '\'makePersistable\' was called with the same storage name "dup"'
    );
  });
});
