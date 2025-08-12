// Ensure clean DOM storage and timers across tests
import { afterEach, beforeEach, vi } from 'vitest';

beforeEach(() => {
  // Reset JSDOM URL and clear storage
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.clear();
      window.sessionStorage.clear();
    } catch {}
  }
});

afterEach(() => {
  // Restore any timers in case a test left them mocked
  try {
    vi.useRealTimers();
  } catch {}
  // Vitest already clears/restores mocks per config, but make it explicit
  vi.restoreAllMocks();
});
