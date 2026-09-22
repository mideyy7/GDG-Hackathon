package com.devclaw.dashboard.data

import android.content.Context
import android.content.SharedPreferences
import java.util.UUID

/**
 * Session management, mirroring apps/dashboard/src/lib/session.ts.
 *
 * The web dashboard generates a UUID as the userId (stored in localStorage) and
 * sends it as the `X-Session-Token` header on every API request. This class is
 * the same idea backed by SharedPreferences, which — like localStorage — is a
 * synchronous key/value store, so callers don't need coroutines to read it.
 */
class SessionManager(context: Context) {

    private val prefs: SharedPreferences =
        context.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    /** Get the current session ID, or null if none exists yet. */
    fun getSessionId(): String? = prefs.getString(SESSION_KEY, null)

    /**
     * Get the current session ID, creating one if it doesn't exist.
     * Safe to call on every app launch.
     */
    fun getOrCreateSessionId(): String {
        getSessionId()?.let { return it }
        val newId = UUID.randomUUID().toString()
        setSessionId(newId)
        return newId
    }

    /** Store a session ID (used after the OAuth flow returns a userId). */
    fun setSessionId(id: String) {
        prefs.edit().putString(SESSION_KEY, id).apply()
    }

    /** Clear the session (logout). */
    fun clearSession() {
        prefs.edit().remove(SESSION_KEY).apply()
    }

    /** Check if a session exists. */
    fun hasSession(): Boolean = getSessionId() != null

    private companion object {
        const val PREFS_NAME = "coredev_session"
        const val SESSION_KEY = "coredev_session_id"
    }
}
