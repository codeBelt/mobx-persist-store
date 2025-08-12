import { PersistStore } from './PersistStore';

export const PersistStoreMap: Map<object, PersistStore<Record<string, unknown>, string>> = new Map();

export const PersistStoreNameMap: Map<string, PersistStore<Record<string, unknown>, string>> = new Map();
