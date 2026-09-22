package com.devclaw.dashboard.ui.screens

import com.devclaw.dashboard.MainDispatcherRule
import com.devclaw.dashboard.data.ApiException
import com.devclaw.dashboard.data.FakeDashboardRepository
import com.devclaw.dashboard.data.remote.dto.GitHubRepo
import com.devclaw.dashboard.data.remote.dto.UserStatus
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

class RepositoriesViewModelTest {

    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    private fun repo(fullName: String) = GitHubRepo(
        fullName = fullName,
        name = fullName.substringAfter('/'),
        owner = fullName.substringBefore('/'),
        private = false,
        defaultBranch = "main",
        updatedAt = "2026-01-01T00:00:00Z",
        description = null,
    )

    @Test
    fun `search filters the repo list case-insensitively`() = runTest {
        val fake = FakeDashboardRepository().apply {
            repos = Result.success(listOf(repo("acme/widgets"), repo("acme/gadgets")))
        }
        var linkedCallbacks = 0
        val viewModel = RepositoriesViewModel(fake) { linkedCallbacks++ }
        advanceUntilIdle()

        viewModel.onSearchChange("WIDGET")

        assertEquals(1, viewModel.uiState.value.filtered.size)
        assertEquals("acme/widgets", viewModel.uiState.value.filtered.first().fullName)
        assertEquals(0, linkedCallbacks)
    }

    @Test
    fun `linking a repo updates state and notifies the caller`() = runTest {
        val fake = FakeDashboardRepository().apply {
            repos = Result.success(listOf(repo("acme/widgets")))
            userStatus = Result.success(UserStatus(authenticated = true, linkedRepo = null))
        }
        var linkedCallbacks = 0
        val viewModel = RepositoriesViewModel(fake) { linkedCallbacks++ }
        advanceUntilIdle()

        viewModel.link("acme/widgets")
        advanceUntilIdle()

        assertEquals(listOf("acme/widgets"), fake.linkedRepos)
        assertEquals("acme/widgets", viewModel.uiState.value.linkedRepo)
        assertTrue(viewModel.uiState.value.success!!.contains("acme/widgets"))
        assertEquals(1, linkedCallbacks)
    }

    @Test
    fun `failed link surfaces an error and does not notify the caller`() = runTest {
        val fake = FakeDashboardRepository().apply {
            repos = Result.success(listOf(repo("acme/widgets")))
            linkResult = Result.failure(ApiException("Repository already linked"))
        }
        var linkedCallbacks = 0
        val viewModel = RepositoriesViewModel(fake) { linkedCallbacks++ }
        advanceUntilIdle()

        viewModel.link("acme/widgets")
        advanceUntilIdle()

        assertEquals("Repository already linked", viewModel.uiState.value.error)
        assertEquals(0, linkedCallbacks)
    }
}
