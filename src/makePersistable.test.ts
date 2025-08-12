/** @jest-environment jsdom */
import mockConsole from 'jest-mock-console';
import { makeObservable, observable } from 'mobx';

import { PersistStore, PersistStoreMap, configurePersistable, makePersistable } from './index';

class CounterStore {
  value = 0;
  constructor() {
    makeObservable(this, { value: observable });
  }
}

describe('makePersistable', () => {
  let restoreConsole: ReturnType<typeof mockConsole>;

  beforeEach(() => {
    restoreConsole = mockConsole();
    configurePersistable({ storage: localStorage, stringify: true });
  });

  afterEach(() => {
    restoreConsole();
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

    const stopSpy = jest.spyOn(PersistStore.prototype, 'stopPersisting');

    const second = new CounterStore();
    await makePersistable(second, { name: 'dup', properties: ['value'] });

    expect(stopSpy).toHaveBeenCalled();
    expect(PersistStoreMap.get(first)).toBeUndefined();
    expect(PersistStoreMap.get(second)).toBeDefined();

    expect((console.warn as jest.Mock).mock.calls.join('\n')).toContain(
      '\'makePersistable\' was called with the same storage name "dup"'
    );
  });
});
