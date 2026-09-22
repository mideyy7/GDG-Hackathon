package com.devclaw.dashboard.ui.screens

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.devclaw.dashboard.data.DashboardRepository
import com.devclaw.dashboard.data.remote.dto.TaskRunSummary
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class OverviewUiState(
    val loading: Boolean = true,
    val runs: List<TaskRunSummary> = emptyList(),
    val error: String? = null,
) {
    val total get() = runs.size
    val completed get() = runs.count { it.status == "completed" }
    val active get() = runs.count { it.status == "approved" || it.status == "generating" }
    val pending get() = runs.count { it.status == "pending_approval" }
}

/** Mirrors apps/dashboard/src/pages/Overview.tsx. */
class OverviewViewModel(private val repository: DashboardRepository) : ViewModel() {

    private val _uiState = MutableStateFlow(OverviewUiState())
    val uiState: StateFlow<OverviewUiState> = _uiState.asStateFlow()

    init {
        load()
    }

    fun load() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(loading = true)
            val result = repository.fetchRuns(limit = 5)
            _uiState.value = result.fold(
                onSuccess = { OverviewUiState(loading = false, runs = it.runs) },
                onFailure = { OverviewUiState(loading = false, error = it.message) },
            )
        }
    }
}
