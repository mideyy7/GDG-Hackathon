package com.devclaw.dashboard.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable

private val DevClawColorScheme = darkColorScheme(
    primary = Brand,
    onPrimary = Gray950,
    secondary = BrandDark,
    background = Gray950,
    onBackground = Gray100,
    surface = Gray800,
    onSurface = Gray100,
    surfaceVariant = Gray700,
    onSurfaceVariant = Gray400,
    error = Red400,
)

/**
 * CoreDev / Mission Control theme — a dark, high-contrast palette matching the
 * web dashboard's Tailwind theme (apps/dashboard/tailwind.config.js). The web
 * app is dark-mode-only, so this app is too; [isSystemInDarkTheme] isn't consulted.
 */
@Composable
fun DevClawTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = DevClawColorScheme,
        typography = DevClawTypography,
        content = content,
    )
}
