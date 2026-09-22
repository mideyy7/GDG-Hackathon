package com.devclaw.dashboard.ui.screens

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.devclaw.dashboard.data.DashboardRepository
import com.devclaw.dashboard.data.ServerConfig
import com.devclaw.dashboard.data.SessionManager
import com.devclaw.dashboard.data.remote.RunEventStream
import com.devclaw.dashboard.data.remote.RunStreamEvent
import com.devclaw.dashboard.data.remote.dto.TaskRunDetail
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

private val ACTIVE_STATUSES = setOf("planning", "approved", "generating", "pending_approval")
private const val POLL_INTERVAL_MS = 5000L

data class RunDetailUiState(
    val loading: Boolean = true,
    val run: TaskRunDetail? = null,
    val error: String? = null,
    val actionError: String? = null,
)

/** Mirrors apps/dashboard/src/pages/RunDetail.tsx. */
class RunDetailViewModel(
    private val runId: String,
    private val repository: DashboardRepository,
    private val runEventStream: RunEventStream,
    private val serverConfig: ServerConfig,
    private val sessionManager: SessionManager,
) : ViewModel() {

    private val _uiState = MutableStateFlow(RunDetailUiState())
    val uiState: StateFlow<RunDetailUiState> = _uiState.asStateFlow()

    private var pollJob: Job? = null

    init {
        viewModelScope.launch { fetchAndUpdate(showLoading = true) }
    }

    /** Fire-and-forget refresh, used by pull-to-retry and after SSE terminal events. */
    fun reload() {
        viewModelScope.launch { fetchAndUpdate(showLoading = false) }
    }

    private suspend fun fetchAndUpdate(showLoading: Boolean) {
        if (showLoading) _uiState.value = _uiState.value.copy(loading = true)
        val result = repository.fetchRun(runId)
        _uiState.value = result.fold(
            onSuccess = { run ->
                schedulePollingIfNeeded(run.status)
                _uiState.value.copy(loading = false, run = run, error = null)
            },
            onFailure = { _uiState.value.copy(loading = false, error = it.message ?: "Failed to load run") },
        )
    }

    private fun schedulePollingIfNeeded(status: String) {
        pollJob?.cancel()
        if (status !in ACTIVE_STATUSES) return
        pollJob = viewModelScope.launch {
            delay(POLL_INTERVAL_MS)
            fetchAndUpdate(showLoading = false)
        }
    }

    // Suspend + Result-returning, so PlanCard can await them directly and show
    // its own inline loading/error state — mirroring the `await approveRun(...);
    // await reload();` pattern in RunDetail.tsx's handleApprove/handleReject/handleRefine.
    suspend fun approve(): Result<Unit> = runAction { repository.approveRun(runId) }
    suspend fun reject(): Result<Unit> = runAction { repository.rejectRun(runId) }
    suspend fun refine(refinement: String): Result<Unit> = runAction { repository.refineRun(runId, refinement) }

    private suspend fun runAction(block: suspend () -> Result<Unit>): Result<Unit> {
        _uiState.value = _uiState.value.copy(actionError = null)
        val result = block()
        result.onFailure { _uiState.value = _uiState.value.copy(actionError = it.message) }
        fetchAndUpdate(showLoading = false)
        return result
    }

    /** Supplied to the AgentTerminal composable; opens the SSE stream for [id]. */
    fun connectEvents(id: String): Flow<RunStreamEvent> =
        runEventStream.connect(serverConfig.getBaseUrl(), id, sessionManager.getSessionId())

    fun onStreamStatusChange(newStatus: String) {
        _uiState.value.run?.let { current ->
            _uiState.value = _uiState.value.copy(run = current.copy(status = newStatus))
        }
    }

    // Public (ViewModel.onCleared() is protected) so tests can deterministically
    // stop the polling loop instead of leaving a pending delayed task behind.
    public override fun onCleared() {
        pollJob?.cancel()
    }
}
