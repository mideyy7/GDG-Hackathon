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
import androidx.compose.material3.OutlinedTextField
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
import com.devclaw.dashboard.ui.theme.Brand
import com.devclaw.dashboard.ui.theme.Gray400
import com.devclaw.dashboard.ui.theme.Gray500
import com.devclaw.dashboard.ui.theme.Green400
import com.devclaw.dashboard.ui.theme.Red400

/** Mirrors apps/dashboard/src/pages/Repositories.tsx. */
@Composable
fun RepositoriesScreen(onRepoLinked: () -> Unit) {
    val container = LocalAppContainer.current
    val viewModel: RepositoriesViewModel = viewModel(
        factory = viewModelFactory {
            initializer { RepositoriesViewModel(container.repository, onRepoLinked) }
        }
    )
    val uiState by viewModel.uiState.collectAsState()

    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        Text("Repositories", fontWeight = FontWeight.Black, fontSize = 22.sp)
        Text(
            "Select a GitHub repository to link as your active project.",
            color = Gray400,
            fontSize = 13.sp,
            modifier = Modifier.padding(bottom = 16.dp),
        )

        uiState.linkedRepo?.let {
            Card(modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp)) {
                Column(modifier = Modifier.padding(12.dp)) {
                    Text("ACTIVE REPOSITORY", color = Gray500, fontSize = 10.sp)
                    Text(it, color = Green400, fontSize = 13.sp)
                }
            }
        }

        uiState.success?.let {
            Text("✓ $it", color = Green400, fontSize = 13.sp, modifier = Modifier.padding(bottom = 8.dp))
        }
        uiState.error?.let {
            Text(it, color = Red400, fontSize = 13.sp, modifier = Modifier.padding(bottom = 8.dp))
        }

        if (!uiState.loading && uiState.repos.isNotEmpty()) {
            OutlinedTextField(
                value = uiState.search,
                onValueChange = viewModel::onSearchChange,
                placeholder = { Text("Search repositories…") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp),
            )
        }

        when {
            uiState.loading -> CircularProgressIndicator(color = Brand)
            uiState.filtered.isEmpty() -> Text(
                if (uiState.repos.isEmpty()) "No repositories found on your GitHub account." else "No repositories match your search.",
                color = Gray400,
            )
            else -> LazyColumn(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                items(uiState.filtered, key = { it.fullName }) { repo ->
                    val isLinked = repo.fullName == uiState.linkedRepo
                    val isLinking = uiState.linking == repo.fullName
                    Card {
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(12.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(repo.fullName, fontSize = 13.sp)
                                repo.description?.let { Text(it, color = Gray400, fontSize = 11.sp) }
                                Text(
                                    "${repo.defaultBranch} · updated ${repo.updatedAt.take(10)}",
                                    color = Gray500,
                                    fontSize = 10.sp,
                                )
                            }
                            Button(onClick = { viewModel.link(repo.fullName) }, enabled = !isLinking && !isLinked) {
                                Text(if (isLinking) "Linking…" else if (isLinked) "✓ Active" else "Link")
                            }
                        }
                    }
                }
            }
        }
    }
}
