package com.devclaw.dashboard.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.foundation.layout.Row
import androidx.compose.ui.Alignment
import com.devclaw.dashboard.ui.theme.Blue400
import com.devclaw.dashboard.ui.theme.Gray400
import com.devclaw.dashboard.ui.theme.Gray500
import com.devclaw.dashboard.ui.theme.Gray700
import com.devclaw.dashboard.ui.theme.Green400
import com.devclaw.dashboard.ui.theme.Orange400
import com.devclaw.dashboard.ui.theme.Purple400
import com.devclaw.dashboard.ui.theme.Red400
import com.devclaw.dashboard.ui.theme.Yellow400

/** Mirrors STATUS_CONFIG / STAGE_CONFIG in apps/dashboard/src/components/StatusBadge.tsx. */
private data class StatusStyle(val label: String, val color: Color)

private val STATUS_STYLES = mapOf(
    "planning" to StatusStyle("Planning", Blue400),
    "pending_approval" to StatusStyle("Awaiting Approval", Yellow400),
    "approved" to StatusStyle("Approved", Blue400),
    "generating" to StatusStyle("Generating", Purple400),
    "completed" to StatusStyle("Completed", Green400),
    "rejected" to StatusStyle("Rejected", Gray400),
    "failed" to StatusStyle("Failed", Red400),
    "security_blocked" to StatusStyle("Security Blocked", Orange400),
)

private val STAGE_STYLES = mapOf(
    "intake" to StatusStyle("Intake", Gray400),
    "planning" to StatusStyle("Planning", Blue400),
    "pending_approval" to StatusStyle("Awaiting Approval", Yellow400),
    "approved" to StatusStyle("Approved", Blue400),
    "generating" to StatusStyle("Generating", Purple400),
    "reviewing" to StatusStyle("Reviewing", Purple400),
    "testing" to StatusStyle("Testing", Blue400),
    "security_scan" to StatusStyle("Security Scan", Orange400),
    "pushing" to StatusStyle("Pushing Branch", Green400),
    "pr_open" to StatusStyle("Opening PR", Green400),
    "completed" to StatusStyle("Completed", Green400),
    "failed" to StatusStyle("Failed", Red400),
    "security_blocked" to StatusStyle("Security Blocked", Orange400),
    "rejected" to StatusStyle("Rejected", Gray400),
)

@Composable
fun StatusBadge(status: String, modifier: Modifier = Modifier, small: Boolean = false) {
    val style = STATUS_STYLES[status] ?: StatusStyle(status, Gray500)
    Row(
        modifier = modifier
            .background(style.color.copy(alpha = 0.12f), RoundedCornerShape(999.dp))
            .padding(horizontal = if (small) 8.dp else 10.dp, vertical = if (small) 3.dp else 5.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        Box(color = style.color)
        Text(
            text = style.label,
            color = style.color,
            fontSize = if (small) 10.sp else 11.sp,
            fontWeight = MaterialTheme.typography.labelSmall.fontWeight,
        )
    }
}

@Composable
fun StageBadge(stage: String, modifier: Modifier = Modifier) {
    val style = STAGE_STYLES[stage] ?: StatusStyle(stage, Gray400)
    Text(
        text = style.label,
        color = style.color,
        fontSize = 10.sp,
        fontFamily = MaterialTheme.typography.labelSmall.fontFamily,
        modifier = modifier
            .background(style.color.copy(alpha = 0.15f), RoundedCornerShape(6.dp))
            .padding(horizontal = 6.dp, vertical = 2.dp),
    )
}

@Composable
private fun Box(color: Color) {
    androidx.compose.foundation.layout.Box(
        modifier = Modifier
            .size(6.dp)
            .background(color, CircleShape)
    )
}
