package com.devclaw.dashboard.ui

import androidx.test.core.app.ApplicationProvider
import com.devclaw.dashboard.MainDispatcherRule
import com.devclaw.dashboard.data.ApiException
import com.devclaw.dashboard.data.FakeDashboardRepository
import com.devclaw.dashboard.data.SessionManager
import com.devclaw.dashboard.data.remote.dto.UserStatus
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class AuthViewModelTest {

    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    private fun sessionManager() = SessionManager(ApplicationProvider.getApplicationContext())

    @Test
    fun `checkAuth creates a session id and reflects an authenticated status`() = runTest {
        val session = sessionManager()
        val fake = FakeDashboardRepository().apply {
            userStatus = Result.success(UserStatus(authenticated = true, linkedRepo = "acme/widgets"))
        }
        val viewModel = AuthViewModel(fake, session)
        advanceUntilIdle()

        assertFalse(viewModel.state.value.loading)
        assertEquals(true, viewModel.state.value.authenticated)
        assertEquals("acme/widgets", viewModel.state.value.linkedRepo)
        assertNotNull(session.getSessionId())
    }

    @Test
    fun `a failed status check leaves the user unauthenticated`() = runTest {
        val fake = FakeDashboardRepository().apply {
            userStatus = Result.failure(ApiException("boom"))
        }
        val viewModel = AuthViewModel(fake, sessionManager())
        advanceUntilIdle()

        assertFalse(viewModel.state.value.authenticated)
        assertNull(viewModel.state.value.linkedRepo)
    }

    @Test
    fun `logout clears the session and resets state`() = runTest {
        val session = sessionManager()
        val fake = FakeDashboardRepository().apply {
            userStatus = Result.success(UserStatus(authenticated = true, linkedRepo = "acme/widgets"))
        }
        val viewModel = AuthViewModel(fake, session)
        advanceUntilIdle()

        viewModel.logout()

        assertFalse(viewModel.state.value.authenticated)
        assertNull(session.getSessionId())
    }
}
