package com.devclaw.dashboard.ui

import androidx.compose.runtime.staticCompositionLocalOf
import com.devclaw.dashboard.data.AppContainer

/** Provided once, near the Compose root, by MainActivity. */
val LocalAppContainer = staticCompositionLocalOf<AppContainer> {
    error("LocalAppContainer not provided")
}
