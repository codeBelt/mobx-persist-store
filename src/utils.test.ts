/** @jest-environment jsdom */
import { buildExpireTimestamp, hasTimestampExpired, isDefined, isObjectWithProperties, isObject } from './utils';
import ms from 'milliseconds';

describe('buildExpireTimestamp', () => {
  test(`should build expire timestamp 5 days from now`, async () => {
    const fiveDaysInMilliseconds = ms.days(5);

    const actualResult = buildExpireTimestamp(fiveDaysInMilliseconds);
    const expectedResult = new Date().getTime() + fiveDaysInMilliseconds;

    expect(actualResult).toBe(expectedResult);
  });
});

describe('hasTimestampExpired', () => {
  test(`should not expire one milliseconds after timestamp`, async () => {
    const oneMillisecondFromNow = buildExpireTimestamp(1);

    const actualResult = hasTimestampExpired(oneMillisecondFromNow);
    const expectedResult = false;

    expect(actualResult).toBe(expectedResult);
  });

  test(`should expire if same as timestamp`, async () => {
    const now = buildExpireTimestamp(0);

    const actualResult = hasTimestampExpired(now);
    const expectedResult = true;

    expect(actualResult).toBe(expectedResult);
  });

  test(`should expire one milliseconds before timestamp`, async () => {
    const oneMillisecondBeforeNow = buildExpireTimestamp(-1);

    const actualResult = hasTimestampExpired(oneMillisecondBeforeNow);
    const expectedResult = true;

    expect(actualResult).toBe(expectedResult);
  });
});

describe('Testing Utils', () => {
  describe('isDefined', () => {
    test('returns false if value is null or undefined, otherwise true', () => {
      expect(isDefined(undefined)).toBe(false);
      expect(isDefined(null)).toBe(false);
      expect(isDefined(NaN)).toBe(true);
      expect(isDefined(0)).toBe(true);
      expect(isDefined(false)).toBe(true);
      expect(isDefined('')).toBe(true);
    });
  });

  test('Util.isObject', () => {
    expect(isObject(undefined)).toBeFalsy();
    expect(isObject(null)).toBeFalsy();
    expect(isObject(1)).toBeFalsy();
    expect(isObject('string')).toBeFalsy();
    expect(isObject([])).toBeFalsy();

    expect(isObject({})).toBeTruthy();
    expect(isObject({ hey: 'there' })).toBeTruthy();
  });

  test('isObjectWithProperties', () => {
    expect(isObjectWithProperties({})).toBeFalsy();
    expect(isObjectWithProperties({ hey: 'there' })).toBeTruthy();
  });
});

describe('additional utils', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    (console.info as any) = jest.fn();
    (console.warn as any) = jest.fn();
  });

  afterAll(() => {
    process.env.NODE_ENV = originalNodeEnv;
    jest.restoreAllMocks();
  });

  test('isFunction', () => {
    // eslint-disable-next-line @typescript-eslint/ban-types
    const fn = function () {};
    const arrow = () => {};
    const notFn = {};
    // @ts-ignore
    expect(require('./utils').isFunction(fn)).toBe(true);
    // @ts-ignore
    expect(require('./utils').isFunction(arrow)).toBe(true);
    // @ts-ignore
    expect(require('./utils').isFunction(notFn)).toBe(false);
  });

  test('isStorageControllerLike - valid custom controller', () => {
    const ctrl = { getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() };
    // @ts-ignore
    expect(require('./utils').isStorageControllerLike(ctrl)).toBe(true);
  });

  test('isStorageControllerLike - invalid controller triggers warning', () => {
    const { invalidStorageAdaptorWarningIf, isStorageControllerLike } = require('./utils');
    const bad = { setItem: jest.fn() };
    expect(isStorageControllerLike(bad)).toBe(false);
    invalidStorageAdaptorWarningIf(bad, 'badStorage');
    expect(console.warn).toHaveBeenCalled();
  });

  test('consoleDebug logs only in debug mode', () => {
    const { consoleDebug } = require('./utils');
    consoleDebug(false, 'msg');
    expect(console.info).not.toHaveBeenCalled();
    consoleDebug(true, 'msg');
    expect(console.info).toHaveBeenCalled();
  });

  test('computedPersistWarningIf and actionPersistWarningIf', () => {
    const { computedPersistWarningIf, actionPersistWarningIf } = require('./utils');
    computedPersistWarningIf(true, 'a');
    actionPersistWarningIf(true, 'b');
    expect(console.warn).toHaveBeenCalledTimes(2);
  });

  test('isArrayForMap', () => {
    const { isArrayForMap } = require('./utils');
    expect(
      isArrayForMap([
        ['a', 1],
        ['b', 2],
      ])
    ).toBe(true);
    expect(isArrayForMap([1, 2, 3])).toBe(false);
    expect(isArrayForMap('no')).toBe(false);
  });

  test('isArrayForSet', () => {
    const { isArrayForSet } = require('./utils');
    expect(isArrayForSet([1, 2, 3])).toBe(true);
    expect(isArrayForSet('no')).toBe(false);
  });

  test('omitObjectProperties', () => {
    const { omitObjectProperties } = require('./utils');
    const obj = { a: 1, b: undefined, c: 0 } as any;
    const result = omitObjectProperties(obj, (v: any) => v === undefined);
    expect(result).toEqual({ a: 1, c: 0 });
  });
});
