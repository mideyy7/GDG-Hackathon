import { describe, it, expect, beforeEach } from 'vitest';
import {
  getSessionId,
  getOrCreateSessionId,
  setSessionId,
  clearSession,
  hasSession,
} from '../lib/session';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

beforeEach(() => {
  localStorageMock.clear();
});

describe('session', () => {
  it('getSessionId returns null when no session exists', () => {
    expect(getSessionId()).toBeNull();
  });

  it('getOrCreateSessionId creates a new UUID if none exists', () => {
    const id = getOrCreateSessionId();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(10);
  });

  it('getOrCreateSessionId returns the same ID on subsequent calls', () => {
    const id1 = getOrCreateSessionId();
    const id2 = getOrCreateSessionId();
    expect(id1).toBe(id2);
  });

  it('setSessionId stores the given ID', () => {
    setSessionId('my-session-id');
    expect(getSessionId()).toBe('my-session-id');
  });

  it('clearSession removes the session ID', () => {
    setSessionId('to-remove');
    clearSession();
    expect(getSessionId()).toBeNull();
  });

  it('hasSession returns false when no session', () => {
    expect(hasSession()).toBe(false);
  });

  it('hasSession returns true when session exists', () => {
    setSessionId('exists');
    expect(hasSession()).toBe(true);
  });
});
