package com.devclaw.dashboard.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.devclaw.dashboard.data.remote.RunStreamEvent
import com.devclaw.dashboard.data.remote.dto.RunEvent
import com.devclaw.dashboard.ui.theme.Blue400
import com.devclaw.dashboard.ui.theme.Gray400
import com.devclaw.dashboard.ui.theme.Gray500
import com.devclaw.dashboard.ui.theme.Gray700
import com.devclaw.dashboard.ui.theme.Gray950
import com.devclaw.dashboard.ui.theme.Green400
import com.devclaw.dashboard.ui.theme.Indigo400
import com.devclaw.dashboard.ui.theme.Orange400
import com.devclaw.dashboard.ui.theme.Purple400
import com.devclaw.dashboard.ui.theme.Red400
import com.devclaw.dashboard.ui.theme.Teal400
import com.devclaw.dashboard.ui.theme.Yellow400
import com.devclaw.dashboard.ui.formatTime
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.collect

private val STAGE_ORDER = listOf(
    "intake", "planning", "pending_approval", "approved", "generating",
    "reviewing", "testing", "security_scan", "pushing", "pr_open", "completed",
)

private val EVENT_TYPE_COLOR = mapOf(
    "stage_change" to Blue400,
    "log" to Gray400,
    "plan_ready" to Yellow400,
    "execution_started" to Purple400,
    "agent_iteration" to Indigo400,
    "security_scan" to Orange400,
    "branch_pushed" to Teal400,
    "pr_opened" to Green400,
    "error" to Red400,
    "completed" to Green400,
)

private val LIVE_STATUSES = setOf("approved", "generating")
private val TERMINAL_STATUSES = setOf("completed", "failed", "security_blocked", "rejected")

/**
 * Mirrors apps/dashboard/src/components/AgentTerminal.tsx: connects to the SSE
 * event stream for [runId] and renders a stage timeline, summary cards, and a
 * scrolling log. [connect] is supplied by the screen's ViewModel so this
 * composable stays free of networking/DI concerns.
 */
@Composable
fun AgentTerminal(
    runId: String,
    status: String,
    branchName: String?,
    prUrl: String?,
    connect: (String) -> Flow<RunStreamEvent>,
    onStatusChange: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    var events by remember(runId) { mutableStateOf<List<RunEvent>>(emptyList()) }
    var connected by remember(runId) { mutableStateOf(false) }
    var streamError by remember(runId) { mutableStateOf(false) }

    LaunchedEffect(runId) {
        connect(runId).collect { streamEvent ->
            when (streamEvent) {
                is RunStreamEvent.Connected -> {
                    connected = true
                    streamError = false
                }
                is RunStreamEvent.Message -> {
                    val event = streamEvent.event
                    if (events.none { it.id == event.id }) {
                        events = events + event
                    }
                    if (event.eventType == "completed" || event.eventType == "error") {
                        onStatusChange(event.stage)
                    }
                }
                is RunStreamEvent.StreamError -> {
                    connected = false
                    streamError = true
                }
            }
        }
    }

    val isLive = status in LIVE_STATUSES
    val isTerminal = status in TERMINAL_STATUSES
    val listState = rememberLazyListState()
    LaunchedEffect(events.size) {
        if (events.isNotEmpty()) listState.animateScrollToItem(events.size - 1)
    }

    Card(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(),
        shape = RoundedCornerShape(16.dp),
    ) {
        Column(modifier = Modifier.padding(20.dp)) {
            Row(
                horizontalArrangement = Arrangement.SpaceBetween,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("AGENT TERMINAL", color = Gray400, fontWeight = FontWeight.Bold, fontSize = 11.sp)
                    when {
                        isLive && !streamError -> Text(
                            if (connected) "● Live" else "Connecting…",
                            color = Green400,
                            fontSize = 11.sp,
                        )
                        streamError -> Text("Stream unavailable — polling", color = Yellow400, fontSize = 11.sp)
                        isTerminal -> Text("${events.size} events", color = Gray500, fontSize = 11.sp)
                    }
                }
            }

            StageTimeline(events = events, currentStatus = status, modifier = Modifier.padding(vertical = 12.dp))

            SummaryCards(events, branchName, prUrl)

            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(max = 260.dp)
                    .background(Gray950, RoundedCornerShape(10.dp))
                    .padding(10.dp),
            ) {
                if (events.isEmpty()) {
                    Text(
                        if (isLive) "Waiting for events" else "No events recorded",
                        color = Gray500,
                        fontSize = 11.sp,
                    )
                } else {
                    LazyColumn(state = listState, verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        items(events, key = { it.id }) { event -> LogRow(event) }
                    }
                }
            }
        }
    }
}

@Composable
private fun LogRow(event: RunEvent) {
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(
            formatTime(event.createdAt),
            color = Gray500,
            fontSize = 10.sp,
            fontFamily = MaterialTheme.typography.labelSmall.fontFamily,
        )
        StageBadge(stage = event.stage)
        Text(
            event.message,
            color = EVENT_TYPE_COLOR[event.eventType] ?: Gray400,
            fontSize = 11.sp,
            fontFamily = MaterialTheme.typography.labelSmall.fontFamily,
        )
    }
}

@Composable
private fun StageTimeline(events: List<RunEvent>, currentStatus: String, modifier: Modifier = Modifier) {
    val seenStages = remember(events) { events.map { it.stage }.toSet() }
    val currentIdx = STAGE_ORDER.indexOf(currentStatus)

    Row(modifier = modifier, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
        STAGE_ORDER.forEachIndexed { idx, stage ->
            val seen = seenStages.contains(stage) || idx <= currentIdx
            val active = stage == currentStatus
            val failed = currentStatus == "failed" && idx == currentIdx
            val color = when {
                failed -> Red400
                active -> com.devclaw.dashboard.ui.theme.Brand
                seen -> Green400
                else -> Gray700
            }
            Box(modifier = Modifier.size(8.dp).background(color, CircleShape))
        }
    }
}

@Composable
private fun SummaryCards(events: List<RunEvent>, branchName: String?, prUrl: String?) {
    val completed = events.find { it.eventType == "completed" }
    val error = events.find { it.eventType == "error" }
    val security = events.find { it.eventType == "security_scan" }
    val iterations = events.count { it.eventType == "agent_iteration" }

    // Prefer the completed event's payload, falling back to the run's own
    // fields — mirrors `completedEvent?.data?.branchName || branchName` in
    // AgentTerminal.tsx.
    val effectiveBranch = completed?.data?.get("branchName")?.stringOrNull() ?: branchName
    val effectivePrUrl = completed?.data?.get("prUrl")?.stringOrNull() ?: prUrl

    val hasAny = (effectiveBranch != null) || (effectivePrUrl != null) || iterations > 0 || security != null || error != null
    if (!hasAny) return

    Column(modifier = Modifier.padding(bottom = 12.dp)) {
        if (effectiveBranch != null) {
            SummaryLine("BRANCH", effectiveBranch, Teal400)
        }
        if (effectivePrUrl != null) {
            SummaryLine("PULL REQUEST", "View PR →", Green400)
        }
        if (iterations > 0) {
            SummaryLine("AGENT ITERATIONS", iterations.toString(), Color.White)
        }
        if (security != null) {
            val blocked = security.data?.get("blocked")?.booleanOrNull() == true
            SummaryLine("SECURITY SCAN", if (blocked) "⚠ Blocked" else "✓ Passed", if (blocked) Orange400 else Green400)
        }
        if (error != null) {
            SummaryLine("ERROR", error.message, Red400)
        }
    }
}

private fun kotlinx.serialization.json.JsonElement.stringOrNull(): String? {
    val primitive = this as? kotlinx.serialization.json.JsonPrimitive ?: return null
    return primitive.takeIf { it.isString }?.content
}

private fun kotlinx.serialization.json.JsonElement.booleanOrNull(): Boolean? {
    val primitive = this as? kotlinx.serialization.json.JsonPrimitive ?: return null
    return primitive.content.toBooleanStrictOrNull()
}

@Composable
private fun SummaryLine(label: String, value: String, color: Color) {
    Column(modifier = Modifier.padding(vertical = 3.dp)) {
        Text(label, color = Gray500, fontSize = 9.sp)
        Text(value, color = color, fontSize = 12.sp)
    }
}
