import { describe, test, expect, beforeEach } from 'vitest';
import { configurePersistable } from './configurePersistable';
import { makeSerializableProperties } from './serializableProperty';

describe('serializableProperty', () => {
  beforeEach(() => {
    configurePersistable({ debugMode: true });
  });

  test('string keys are converted to identity serializable properties', () => {
    type T = { a: number };
    const props = makeSerializableProperties<T, 'a'>(['a']);

    expect(props).toHaveLength(1);
    expect(props[0].key).toBe('a');
    expect(props[0].serialize(123)).toBe(123);
    expect(props[0].deserialize(123)).toBe(123);
  });

  test('object with serialize/deserialize is kept', () => {
    type T = { a: number };
    const custom = { key: 'a' as const, serialize: (v: number) => String(v), deserialize: (v: any) => Number(v) };
    const props = makeSerializableProperties<T, 'a'>([custom]);

    expect(props).toHaveLength(1);
    expect(props[0]).toBe(custom);
    expect(props[0].serialize(5)).toBe('5');
    expect(props[0].deserialize('7')).toBe(7);
  });

  test('invalid entries are ignored', () => {
    type T = { a: number };
    const props = makeSerializableProperties<T, 'a'>([{ foo: 'bar' } as any, 'a']);

    expect(props).toHaveLength(1);
    expect(props[0].key).toBe('a');
  });
});
