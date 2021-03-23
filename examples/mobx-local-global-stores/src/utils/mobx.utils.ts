import { IApiError, SuccessfulResponse } from './http/http.types';
import environment from 'environment';
import { PersistStore } from 'mobx-persist-store';
import { persistence, StorageAdapter } from 'mobx-persist-store';

export type ResponseStatus<T, E = IApiError> = Omit<SuccessfulResponse<T>, 'error'> & {
  isRequesting: boolean;
  error?: E;
};

/**
 * Util to standardize api responses for mobx stores.
 */
export const initialResponseStatus = <T, E = IApiError>(
  defaultValue: T,
  defaultIsRequesting = true
): ResponseStatus<T, E> => {
  return {
    isRequesting: defaultIsRequesting,
    data: defaultValue,
  };
};

export const mobxPersistStorageAdapter = new StorageAdapter({
  read: async (name: string) => {
    if (environment.isServer) {
      return;
    }

    const data = window.localStorage.getItem(name);

    return data ? JSON.parse(data) : undefined;
  },
  write: async (name: string, content: string) => {
    if (environment.isServer) {
      return;
    }

    window.localStorage.setItem(name, JSON.stringify(content));
  },
});

export const persistStore = <T, K extends keyof T>(
  target: T,
  properties: K[],
  name: string
): PersistStore<T> | null => {
  if (environment.isServer) {
    return null;
  }

  return persistence({
    name: name,
    properties: properties as string[],
    adapter: mobxPersistStorageAdapter,
    reactionOptions: {
      delay: 200,
    },
  })(target);
};
