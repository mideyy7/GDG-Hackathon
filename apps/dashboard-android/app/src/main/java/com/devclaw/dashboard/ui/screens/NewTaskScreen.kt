package com.devclaw.dashboard.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
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
import com.devclaw.dashboard.ui.theme.Gray400
import com.devclaw.dashboard.ui.theme.Red400
import com.devclaw.dashboard.ui.theme.Yellow400

/** Mirrors apps/dashboard/src/pages/NewTask.tsx. */
@Composable
fun NewTaskScreen(linkedRepo: String?, onSubmitted: (String) -> Unit, onLinkRepo: () -> Unit) {
    val container = LocalAppContainer.current
    val viewModel: NewTaskViewModel = viewModel(
        factory = viewModelFactory { initializer { NewTaskViewModel(container.repository) } }
    )
    val uiState by viewModel.uiState.collectAsState()

    LaunchedEffect(uiState.submittedRunId) {
        uiState.submittedRunId?.let {
            onSubmitted(it)
            viewModel.consumeSubmittedRunId()
        }
    }

    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        Text("New Task", fontWeight = FontWeight.Black, fontSize = 22.sp)
        Text(
            "Describe what you want built, fixed, or changed in plain language.",
            color = Gray400,
            fontSize = 13.sp,
            modifier = Modifier.padding(bottom = 16.dp),
        )

        if (linkedRepo == null) {
            Card(modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp)) {
                Column(modifier = Modifier.padding(12.dp)) {
                    Text("⚠ No Repository Linked", color = Yellow400, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                    TextButton(onClick = onLinkRepo) { Text("Link one first") }
                }
            }
        }

        OutlinedTextField(
            value = uiState.description,
            onValueChange = viewModel::onDescriptionChange,
            placeholder = { Text("Describe the task in plain language. Be specific about what you want added, changed, or fixed.") },
            enabled = !uiState.submitting,
            minLines = 6,
            modifier = Modifier.fillMaxWidth(),
        )
        Text(
            "${uiState.description.length}/2000",
            color = Gray400,
            fontSize = 10.sp,
            modifier = Modifier.padding(top = 4.dp, bottom = 16.dp),
        )

        Text("EXAMPLES — TAP TO USE", color = Gray400, fontSize = 11.sp, fontWeight = FontWeight.Bold)
        Column(modifier = Modifier.padding(top = 8.dp, bottom = 16.dp)) {
            TASK_EXAMPLES.forEach { example ->
                TextButton(
                    onClick = { viewModel.onDescriptionChange(example) },
                    enabled = !uiState.submitting,
                ) {
                    Text("+ $example", color = Gray400, fontSize = 12.sp)
                }
            }
        }

        uiState.error?.let {
            Text(it, color = Red400, fontSize = 13.sp, modifier = Modifier.padding(bottom = 12.dp))
        }

        Button(
            onClick = viewModel::submit,
            enabled = !uiState.submitting && uiState.description.isNotBlank(),
            modifier = Modifier.fillMaxWidth(),
        ) {
            Text(if (uiState.submitting) "Submitting…" else "Submit Task")
        }

        Card(modifier = Modifier.fillMaxWidth().padding(top = 24.dp)) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text("WHAT HAPPENS NEXT", color = Gray400, fontWeight = FontWeight.Bold, fontSize = 11.sp)
                NEXT_STEPS.forEachIndexed { i, step ->
                    Text(
                        "${i + 1}. $step",
                        color = Gray400,
                        fontSize = 13.sp,
                        modifier = Modifier.padding(top = 6.dp),
                    )
                }
            }
        }
    }
}
