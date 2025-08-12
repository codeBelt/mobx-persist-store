import { StorageOptions } from './types';
import { buildExpireTimestamp, consoleDebug, hasTimestampExpired, omitObjectProperties } from './utils';

export class StorageAdapter {
  public readonly options: StorageOptions;

  constructor(options: StorageOptions) {
    this.options = options;
  }

  async setItem<T extends Record<string, unknown>>(key: string, item: T): Promise<void> {
    const { stringify = true, debugMode = false } = this.options;

    const __mps__ = omitObjectProperties(
      {
        expireInTimestamp: this.options.expireIn ? buildExpireTimestamp(this.options.expireIn) : undefined,
        version: this.options.version,
      },
      (value) => value === undefined
    );

    const data: T = Object.keys(__mps__).length
      ? Object.assign({}, item, {
          __mps__,
        })
      : item;

    const content: string | T = stringify ? JSON.stringify(data) : data;

    consoleDebug(debugMode, `${key} - setItem:`, content);

    try {
      await this.options.storage?.setItem(key, content);
    } catch (error) {
      consoleDebug(debugMode, `${key} - setItem failed`, error);
    }
  }

  async getItem<T extends Record<string, unknown>>(key: string): Promise<T> {
    const { removeOnExpiration = true, debugMode = false, version, stringify = true } = this.options;
    let storageData: unknown;

    try {
      storageData = await this.options.storage?.getItem(key);
    } catch (error) {
      consoleDebug(debugMode, `${key} - getItem failed`, error);
      return {} as T;
    }

    let parsedData: T;

    // Fast path: non-string or stringify disabled → treat as plain
    if (!stringify || typeof storageData !== 'string') {
      parsedData = (storageData as unknown as T) || ({} as T);
    } else {
      try {
        parsedData = (JSON.parse(storageData as string) as T) || ({} as T);
      } catch (error) {
        // Keep original if parsing fails
        parsedData = (storageData as unknown as T) || ({} as T);
      }
    }

    const meta = (parsedData as unknown as { __mps__?: { expireInTimestamp?: number; version?: number } }).__mps__;
    const expireTs = meta?.expireInTimestamp;
    const hasExpired = typeof expireTs === 'number' ? hasTimestampExpired(expireTs) : false;
    const mismatchedVersion = typeof version === 'number' ? meta?.version !== version : false;

    consoleDebug(debugMode, `${key} - hasExpired`, hasExpired);
    consoleDebug(debugMode, `${key} - mismatchedVersion`, mismatchedVersion);

    if ((hasExpired && removeOnExpiration) || mismatchedVersion) {
      await this.removeItem(key);
    }

    parsedData = hasExpired || mismatchedVersion ? ({} as T) : parsedData;

    consoleDebug(debugMode, `${key} - (getItem):`, parsedData);

    return parsedData;
  }

  async removeItem(key: string): Promise<void> {
    const { debugMode = false } = this.options;

    consoleDebug(debugMode, `${key} - (removeItem): storage was removed`);

    try {
      await this.options.storage?.removeItem(key);
    } catch (error) {
      consoleDebug(debugMode, `${key} - removeItem failed`, error);
    }
  }
}
