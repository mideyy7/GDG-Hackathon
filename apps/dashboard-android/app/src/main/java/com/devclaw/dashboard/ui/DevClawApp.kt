package com.devclaw.dashboard.ui

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.devclaw.dashboard.ui.components.AppDestination
import com.devclaw.dashboard.ui.components.AppScaffold
import com.devclaw.dashboard.ui.screens.LoginScreen
import com.devclaw.dashboard.ui.screens.NewTaskScreen
import com.devclaw.dashboard.ui.screens.OverviewScreen
import com.devclaw.dashboard.ui.screens.RepositoriesScreen
import com.devclaw.dashboard.ui.screens.RunDetailScreen
import com.devclaw.dashboard.ui.screens.RunsScreen

private object Routes {
    const val OVERVIEW = "overview"
    const val REPOSITORIES = "repositories"
    const val NEW_TASK = "new-task"
    const val RUNS = "runs"
    const val RUN_DETAIL = "runs/{runId}"
    fun runDetail(runId: String) = "runs/$runId"
}

/**
 * Root composable, mirroring the <Routes> tree in apps/dashboard/src/App.tsx:
 * a public login screen, and a protected route tree behind an auth gate.
 */
@Composable
fun DevClawApp(authViewModel: AuthViewModel) {
    val authState by authViewModel.state.collectAsState()

    when {
        authState.loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            CircularProgressIndicator()
        }
        !authState.authenticated -> LoginScreen(onAuthCheckRequested = authViewModel::checkAuth)
        else -> AuthenticatedApp(
            linkedRepo = authState.linkedRepo,
            onLogout = authViewModel::logout,
            onRepoLinked = authViewModel::checkAuth,
        )
    }
}

@Composable
private fun AuthenticatedApp(linkedRepo: String?, onLogout: () -> Unit, onRepoLinked: () -> Unit) {
    val navController = rememberNavController()
    val backStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = backStackEntry?.destination?.route

    val currentDestination = when (currentRoute) {
        Routes.RUNS, Routes.RUN_DETAIL -> AppDestination.Runs
        Routes.NEW_TASK -> AppDestination.NewTask
        Routes.REPOSITORIES -> AppDestination.Repositories
        else -> AppDestination.Overview
    }

    fun navigateTo(destination: AppDestination) {
        val route = when (destination) {
            AppDestination.Overview -> Routes.OVERVIEW
            AppDestination.Runs -> Routes.RUNS
            AppDestination.NewTask -> Routes.NEW_TASK
            AppDestination.Repositories -> Routes.REPOSITORIES
        }
        navController.navigate(route) {
            popUpTo(Routes.OVERVIEW) { saveState = true }
            launchSingleTop = true
            restoreState = true
        }
    }

    AppScaffold(
        currentDestination = currentDestination,
        linkedRepo = linkedRepo,
        onNavigate = ::navigateTo,
        onLogout = onLogout,
    ) { contentModifier ->
        NavHost(navController = navController, startDestination = Routes.OVERVIEW, modifier = contentModifier) {
            composable(Routes.OVERVIEW) {
                OverviewScreen(
                    linkedRepo = linkedRepo,
                    onNewTask = { navigateTo(AppDestination.NewTask) },
                    onViewAllRuns = { navigateTo(AppDestination.Runs) },
                    onOpenRun = { runId -> navController.navigate(Routes.runDetail(runId)) },
                    onLinkRepo = { navigateTo(AppDestination.Repositories) },
                )
            }
            composable(Routes.REPOSITORIES) {
                RepositoriesScreen(onRepoLinked = onRepoLinked)
            }
            composable(Routes.NEW_TASK) {
                NewTaskScreen(
                    linkedRepo = linkedRepo,
                    onSubmitted = { runId -> navController.navigate(Routes.runDetail(runId)) },
                    onLinkRepo = { navigateTo(AppDestination.Repositories) },
                )
            }
            composable(Routes.RUNS) {
                RunsScreen(
                    onNewTask = { navigateTo(AppDestination.NewTask) },
                    onOpenRun = { runId -> navController.navigate(Routes.runDetail(runId)) },
                )
            }
            composable(Routes.RUN_DETAIL) { backStackEntry ->
                val runId = backStackEntry.arguments?.getString("runId")
                if (runId != null) {
                    RunDetailScreen(runId = runId)
                } else {
                    Text("Missing run id")
                }
            }
        }
    }
}
