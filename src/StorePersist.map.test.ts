/** @jest-environment jsdom */
import { describe, test, expect, beforeEach } from 'vitest';
import { makeObservable, observable, ObservableMap, runInAction } from 'mobx';
import { configurePersistable, PersistStore } from './index';

describe('PersistStore - ObservableMap support', () => {
  class MStore {
    map = new ObservableMap<string, number>();
    constructor() {
      makeObservable(this, { map: observable });
    }
  }

  beforeEach(() => configurePersistable({ storage: localStorage, stringify: true }));

  test('serializes and hydrates ObservableMap', async () => {
    const store = new MStore();
    const ps = new PersistStore(store as any, { name: 'mapStore', properties: ['map'] as any });
    await ps.init();

    runInAction(() => {
      store.map.set('a', 1);
      store.map.set('b', 2);
    });

    ps.pausePersisting();

    runInAction(() => {
      store.map.clear();
    });

    await ps.hydrateStore();

    expect(store.map.get('a')).toBe(1);
    expect(store.map.get('b')).toBe(2);
  });
});
