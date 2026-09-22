package com.devclaw.dashboard.ui.screens

import androidx.test.core.app.ApplicationProvider
import com.devclaw.dashboard.MainDispatcherRule
import com.devclaw.dashboard.data.ApiException
import com.devclaw.dashboard.data.FakeDashboardRepository
import com.devclaw.dashboard.data.ServerConfig
import com.devclaw.dashboard.data.SessionManager
import com.devclaw.dashboard.data.remote.RunEventStream
import com.devclaw.dashboard.data.remote.dto.ArchitecturePlan
import com.devclaw.dashboard.data.remote.dto.TaskRunDetail
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import okhttp3.OkHttpClient
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class RunDetailViewModelTest {

    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    private fun detail(status: String, plan: ArchitecturePlan? = null) = TaskRunDetail(
        id = "run-1", planId = plan?.planId, userId = "u1", repo = "org/repo", issueUrl = null,
        issueNumber = null, description = "desc", status = status, channel = "web",
        branchName = null, prUrl = null, prNumber = null, createdAt = "2026-01-01T00:00:00Z",
        planDetails = plan,
    )

    private fun newViewModel(fake: FakeDashboardRepository) = RunDetailViewModel(
        runId = "run-1",
        repository = fake,
        runEventStream = RunEventStream(OkHttpClient()),
        serverConfig = ServerConfig(ApplicationProvider.getApplicationContext()),
        sessionManager = SessionManager(ApplicationProvider.getApplicationContext()),
    )

    @Test
    fun `loads the run on init`() = runTest {
        val fake = FakeDashboardRepository().apply {
            runDetailResult = Result.success(detail("completed"))
        }
        val viewModel = newViewModel(fake)
        advanceUntilIdle()

        assertEquals(false, viewModel.uiState.value.loading)
        assertEquals("completed", viewModel.uiState.value.run?.status)
        assertEquals(listOf("run-1"), fake.fetchRunCalls)
    }

    @Test
    fun `polls every 5 seconds while the run is active`() = runTest {
        val fake = FakeDashboardRepository().apply {
            runDetailResult = Result.success(detail("generating"))
        }
        val viewModel = newViewModel(fake)
        runCurrent()
        assertEquals(1, fake.fetchRunCalls.size)

        advanceTimeBy(5_001)
        assertEquals(2, fake.fetchRunCalls.size)

        // The run is still active, so a new poll got scheduled. advanceUntilIdle()
        // would chase that self-rescheduling timer forever, so instead stop it
        // explicitly and just flush the resulting cancellation.
        viewModel.onCleared()
        runCurrent()
    }

    @Test
    fun `does not poll once the run reaches a terminal status`() = runTest {
        val fake = FakeDashboardRepository().apply {
            runDetailResult = Result.success(detail("completed"))
        }
        newViewModel(fake)
        advanceUntilIdle()

        advanceTimeBy(20_000)
        assertEquals(1, fake.fetchRunCalls.size)
    }

    @Test
    fun `approve reloads the run and clears action errors`() = runTest {
        val fake = FakeDashboardRepository().apply {
            runDetailResult = Result.success(detail("pending_approval"))
        }
        val viewModel = newViewModel(fake)
        runCurrent()

        // approve() is awaited directly (not `launch`ed), so it completes fully
        // without any time advancement; only its side-effect scheduling the next
        // poll needs the scheduler, and we don't want to resolve that here.
        val result = viewModel.approve()

        assertEquals(true, result.isSuccess)
        assertEquals(listOf("run-1"), fake.approveCalls)
        assertNull(viewModel.uiState.value.actionError)
        viewModel.onCleared()
        runCurrent()
    }

    @Test
    fun `failed approve surfaces an action error but still reloads`() = runTest {
        val fake = FakeDashboardRepository().apply {
            runDetailResult = Result.success(detail("pending_approval"))
            actionResult = Result.failure(ApiException("Plan already approved"))
        }
        val viewModel = newViewModel(fake)
        runCurrent()

        viewModel.approve()

        assertEquals("Plan already approved", viewModel.uiState.value.actionError)
        assertEquals(2, fake.fetchRunCalls.size) // initial load + post-action reload
        viewModel.onCleared()
        runCurrent()
    }
}
