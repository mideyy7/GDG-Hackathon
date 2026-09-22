package com.devclaw.dashboard.data

import android.content.Context
import com.devclaw.dashboard.data.remote.ApiClient
import com.devclaw.dashboard.data.remote.RunEventStream
import okhttp3.OkHttpClient

/**
 * Minimal hand-rolled DI container (no Hilt/Dagger — this app is small enough
 * that manual wiring stays readable). One instance lives on [com.devclaw.dashboard.DevClawApplication]
 * for the process lifetime; ViewModels receive their dependencies through
 * [com.devclaw.dashboard.ui.ViewModelFactory].
 */
class AppContainer(context: Context) {

    val sessionManager = SessionManager(context)
    val serverConfig = ServerConfig(context)

    private val baseOkHttpClient: OkHttpClient = ApiClient.buildOkHttpClient(sessionManager)
    private val sseOkHttpClient: OkHttpClient = ApiClient.buildSseClient(baseOkHttpClient)

    val runEventStream = RunEventStream(sseOkHttpClient)

    /**
     * The API service is rebuilt whenever the configured base URL changes
     * (e.g. the user edits the server address on the login screen), since
     * Retrofit binds a base URL at construction time.
     */
    val repository: DashboardRepository
        get() = DashboardRepositoryImpl(
            ApiClient.buildApiService(serverConfig.getBaseUrl(), baseOkHttpClient)
        )
}
