package com.devclaw.dashboard

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.DisposableEffect
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.devclaw.dashboard.ui.AuthViewModel
import com.devclaw.dashboard.ui.DevClawApp
import com.devclaw.dashboard.ui.LocalAppContainer
import com.devclaw.dashboard.ui.theme.DevClawTheme

/**
 * Single-activity host, mirroring the top of apps/dashboard/src/App.tsx: it
 * checks auth on launch, then on every resume — the latter is what picks up
 * the session after the user completes GitHub OAuth in a Custom Tab and
 * returns to the app (see LoginScreen's doc comment for why no deep link is
 * needed for that handoff).
 */
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        val container = (application as DevClawApplication).container

        setContent {
            val authViewModel: AuthViewModel = viewModel(
                factory = viewModelFactory {
                    initializer { AuthViewModel(container.repository, container.sessionManager) }
                }
            )

            val lifecycleOwner = LocalLifecycleOwner.current
            DisposableEffect(lifecycleOwner) {
                val observer = LifecycleEventObserver { _, event ->
                    if (event == Lifecycle.Event.ON_RESUME) {
                        authViewModel.checkAuth()
                    }
                }
                lifecycleOwner.lifecycle.addObserver(observer)
                onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
            }

            DevClawTheme {
                Surface(modifier = Modifier.fillMaxSize()) {
                    CompositionLocalProvider(LocalAppContainer provides container) {
                        DevClawApp(authViewModel = authViewModel)
                    }
                }
            }
        }
    }
}
