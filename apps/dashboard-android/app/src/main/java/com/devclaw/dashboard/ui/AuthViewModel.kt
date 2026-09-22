package com.devclaw.dashboard.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.devclaw.dashboard.data.DashboardRepository
import com.devclaw.dashboard.data.SessionManager
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class AuthState(
    val loading: Boolean = true,
    val authenticated: Boolean = false,
    val linkedRepo: String? = null,
)

/**
 * App-wide auth/session state, mirroring the `appState` + `checkAuth()` logic
 * that lives in App.tsx on the web dashboard. A single instance is shared by
 * MainActivity so both the login gate and the "linked repo" badge in the top
 * bar stay in sync.
 */
class AuthViewModel(
    private val repository: DashboardRepository,
    private val sessionManager: SessionManager,
) : ViewModel() {

    private val _state = MutableStateFlow(AuthState())
    val state: StateFlow<AuthState> = _state.asStateFlow()

    init {
        checkAuth()
    }

    fun checkAuth() {
        sessionManager.getOrCreateSessionId()
        viewModelScope.launch {
            _state.value = _state.value.copy(loading = true)
            val result = repository.fetchUserStatus()
            _state.value = result.fold(
                onSuccess = { AuthState(loading = false, authenticated = it.authenticated, linkedRepo = it.linkedRepo) },
                onFailure = { AuthState(loading = false, authenticated = false, linkedRepo = null) },
            )
        }
    }

    fun logout() {
        sessionManager.clearSession()
        _state.value = AuthState(loading = false, authenticated = false, linkedRepo = null)
    }
}
