/** @jest-environment jsdom */
import { describe, test, expect, beforeEach } from 'vitest';
import { makeObservable, observable, runInAction } from 'mobx';
import { configurePersistable, getPersistedStore, makePersistable } from './index';

class Store {
  value = 0;
  constructor() {
    makeObservable(this, { value: observable });
  }
}

describe('getPersistedStore wrapper', () => {
  beforeEach(() => configurePersistable({ storage: localStorage, stringify: true }));

  test('returns persisted content', async () => {
    const store = new Store();
    await makePersistable(store, { name: 'get', properties: ['value'] });

    runInAction(() => {
      store.value = 7;
    });

    const persisted = await getPersistedStore<Record<string, any>>(store);
    expect(persisted).toMatchObject({ value: 7 });
  });
});
