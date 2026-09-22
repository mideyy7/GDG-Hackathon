package com.devclaw.dashboard.ui.screens

import com.devclaw.dashboard.MainDispatcherRule
import com.devclaw.dashboard.data.ApiException
import com.devclaw.dashboard.data.FakeDashboardRepository
import com.devclaw.dashboard.data.remote.dto.RunsResponse
import com.devclaw.dashboard.data.remote.dto.TaskRunSummary
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Rule
import org.junit.Test

class OverviewViewModelTest {

    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    private fun run(status: String) = TaskRunSummary(
        id = "id-$status",
        planId = null,
        userId = "u1",
        repo = "org/repo",
        issueUrl = null,
        issueNumber = null,
        description = "desc",
        status = status,
        channel = "web",
        branchName = null,
        prUrl = null,
        prNumber = null,
        createdAt = "2026-01-01T00:00:00Z",
    )

    @Test
    fun `computes stats from fetched runs`() = runTest {
        val fake = FakeDashboardRepository().apply {
            runsResult = Result.success(
                RunsResponse(
                    runs = listOf(
                        run("completed"),
                        run("completed"),
                        run("generating"),
                        run("pending_approval"),
                    ),
                    total = 4,
                )
            )
        }

        val viewModel = OverviewViewModel(fake)
        advanceUntilIdle()

        val state = viewModel.uiState.value
        assertEquals(false, state.loading)
        assertNull(state.error)
        assertEquals(4, state.total)
        assertEquals(2, state.completed)
        assertEquals(1, state.active)
        assertEquals(1, state.pending)
    }

    @Test
    fun `surfaces error message on failure`() = runTest {
        val fake = FakeDashboardRepository().apply {
            runsResult = Result.failure(ApiException("network down"))
        }

        val viewModel = OverviewViewModel(fake)
        advanceUntilIdle()

        val state = viewModel.uiState.value
        assertEquals(false, state.loading)
        assertEquals("network down", state.error)
        assertEquals(0, state.total)
    }
}
