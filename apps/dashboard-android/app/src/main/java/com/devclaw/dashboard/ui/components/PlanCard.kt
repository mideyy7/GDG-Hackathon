package com.devclaw.dashboard.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.wrapContentWidth
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.devclaw.dashboard.data.remote.dto.ArchitecturePlan
import com.devclaw.dashboard.ui.theme.Gray100
import com.devclaw.dashboard.ui.theme.Gray400
import com.devclaw.dashboard.ui.theme.Gray700
import com.devclaw.dashboard.ui.theme.Indigo400
import com.devclaw.dashboard.ui.theme.Orange400
import com.devclaw.dashboard.ui.theme.Red400
import com.devclaw.dashboard.ui.theme.Yellow400
import kotlinx.coroutines.launch

private enum class PlanAction { APPROVE, REJECT, REFINE }

/** Mirrors apps/dashboard/src/components/PlanCard.tsx. */
@Composable
fun PlanCard(
    plan: ArchitecturePlan,
    onApprove: suspend () -> Result<Unit>,
    onReject: suspend () -> Result<Unit>,
    onRefine: suspend (String) -> Result<Unit>,
    modifier: Modifier = Modifier,
) {
    var refineMode by remember { mutableStateOf(false) }
    var refinement by remember { mutableStateOf("") }
    var loading by remember { mutableStateOf<PlanAction?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    fun run(action: PlanAction, block: suspend () -> Result<Unit>) {
        error = null
        loading = action
        scope.launch {
            val result = block()
            result.onFailure { error = it.message ?: "Action failed" }
            if (result.isSuccess && action == PlanAction.REFINE) {
                refineMode = false
                refinement = ""
            }
            loading = null
        }
    }

    Card(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = Yellow400.copy(alpha = 0.05f)),
        shape = RoundedCornerShape(16.dp),
    ) {
        Column(modifier = Modifier.padding(20.dp)) {
            Text(
                "ARCHITECTURE PLAN — AWAITING APPROVAL",
                color = Yellow400,
                fontWeight = FontWeight.Bold,
                fontSize = 12.sp,
            )
            Text(
                plan.summary,
                color = Gray100,
                fontSize = 14.sp,
                modifier = Modifier.padding(top = 12.dp, bottom = 16.dp),
            )

            if (plan.affectedFiles.isNotEmpty()) {
                Text("FILES TO CHANGE", color = Gray400, fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
                Column(modifier = Modifier.padding(top = 6.dp, bottom = 12.dp)) {
                    plan.affectedFiles.forEach { file ->
                        Text(
                            file,
                            color = Gray100,
                            fontSize = 11.sp,
                            fontFamily = androidx.compose.ui.text.font.FontFamily.Monospace,
                            modifier = Modifier
                                .background(Gray700, RoundedCornerShape(4.dp))
                                .padding(horizontal = 6.dp, vertical = 3.dp)
                                .wrapContentWidth(),
                        )
                    }
                }
            }

            if (plan.agentAssignments.isNotEmpty()) {
                Text("AGENT ASSIGNMENTS", color = Gray400, fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
                Column(modifier = Modifier.padding(top = 6.dp, bottom = 12.dp)) {
                    plan.agentAssignments.forEach { a ->
                        Text(
                            "[${a.domain}] ${a.generator} → ${a.reviewer}",
                            color = Indigo400,
                            fontSize = 11.sp,
                            fontFamily = androidx.compose.ui.text.font.FontFamily.Monospace,
                        )
                    }
                }
            }

            if (plan.riskFlags.isNotEmpty()) {
                Text("RISK FLAGS", color = Orange400, fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
                Column(modifier = Modifier.padding(top = 6.dp, bottom = 16.dp)) {
                    plan.riskFlags.forEach { risk ->
                        Text("⚠ $risk", color = Orange400, fontSize = 13.sp)
                    }
                }
            }

            if (refineMode) {
                OutlinedTextField(
                    value = refinement,
                    onValueChange = { refinement = it },
                    placeholder = { Text("Describe what you'd like changed in this plan...") },
                    enabled = loading != PlanAction.REFINE,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 12.dp),
                    minLines = 3,
                )
            }

            error?.let {
                Text(
                    it,
                    color = Red400,
                    fontSize = 12.sp,
                    modifier = Modifier
                        .background(Red400.copy(alpha = 0.1f), RoundedCornerShape(8.dp))
                        .padding(10.dp)
                        .fillMaxWidth(),
                )
            }

            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.padding(top = 12.dp),
            ) {
                Button(
                    onClick = { run(PlanAction.APPROVE) { onApprove() } },
                    enabled = loading == null,
                ) {
                    Text(if (loading == PlanAction.APPROVE) "Approving…" else "✓ Approve & Execute")
                }

                if (refineMode) {
                    OutlinedButton(
                        onClick = { run(PlanAction.REFINE) { onRefine(refinement) } },
                        enabled = loading == null && refinement.isNotBlank(),
                    ) {
                        Text(if (loading == PlanAction.REFINE) "Refining…" else "Submit")
                    }
                    TextButton(onClick = { refineMode = false; refinement = "" }, enabled = loading == null) {
                        Text("Cancel")
                    }
                } else {
                    OutlinedButton(onClick = { refineMode = true }, enabled = loading == null) {
                        Text("✏ Refine")
                    }
                }

                TextButton(
                    onClick = { run(PlanAction.REJECT) { onReject() } },
                    enabled = loading == null,
                ) {
                    Text(if (loading == PlanAction.REJECT) "Rejecting…" else "✕ Reject", color = Red400)
                }
            }
        }
    }
}
