package com.devclaw.dashboard.ui.screens

import com.devclaw.dashboard.MainDispatcherRule
import com.devclaw.dashboard.data.FakeDashboardRepository
import com.devclaw.dashboard.data.remote.dto.RunsResponse
import com.devclaw.dashboard.data.remote.dto.TaskRunSummary
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

class RunsViewModelTest {

    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    private fun run(id: String, status: String) = TaskRunSummary(
        id = id, planId = null, userId = "u1", repo = "org/repo", issueUrl = null,
        issueNumber = null, description = "desc $id", status = status, channel = "web",
        branchName = null, prUrl = null, prNumber = null, createdAt = "2026-01-01T00:00:00Z",
    )

    @Test
    fun `filter narrows the visible runs without refetching`() = runTest {
        val fake = FakeDashboardRepository().apply {
            runsResult = Result.success(RunsResponse(listOf(run("1", "completed"), run("2", "failed")), 2))
        }
        val viewModel = RunsViewModel(fake)
        advanceUntilIdle()

        viewModel.setFilter("failed")

        assertEquals(1, viewModel.uiState.value.filtered.size)
        assertEquals("2", viewModel.uiState.value.filtered.first().id)
        assertEquals(1, fake.fetchRunsCallCount)
    }

    @Test
    fun `loadMore appends results and stops when a short page arrives`() = runTest {
        val firstPage = List(20) { run("p1-$it", "completed") }
        val secondPage = List(5) { run("p2-$it", "completed") }
        val fake = FakeDashboardRepository()
        fake.runsResult = Result.success(RunsResponse(firstPage, 25))
        val viewModel = RunsViewModel(fake)
        advanceUntilIdle()

        assertTrue(viewModel.uiState.value.hasMore)

        fake.runsResult = Result.success(RunsResponse(secondPage, 25))
        viewModel.loadMore()
        advanceUntilIdle()

        assertEquals(25, viewModel.uiState.value.runs.size)
        assertEquals(false, viewModel.uiState.value.hasMore)
        assertEquals(2, fake.fetchRunsCallCount)
    }
}
