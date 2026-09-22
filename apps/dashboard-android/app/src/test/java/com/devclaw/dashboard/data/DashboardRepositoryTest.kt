package com.devclaw.dashboard.data

import com.devclaw.dashboard.data.remote.ApiClient
import kotlinx.coroutines.test.runTest
import okhttp3.OkHttpClient
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

/**
 * Exercises [DashboardRepositoryImpl] against a real HTTP server (MockWebServer)
 * so the Retrofit/kotlinx.serialization wiring is verified end-to-end, not just
 * the interface contract.
 */
class DashboardRepositoryTest {

    private lateinit var server: MockWebServer
    private lateinit var repository: DashboardRepository

    @Before
    fun setUp() {
        server = MockWebServer()
        server.start()
        val apiService = ApiClient.buildApiService(server.url("/").toString(), OkHttpClient())
        repository = DashboardRepositoryImpl(apiService)
    }

    @After
    fun tearDown() {
        server.shutdown()
    }

    @Test
    fun `fetchUserStatus parses a successful response`() = runTest {
        server.enqueue(
            MockResponse().setBody("""{"authenticated":true,"linkedRepo":"acme/widgets"}""")
        )

        val result = repository.fetchUserStatus()

        assertTrue(result.isSuccess)
        assertEquals(true, result.getOrNull()?.authenticated)
        assertEquals("acme/widgets", result.getOrNull()?.linkedRepo)
    }

    @Test
    fun `fetchGitHubRepos unwraps the repos array`() = runTest {
        server.enqueue(
            MockResponse().setBody(
                """{"repos":[{"fullName":"acme/widgets","name":"widgets","owner":"acme","private":false,"defaultBranch":"main","updatedAt":"2026-01-01T00:00:00Z","description":null}]}"""
            )
        )

        val result = repository.fetchGitHubRepos()

        assertTrue(result.isSuccess)
        assertEquals(1, result.getOrNull()?.size)
        assertEquals("acme/widgets", result.getOrNull()?.first()?.fullName)
    }

    @Test
    fun `a 4xx response surfaces the server's error field`() = runTest {
        server.enqueue(
            MockResponse().setResponseCode(409).setBody("""{"error":"Repository already linked"}""")
        )

        val result = repository.linkRepository("acme/widgets")

        assertTrue(result.isFailure)
        assertEquals("Repository already linked", result.exceptionOrNull()?.message)
    }

    @Test
    fun `a malformed error body falls back to the HTTP status message`() = runTest {
        server.enqueue(MockResponse().setResponseCode(500).setBody("not json"))

        val result = repository.approveRun("run-1")

        assertTrue(result.isFailure)
        assertTrue(result.exceptionOrNull()?.message?.isNotBlank() == true)
    }

    @Test
    fun `githubOAuthUrl encodes the user id and strips a trailing slash from the base`() {
        val url = repository.githubOAuthUrl("https://api.example.com/", "user id/with-special")
        assertEquals("https://api.example.com/api/web/auth/github?userId=user+id%2Fwith-special", url)
    }
}
