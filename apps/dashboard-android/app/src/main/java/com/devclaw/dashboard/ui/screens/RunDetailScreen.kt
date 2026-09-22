package com.devclaw.dashboard.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.devclaw.dashboard.ui.LocalAppContainer
import com.devclaw.dashboard.ui.components.AgentTerminal
import com.devclaw.dashboard.ui.components.PRResult
import com.devclaw.dashboard.ui.components.PlanCard
import com.devclaw.dashboard.ui.components.StatusBadge
import com.devclaw.dashboard.ui.theme.Gray400
import com.devclaw.dashboard.ui.theme.Gray500
import com.devclaw.dashboard.ui.theme.Green400
import com.devclaw.dashboard.ui.theme.Orange400
import com.devclaw.dashboard.ui.theme.Red400
import com.devclaw.dashboard.ui.timeAgo

private val LIVE_TERMINAL_STATUSES = setOf("approved", "generating", "completed", "failed", "security_blocked")

/** Mirrors apps/dashboard/src/pages/RunDetail.tsx. */
@Composable
fun RunDetailScreen(runId: String) {
    val container = LocalAppContainer.current
    val viewModel: RunDetailViewModel = viewModel(
        factory = viewModelFactory {
            initializer {
                RunDetailViewModel(
                    runId = runId,
                    repository = container.repository,
                    runEventStream = container.runEventStream,
                    serverConfig = container.serverConfig,
                    sessionManager = container.sessionManager,
                )
            }
        }
    )
    val uiState by viewModel.uiState.collectAsState()

    when {
        uiState.loading -> CircularProgressIndicator()
        uiState.error != null || uiState.run == null -> Text(uiState.error ?: "Run not found", color = Red400)
        else -> {
            val run = uiState.run!!
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
                    .padding(16.dp),
            ) {
                Row(
                    horizontalArrangement = Arrangement.SpaceBetween,
                    modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp),
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(run.description, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(top = 6.dp)) {
                            Text(run.repo, color = Gray500, fontSize = 11.sp)
                            run.issueNumber?.let { Text("Issue #$it", color = Gray500, fontSize = 11.sp) }
                            Text(timeAgo(run.createdAt), color = Gray500, fontSize = 11.sp)
                        }
                    }
                    StatusBadge(status = run.status)
                }

                uiState.actionError?.let {
                    Text(it, color = Red400, fontSize = 12.sp, modifier = Modifier.padding(bottom = 8.dp))
                }

                if (run.status == "completed" && run.prUrl != null) {
                    PRResult(
                        prUrl = run.prUrl,
                        prNumber = run.prNumber,
                        branchName = run.branchName,
                        repo = run.repo,
                        issueUrl = run.issueUrl,
                        modifier = Modifier.padding(bottom = 12.dp),
                    )
                }

                if (run.status == "security_blocked") {
                    Card(modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp)) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text("🛡 Security Gate Blocked", color = Orange400, fontWeight = FontWeight.Bold)
                            Text(
                                "The generated code was blocked before being pushed because our security reviewer detected vulnerabilities. Please refine your task description and submit again.",
                                color = Gray400,
                                fontSize = 13.sp,
                                modifier = Modifier.padding(top = 4.dp),
                            )
                        }
                    }
                }

                if (run.status == "failed") {
                    Card(modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp)) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text("✕ Execution Failed", color = Red400, fontWeight = FontWeight.Bold)
                            Text(
                                "Something went wrong during execution. Check the terminal for details.",
                                color = Gray400,
                                fontSize = 13.sp,
                                modifier = Modifier.padding(top = 4.dp),
                            )
                        }
                    }
                }

                if (run.status == "planning") {
                    Card(modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp)) {
                        Row(modifier = Modifier.padding(16.dp)) {
                            Text("Generating Architecture Plan…", fontWeight = FontWeight.SemiBold)
                        }
                    }
                }

                run.planDetails?.let { plan ->
                    if (run.status == "pending_approval") {
                        PlanCard(
                            plan = plan,
                            onApprove = viewModel::approve,
                            onReject = viewModel::reject,
                            onRefine = viewModel::refine,
                            modifier = Modifier.padding(bottom = 12.dp),
                        )
                    } else {
                        Card(modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp)) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Text("ARCHITECTURE PLAN", color = Gray400, fontWeight = FontWeight.Bold, fontSize = 11.sp)
                                Text(plan.summary, fontSize = 13.sp, modifier = Modifier.padding(top = 8.dp))
                            }
                        }
                    }
                }

                if (run.status in LIVE_TERMINAL_STATUSES) {
                    AgentTerminal(
                        runId = run.id,
                        status = run.status,
                        branchName = run.branchName,
                        prUrl = run.prUrl,
                        connect = viewModel::connectEvents,
                        onStatusChange = viewModel::onStreamStatusChange,
                        modifier = Modifier.padding(bottom = 12.dp),
                    )
                }

                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text("RUN DETAILS", color = Gray400, fontWeight = FontWeight.Bold, fontSize = 11.sp)
                        DetailRow("Run ID", run.id)
                        DetailRow("Plan ID", run.planId ?: "—")
                        DetailRow("Repository", run.repo)
                        DetailRow("Channel", run.channel)
                        DetailRow("Created", run.createdAt)
                    }
                }
            }
        }
    }
}

@Composable
private fun DetailRow(label: String, value: String) {
    Row(
        horizontalArrangement = Arrangement.SpaceBetween,
        modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
    ) {
        Text(label, color = Gray500, fontSize = 11.sp)
        Text(value, color = Gray400, fontSize = 11.sp)
    }
}
