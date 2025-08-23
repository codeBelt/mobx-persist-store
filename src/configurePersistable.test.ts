import { describe, test, expect } from 'vitest';
import ms from 'milliseconds';
import { mpsConfig, mpsReactionOptions, StorageOptions, configurePersistable, ReactionOptions } from './index';

describe('configurePersistable', () => {
  const config: StorageOptions = {
    expireIn: ms.days(7),
    removeOnExpiration: false,
    stringify: false,
    storage: localStorage,
  };
  const reactionOptions: ReactionOptions = { delay: 200 };

  test(`should set global config`, () => {
    configurePersistable(config, reactionOptions);

    expect(config).toBe(mpsConfig);
    expect(reactionOptions).toBe(mpsReactionOptions);
  });

  test('should override existing config and reaction options on subsequent calls', () => {
    configurePersistable(config, reactionOptions);

    const nextConfig: StorageOptions = { stringify: true, storage: localStorage, debugMode: true };
    const nextReaction: ReactionOptions = { delay: 50, fireImmediately: true };

    configurePersistable(nextConfig, nextReaction);

    expect(mpsConfig).toBe(nextConfig);
    expect(mpsReactionOptions).toBe(nextReaction);
  });

  test('should default reaction options to empty object when omitted', () => {
    configurePersistable({ storage: localStorage, stringify: true });
    expect(mpsReactionOptions).toEqual({});
  });
});
