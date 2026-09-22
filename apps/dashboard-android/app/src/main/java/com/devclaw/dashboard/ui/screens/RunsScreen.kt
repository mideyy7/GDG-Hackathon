package com.devclaw.dashboard.ui.screens

import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.devclaw.dashboard.ui.LocalAppContainer
import com.devclaw.dashboard.ui.components.RunCard
import com.devclaw.dashboard.ui.theme.Brand
import com.devclaw.dashboard.ui.theme.Gray400
import com.devclaw.dashboard.ui.theme.Gray500
import com.devclaw.dashboard.ui.theme.Red400

/** Mirrors apps/dashboard/src/pages/Runs.tsx. */
@Composable
fun RunsScreen(onNewTask: () -> Unit, onOpenRun: (String) -> Unit) {
    val container = LocalAppContainer.current
    val viewModel: RunsViewModel = viewModel(
        factory = viewModelFactory { initializer { RunsViewModel(container.repository) } }
    )
    val uiState by viewModel.uiState.collectAsState()

    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        Row(
            horizontalArrangement = Arrangement.SpaceBetween,
            modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp),
        ) {
            Column {
                Text("Runs", fontWeight = FontWeight.Black, fontSize = 22.sp)
                Text("All task runs and their current status.", color = Gray400, fontSize = 12.sp)
            }
            Button(onClick = onNewTask) { Text("+ New") }
        }

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(rememberScrollState())
                .padding(bottom = 12.dp),
            horizontalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            STATUS_FILTERS.forEach { status ->
                val count = if (status == "all") uiState.runs.size else uiState.runs.count { it.status == status }
                TextButton(onClick = { viewModel.setFilter(status) }) {
                    Text(
                        "${if (status == "all") "All" else status.replace('_', ' ')} ($count)",
                        color = if (uiState.filter == status) androidx.compose.ui.graphics.Color.White else Gray500,
                        fontWeight = if (uiState.filter == status) FontWeight.Bold else FontWeight.Normal,
                        fontSize = 12.sp,
                    )
                }
            }
        }

        when {
            uiState.loading && uiState.runs.isEmpty() -> CircularProgressIndicator(color = Brand)
            uiState.error != null -> Column {
                Text("Failed to load runs: ${uiState.error}", color = Red400)
                Button(onClick = viewModel::retry, modifier = Modifier.padding(top = 8.dp)) { Text("Retry") }
            }
            uiState.filtered.isEmpty() -> Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth().padding(top = 24.dp)) {
                Text("🤖", fontSize = 28.sp)
                Text(
                    if (uiState.filter == "all") "No runs yet" else "No ${uiState.filter.replace('_', ' ')} runs",
                    color = Gray400,
                )
                if (uiState.filter == "all") {
                    Button(onClick = onNewTask, modifier = Modifier.padding(top = 8.dp)) { Text("Submit Your First Task") }
                }
            }
            else -> LazyColumn(verticalArrangement = Arrangement.spacedBy(4.dp), modifier = Modifier.weight(1f)) {
                items(uiState.filtered, key = { it.id }) { run ->
                    Card { RunCard(run = run, onClick = { onOpenRun(run.id) }) }
                }
                if (uiState.hasMore) {
                    item {
                        TextButton(onClick = viewModel::loadMore, enabled = !uiState.loading) {
                            Text(if (uiState.loading) "Loading…" else "Load More")
                        }
                    }
                }
            }
        }
    }
}
