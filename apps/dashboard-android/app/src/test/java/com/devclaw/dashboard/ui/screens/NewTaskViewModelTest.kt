package com.devclaw.dashboard.ui.screens

import com.devclaw.dashboard.MainDispatcherRule
import com.devclaw.dashboard.data.ApiException
import com.devclaw.dashboard.data.FakeDashboardRepository
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Rule
import org.junit.Test

class NewTaskViewModelTest {

    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    @Test
    fun `description updates are capped at 2000 chars`() {
        val viewModel = NewTaskViewModel(FakeDashboardRepository())
        viewModel.onDescriptionChange("a".repeat(2500))
        assertEquals(2000, viewModel.uiState.value.description.length)
    }

    @Test
    fun `blank description does not submit`() = runTest {
        val fake = FakeDashboardRepository()
        val viewModel = NewTaskViewModel(fake)
        viewModel.onDescriptionChange("   ")
        viewModel.submit()
        advanceUntilIdle()

        assertEquals(0, fake.submittedDescriptions.size)
        assertNull(viewModel.uiState.value.submittedRunId)
    }

    @Test
    fun `successful submit exposes the new run id`() = runTest {
        val fake = FakeDashboardRepository()
        val viewModel = NewTaskViewModel(fake)
        viewModel.onDescriptionChange("Add dark mode")
        viewModel.submit()
        advanceUntilIdle()

        assertEquals(listOf("Add dark mode"), fake.submittedDescriptions)
        assertEquals("run-1", viewModel.uiState.value.submittedRunId)
        assertEquals(false, viewModel.uiState.value.submitting)
    }

    @Test
    fun `failed submit surfaces the error and stays on the form`() = runTest {
        val fake = FakeDashboardRepository().apply {
            submitTaskResult = Result.failure(ApiException("Task submission failed"))
        }
        val viewModel = NewTaskViewModel(fake)
        viewModel.onDescriptionChange("Add dark mode")
        viewModel.submit()
        advanceUntilIdle()

        assertEquals("Task submission failed", viewModel.uiState.value.error)
        assertNull(viewModel.uiState.value.submittedRunId)
        assertEquals(false, viewModel.uiState.value.submitting)
    }
}
