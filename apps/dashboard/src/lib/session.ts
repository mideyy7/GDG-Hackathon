/**
 * Session management for Web Mission Control.
 *
 * The web dashboard generates a UUID as the userId (stored in localStorage).
 * This userId is used as the key in the gateway's user_preferences table,
 * and sent as `X-Session-Token` header on all API requests.
 *
 * Security: The userId is a UUIDv4 — infeasible to guess. Stored in
 * localStorage under the key `devclaw_session_id`.
 */

const SESSION_KEY = 'devclaw_session_id';

/** Get the current session ID, or null if none exists yet. */
export const getSessionId = (): string | null => {
  return localStorage.getItem(SESSION_KEY);
};

/**
 * Get the current session ID, creating one if it doesn't exist.
 * This is safe to call on every page load.
 */
export const getOrCreateSessionId = (): string => {
  const existing = localStorage.getItem(SESSION_KEY);
  if (existing) return existing;

  const newId = crypto.randomUUID();
  localStorage.setItem(SESSION_KEY, newId);
  return newId;
};

/** Store a session ID (used after OAuth redirect returns userId). */
export const setSessionId = (id: string): void => {
  localStorage.setItem(SESSION_KEY, id);
};

/** Clear the session (logout). */
export const clearSession = (): void => {
  localStorage.removeItem(SESSION_KEY);
};

/** Check if a session exists. */
export const hasSession = (): boolean => {
  return !!localStorage.getItem(SESSION_KEY);
};
