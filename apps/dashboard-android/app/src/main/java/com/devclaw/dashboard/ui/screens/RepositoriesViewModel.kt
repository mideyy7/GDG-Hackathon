package com.devclaw.dashboard.ui.screens

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.devclaw.dashboard.data.DashboardRepository
import com.devclaw.dashboard.data.remote.dto.GitHubRepo
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class RepositoriesUiState(
    val loading: Boolean = true,
    val repos: List<GitHubRepo> = emptyList(),
    val linkedRepo: String? = null,
    val linking: String? = null,
    val search: String = "",
    val error: String? = null,
    val success: String? = null,
) {
    val filtered: List<GitHubRepo>
        get() = if (search.isBlank()) repos
        else repos.filter { it.fullName.contains(search, ignoreCase = true) }
}

/** Mirrors apps/dashboard/src/pages/Repositories.tsx. */
class RepositoriesViewModel(
    private val repository: DashboardRepository,
    private val onRepoLinked: () -> Unit,
) : ViewModel() {

    private val _uiState = MutableStateFlow(RepositoriesUiState())
    val uiState: StateFlow<RepositoriesUiState> = _uiState.asStateFlow()

    init {
        load()
    }

    fun load() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(loading = true)
            val reposResult = repository.fetchGitHubRepos()
            val statusResult = repository.fetchUserStatus()

            if (reposResult.isFailure) {
                _uiState.value = _uiState.value.copy(
                    loading = false,
                    error = reposResult.exceptionOrNull()?.message,
                )
                return@launch
            }
            _uiState.value = _uiState.value.copy(
                loading = false,
                repos = reposResult.getOrDefault(emptyList()),
                linkedRepo = statusResult.getOrNull()?.linkedRepo,
                error = null,
            )
        }
    }

    fun onSearchChange(value: String) {
        _uiState.value = _uiState.value.copy(search = value)
    }

    fun link(fullName: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(linking = fullName, error = null, success = null)
            val result = repository.linkRepository(fullName)
            _uiState.value = result.fold(
                onSuccess = {
                    onRepoLinked()
                    _uiState.value.copy(
                        linking = null,
                        linkedRepo = fullName,
                        success = "Linked $fullName as your active repository.",
                    )
                },
                onFailure = { _uiState.value.copy(linking = null, error = it.message) },
            )
        }
    }
}
