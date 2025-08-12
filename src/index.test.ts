import * as api from './index';

describe('index exports', () => {
  test('should expose the public API', () => {
    const expectedExports = [
      'clearPersistedStore',
      'configurePersistable',
      'getPersistedStore',
      'hydrateStore',
      'isHydrated',
      'isPersisting',
      'makePersistable',
      'pausePersisting',
      'PersistStore',
      'PersistStoreMap',
      'startPersisting',
      'stopPersisting',
      'StorageAdapter',
    ];

    expectedExports.forEach((name) => {
      // @ts-ignore
      expect(api[name]).toBeDefined();
    });
  });
});
