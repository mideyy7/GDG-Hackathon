package com.devclaw.dashboard.data.remote

import androidx.test.core.app.ApplicationProvider
import com.devclaw.dashboard.data.SessionManager
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

/**
 * Verifies the `X-Session-Token` interceptor added in [ApiClient.buildOkHttpClient],
 * mirroring `sessionHeaders()` in apps/dashboard/src/lib/api.ts.
 */
@RunWith(RobolectricTestRunner::class)
class ApiClientTest {

    private lateinit var server: MockWebServer

    @Before
    fun setUp() {
        server = MockWebServer()
        server.start()
    }

    @After
    fun tearDown() {
        server.shutdown()
    }

    @Test
    fun `attaches the session token header when a session exists`() {
        val sessionManager = SessionManager(ApplicationProvider.getApplicationContext())
        sessionManager.setSessionId("session-123")
        val client = ApiClient.buildOkHttpClient(sessionManager)

        server.enqueue(MockResponse().setBody("ok"))
        val request = okhttp3.Request.Builder().url(server.url("/ping")).build()
        client.newCall(request).execute().close()

        val recorded = server.takeRequest()
        assertEquals("session-123", recorded.getHeader("X-Session-Token"))
    }

    @Test
    fun `omits the header when there is no session`() {
        val sessionManager = SessionManager(ApplicationProvider.getApplicationContext())
        val client = ApiClient.buildOkHttpClient(sessionManager)

        server.enqueue(MockResponse().setBody("ok"))
        val request = okhttp3.Request.Builder().url(server.url("/ping")).build()
        client.newCall(request).execute().close()

        val recorded = server.takeRequest()
        assertNull(recorded.getHeader("X-Session-Token"))
    }
}
