package com.devclaw.dashboard.ui.screens

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.devclaw.dashboard.data.DashboardRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class NewTaskUiState(
    val description: String = "",
    val submitting: Boolean = false,
    val error: String? = null,
    val submittedRunId: String? = null,
)

val TASK_EXAMPLES = listOf(
    "Add dark mode support to the user settings page",
    "Fix the race condition in the authentication middleware",
    "Add rate limiting to the public API endpoints",
    "Refactor the database connection pool for better error handling",
    "Add unit tests for the payment processing module",
)

val NEXT_STEPS = listOf(
    "A GitHub issue is created for your task",
    "DevCore generates an architecture plan",
    "You review and approve the plan",
    "AI agents implement the code",
    "Security scan runs on the diff",
    "A pull request is opened for review",
)

/** Mirrors apps/dashboard/src/pages/NewTask.tsx. */
class NewTaskViewModel(private val repository: DashboardRepository) : ViewModel() {

    private val _uiState = MutableStateFlow(NewTaskUiState())
    val uiState: StateFlow<NewTaskUiState> = _uiState.asStateFlow()

    /** Truncates to 2000 chars, matching the web textarea's `maxLength={2000}`. */
    fun onDescriptionChange(value: String) {
        _uiState.value = _uiState.value.copy(description = value.take(2000))
    }

    fun submit() {
        val description = _uiState.value.description.trim()
        if (description.isEmpty()) return

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(submitting = true, error = null)
            val result = repository.submitTask(description)
            _uiState.value = result.fold(
                onSuccess = { _uiState.value.copy(submitting = false, submittedRunId = it.runId) },
                onFailure = { _uiState.value.copy(submitting = false, error = it.message ?: "Submission failed") },
            )
        }
    }

    fun consumeSubmittedRunId() {
        _uiState.value = _uiState.value.copy(submittedRunId = null)
    }
}
