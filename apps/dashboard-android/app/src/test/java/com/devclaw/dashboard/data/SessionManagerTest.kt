package com.devclaw.dashboard.data

import androidx.test.core.app.ApplicationProvider
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

/** Mirrors apps/dashboard/src/__tests__/session.test.ts. */
@RunWith(RobolectricTestRunner::class)
class SessionManagerTest {

    private lateinit var sessionManager: SessionManager

    @Before
    fun setUp() {
        sessionManager = SessionManager(ApplicationProvider.getApplicationContext())
    }

    @Test
    fun `getSessionId returns null when no session exists`() {
        assertNull(sessionManager.getSessionId())
    }

    @Test
    fun `getOrCreateSessionId creates a new id if none exists`() {
        val id = sessionManager.getOrCreateSessionId()
        assertNotNull(id)
        assertTrue(id.length > 10)
    }

    @Test
    fun `getOrCreateSessionId returns the same id on subsequent calls`() {
        val first = sessionManager.getOrCreateSessionId()
        val second = sessionManager.getOrCreateSessionId()
        assertEquals(first, second)
    }

    @Test
    fun `setSessionId stores the given id`() {
        sessionManager.setSessionId("my-session-id")
        assertEquals("my-session-id", sessionManager.getSessionId())
    }

    @Test
    fun `clearSession removes the session id`() {
        sessionManager.setSessionId("to-remove")
        sessionManager.clearSession()
        assertNull(sessionManager.getSessionId())
    }

    @Test
    fun `hasSession returns false when no session`() {
        assertTrue(!sessionManager.hasSession())
    }

    @Test
    fun `hasSession returns true when a session exists`() {
        sessionManager.setSessionId("exists")
        assertTrue(sessionManager.hasSession())
    }
}
