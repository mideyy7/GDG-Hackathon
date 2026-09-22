package com.devclaw.dashboard.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.devclaw.dashboard.ui.theme.Gray100
import com.devclaw.dashboard.ui.theme.Gray400
import com.devclaw.dashboard.ui.theme.Gray700
import com.devclaw.dashboard.ui.theme.Green400

/** Mirrors apps/dashboard/src/components/PRResult.tsx. */
@Composable
fun PRResult(
    prUrl: String,
    prNumber: Int?,
    branchName: String?,
    repo: String,
    issueUrl: String?,
    modifier: Modifier = Modifier,
) {
    val uriHandler = LocalUriHandler.current
    val branchUrl = branchName?.let { "https://github.com/$repo/tree/$it" }

    Card(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = Green400.copy(alpha = 0.05f)),
        shape = RoundedCornerShape(16.dp),
    ) {
        Column(modifier = Modifier.padding(20.dp)) {
            Text("✓ CODE READY", color = Green400, fontWeight = FontWeight.Bold, fontSize = 12.sp)

            Row(
                horizontalArrangement = Arrangement.SpaceBetween,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 16.dp)
                    .background(Gray700.copy(alpha = 0.4f), RoundedCornerShape(10.dp))
                    .padding(12.dp),
            ) {
                Column {
                    Text("PULL REQUEST", color = Gray400, fontSize = 10.sp)
                    Text("PR #${prNumber ?: "—"}", color = Gray100, fontSize = 14.sp)
                }
                Button(onClick = { uriHandler.openUri(prUrl) }) { Text("View PR →") }
            }

            if (branchName != null) {
                Row(
                    horizontalArrangement = Arrangement.SpaceBetween,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 10.dp)
                        .background(Gray700.copy(alpha = 0.4f), RoundedCornerShape(10.dp))
                        .padding(12.dp),
                ) {
                    Column {
                        Text("BRANCH", color = Gray400, fontSize = 10.sp)
                        Text(
                            branchName,
                            color = Gray100,
                            fontSize = 12.sp,
                            fontFamily = MaterialTheme.typography.labelSmall.fontFamily,
                        )
                    }
                    if (branchUrl != null) {
                        Button(onClick = { uriHandler.openUri(branchUrl) }) { Text("Browse →") }
                    }
                }
            }

            if (issueUrl != null) {
                Row(
                    horizontalArrangement = Arrangement.SpaceBetween,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 10.dp)
                        .background(Gray700.copy(alpha = 0.4f), RoundedCornerShape(10.dp))
                        .padding(12.dp),
                ) {
                    Column {
                        Text("ISSUE", color = Gray400, fontSize = 10.sp)
                        Text(
                            issueUrl.split("/").takeLast(2).joinToString("#"),
                            color = Gray100,
                            fontSize = 12.sp,
                        )
                    }
                    Button(onClick = { uriHandler.openUri(issueUrl) }) { Text("View →") }
                }
            }
        }
    }
}
