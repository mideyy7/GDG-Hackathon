package com.devclaw.dashboard.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.devclaw.dashboard.data.remote.dto.TaskRunSummary
import com.devclaw.dashboard.ui.theme.Gray400
import com.devclaw.dashboard.ui.theme.Gray500
import com.devclaw.dashboard.ui.theme.Gray700
import com.devclaw.dashboard.ui.theme.Green400
import com.devclaw.dashboard.ui.theme.Gray100
import com.devclaw.dashboard.ui.timeAgo

/** Mirrors apps/dashboard/src/components/RunCard.tsx. */
@Composable
fun RunCard(run: TaskRunSummary, onClick: () -> Unit, modifier: Modifier = Modifier) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 20.dp, vertical = 16.dp)
    ) {
        Row(
            horizontalArrangement = Arrangement.SpaceBetween,
            modifier = Modifier.fillMaxWidth(),
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = run.description,
                    color = Gray100,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 14.sp,
                    maxLines = 2,
                )
                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.padding(top = 8.dp),
                ) {
                    Text(
                        text = run.repo,
                        color = Gray400,
                        fontSize = 11.sp,
                        modifier = Modifier
                            .background(Gray700, RoundedCornerShape(4.dp))
                            .padding(horizontal = 6.dp, vertical = 2.dp),
                    )
                    if (run.issueNumber != null) {
                        Text("#${run.issueNumber}", color = Gray500, fontSize = 11.sp)
                    }
                    Text(timeAgo(run.createdAt), color = Gray500, fontSize = 11.sp)
                }
                if (run.branchName != null || run.prUrl != null) {
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                        modifier = Modifier.padding(top = 6.dp),
                    ) {
                        run.branchName?.let {
                            Text(it, color = Gray400, fontSize = 11.sp, fontFamily = MaterialTheme.typography.labelSmall.fontFamily)
                        }
                        if (run.prUrl != null) {
                            Text("View PR →", color = Green400, fontSize = 11.sp)
                        }
                    }
                }
            }
            StatusBadge(status = run.status, small = true)
        }
    }
}
