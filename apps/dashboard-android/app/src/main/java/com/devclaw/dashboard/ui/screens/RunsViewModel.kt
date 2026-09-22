package com.devclaw.dashboard.ui.screens

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.devclaw.dashboard.data.DashboardRepository
import com.devclaw.dashboard.data.remote.dto.TaskRunSummary
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

val STATUS_FILTERS = listOf("all", "pending_approval", "generating", "completed", "failed", "rejected")
private const val PAGE_LIMIT = 20

data class RunsUiState(
    val loading: Boolean = true,
    val runs: List<TaskRunSummary> = emptyList(),
    val filter: String = "all",
    val offset: Int = 0,
    val hasMore: Boolean = false,
    val error: String? = null,
) {
    val filtered: List<TaskRunSummary>
        get() = if (filter == "all") runs else runs.filter { it.status == filter }
}

/** Mirrors apps/dashboard/src/pages/Runs.tsx. */
class RunsViewModel(private val repository: DashboardRepository) : ViewModel() {

    private val _uiState = MutableStateFlow(RunsUiState())
    val uiState: StateFlow<RunsUiState> = _uiState.asStateFlow()

    init {
        loadRuns(0)
    }

    fun setFilter(filter: String) {
        _uiState.value = _uiState.value.copy(filter = filter)
    }

    fun loadMore() {
        if (_uiState.value.hasMore && !_uiState.value.loading) {
            loadRuns(_uiState.value.offset + PAGE_LIMIT)
        }
    }

    fun retry() = loadRuns(0)

    private fun loadRuns(newOffset: Int) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(loading = true)
            val result = repository.fetchRuns(PAGE_LIMIT, newOffset)
            _uiState.value = result.fold(
                onSuccess = { response ->
                    val merged = if (newOffset == 0) response.runs else _uiState.value.runs + response.runs
                    _uiState.value.copy(
                        loading = false,
                        runs = merged,
                        offset = newOffset,
                        hasMore = response.runs.size == PAGE_LIMIT,
                        error = null,
                    )
                },
                onFailure = { _uiState.value.copy(loading = false, error = it.message) },
            )
        }
    }
}
