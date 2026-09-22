package com.devclaw.dashboard.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.List
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Storage
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.devclaw.dashboard.ui.theme.Brand
import com.devclaw.dashboard.ui.theme.Gray400
import com.devclaw.dashboard.ui.theme.Gray500
import com.devclaw.dashboard.ui.theme.Gray800
import com.devclaw.dashboard.ui.theme.Gray950
import com.devclaw.dashboard.ui.theme.Green400

/** Nav destinations shown in the bottom bar, mirroring NAV_LINKS in apps/dashboard/src/components/Layout.tsx. */
enum class AppDestination(val route: String, val label: String) {
    Overview("overview", "Overview"),
    Runs("runs", "Runs"),
    NewTask("new-task", "New Task"),
    Repositories("repositories", "Repos"),
}

/**
 * Mirrors apps/dashboard/src/components/Layout.tsx: a persistent chrome (top
 * bar with linked-repo indicator + logout, bottom nav for the four primary
 * routes) wrapping whichever screen content is active.
 */
@OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)
@Composable
fun AppScaffold(
    currentDestination: AppDestination,
    linkedRepo: String?,
    onNavigate: (AppDestination) -> Unit,
    onLogout: () -> Unit,
    content: @Composable (Modifier) -> Unit,
) {
    Scaffold(
        containerColor = Gray950,
        topBar = {
            TopAppBar(
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text("Core", color = androidx.compose.ui.graphics.Color.White, fontWeight = FontWeight.Black)
                        Text("Dev", color = Brand, fontWeight = FontWeight.Black)
                    }
                },
                actions = {
                    if (linkedRepo != null) {
                        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(end = 8.dp)) {
                            androidx.compose.foundation.layout.Box(
                                modifier = Modifier
                                    .padding(end = 6.dp)
                                    .size(6.dp)
                                    .background(Green400, CircleShape)
                            )
                            Text(linkedRepo, color = Gray500, fontSize = 11.sp)
                        }
                    }
                    TextButton(onClick = onLogout) {
                        Text("Logout", color = Gray400, fontSize = 12.sp)
                    }
                },
                colors = androidx.compose.material3.TopAppBarDefaults.topAppBarColors(
                    containerColor = Gray950,
                    titleContentColor = androidx.compose.ui.graphics.Color.White,
                ),
            )
        },
        bottomBar = {
            NavigationBar(containerColor = Gray800) {
                AppDestination.entries.forEach { destination ->
                    NavigationBarItem(
                        selected = destination == currentDestination,
                        onClick = { onNavigate(destination) },
                        icon = { Icon(iconFor(destination), contentDescription = destination.label) },
                        label = { Text(destination.label, fontSize = 11.sp) },
                    )
                }
            }
        },
    ) { paddingValues ->
        content(Modifier.padding(paddingValues))
    }
}

private fun iconFor(destination: AppDestination) = when (destination) {
    AppDestination.Overview -> Icons.Filled.Home
    AppDestination.Runs -> Icons.AutoMirrored.Filled.List
    AppDestination.NewTask -> Icons.Filled.Add
    AppDestination.Repositories -> Icons.Filled.Storage
}
