package com.devclaw.dashboard.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
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
import com.devclaw.dashboard.ui.theme.Green400
import com.devclaw.dashboard.ui.theme.Purple400
import com.devclaw.dashboard.ui.theme.Red400
import com.devclaw.dashboard.ui.theme.Yellow400

/** Mirrors apps/dashboard/src/pages/Overview.tsx. */
@Composable
fun OverviewScreen(
    linkedRepo: String?,
    onNewTask: () -> Unit,
    onViewAllRuns: () -> Unit,
    onOpenRun: (String) -> Unit,
    onLinkRepo: () -> Unit,
) {
    val container = LocalAppContainer.current
    val viewModel: OverviewViewModel = viewModel(
        factory = viewModelFactory { initializer { OverviewViewModel(container.repository) } }
    )
    val uiState by viewModel.uiState.collectAsState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
    ) {
        Text("Dashboard", fontWeight = FontWeight.Black, fontSize = 22.sp)
        Text(
            "AI engineering control center — submit tasks, review plans, ship code.",
            color = Gray400,
            fontSize = 13.sp,
            modifier = Modifier.padding(bottom = 16.dp),
        )

        if (linkedRepo == null) {
            Card(modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp)) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("⚡ Link a Repository to Get Started", color = Yellow400, fontWeight = FontWeight.Bold)
                    Text(
                        "Connect a GitHub repository to start submitting AI coding tasks.",
                        color = Gray400,
                        fontSize = 13.sp,
                        modifier = Modifier.padding(top = 4.dp, bottom = 8.dp),
                    )
                    Button(onClick = onLinkRepo) { Text("Link Repository →") }
                }
            }
        }

        Row(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp),
        ) {
            StatTile("Recent Runs", uiState.total, Modifier.weight(1f))
            StatTile("Completed", uiState.completed, Modifier.weight(1f), Green400)
        }
        Row(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp),
        ) {
            StatTile("Active", uiState.active, Modifier.weight(1f), Purple400)
            StatTile("Pending", uiState.pending, Modifier.weight(1f), Yellow400)
        }

        Row(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp),
        ) {
            Button(onClick = onNewTask, modifier = Modifier.weight(1f)) { Text("+ New Task") }
            Button(onClick = onViewAllRuns, modifier = Modifier.weight(1f)) { Text("All Runs") }
        }

        Text(
            "RECENT RUNS",
            color = Gray400,
            fontWeight = FontWeight.Bold,
            fontSize = 11.sp,
            modifier = Modifier.padding(bottom = 8.dp),
        )

        when {
            uiState.loading -> CircularProgressIndicator(color = Brand)
            uiState.error != null -> Text("Failed to load runs: ${uiState.error}", color = Red400)
            uiState.runs.isEmpty() -> Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth().padding(top = 24.dp)) {
                Text("🤖", fontSize = 28.sp)
                Text("No runs yet", color = Gray400)
                Button(onClick = onNewTask, modifier = Modifier.padding(top = 8.dp)) { Text("Submit a Task") }
            }
            else -> LazyColumn(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                items(uiState.runs, key = { it.id }) { run ->
                    Card { RunCard(run = run, onClick = { onOpenRun(run.id) }) }
                }
            }
        }
    }
}

@Composable
private fun StatTile(
    label: String,
    value: Int,
    modifier: Modifier = Modifier,
    color: androidx.compose.ui.graphics.Color = androidx.compose.ui.graphics.Color.White,
) {
    Card(modifier = modifier) {
        Column(modifier = Modifier.padding(12.dp)) {
            Text(label, color = Gray500, fontSize = 10.sp)
            Text(value.toString(), color = color, fontWeight = FontWeight.Black, fontSize = 28.sp)
        }
    }
}
