package com.devclaw.dashboard.ui.screens

import androidx.browser.customtabs.CustomTabsIntent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.devclaw.dashboard.ui.LocalAppContainer
import com.devclaw.dashboard.ui.theme.Brand
import com.devclaw.dashboard.ui.theme.Gray400

/**
 * Mirrors apps/dashboard/src/pages/Login.tsx.
 *
 * Unlike the web dashboard — which redirects the whole page to the gateway's
 * OAuth URL and gets `/auth/success?userId=...` back as a same-origin route —
 * a native app launches the flow in a Custom Tab and re-checks auth status when
 * the user returns to the app (see MainActivity's onResume-driven refresh),
 * since the session id is already known locally before OAuth even starts.
 */
@Composable
fun LoginScreen(onAuthCheckRequested: () -> Unit) {
    val container = LocalAppContainer.current
    val context = LocalContext.current
    var showServerConfig by remember { mutableStateOf(false) }
    var serverUrl by remember { mutableStateOf(container.serverConfig.getBaseUrl()) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            buildString { append("Core"); append("Dev") },
            fontWeight = FontWeight.Black,
            fontSize = 32.sp,
        )
        Text("MISSION CONTROL", color = Gray400, fontSize = 12.sp, modifier = Modifier.padding(bottom = 32.dp))

        Text("Connect your workspace", fontWeight = FontWeight.Bold, fontSize = 18.sp)
        Text(
            "Connect your GitHub account to start submitting tasks and reviewing AI-generated code changes in real time.",
            color = Gray400,
            fontSize = 13.sp,
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(top = 8.dp, bottom = 24.dp),
        )

        Button(
            onClick = {
                val userId = container.sessionManager.getOrCreateSessionId()
                val oauthUrl = container.repository.githubOAuthUrl(container.serverConfig.getBaseUrl(), userId)
                CustomTabsIntent.Builder().build().launchUrl(context, android.net.Uri.parse(oauthUrl))
            },
            modifier = Modifier.fillMaxWidth(),
        ) {
            Text("Connect GitHub")
        }

        TextButton(onClick = onAuthCheckRequested, modifier = Modifier.padding(top = 8.dp)) {
            Text("Already connected? Refresh", color = Gray400, fontSize = 12.sp)
        }

        TextButton(onClick = { showServerConfig = !showServerConfig }, modifier = Modifier.padding(top = 24.dp)) {
            Text("Server: ${container.serverConfig.getBaseUrl()}", color = Gray400, fontSize = 11.sp)
        }

        if (showServerConfig) {
            OutlinedTextField(
                value = serverUrl,
                onValueChange = { serverUrl = it },
                label = { Text("Gateway base URL") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )
            Button(
                onClick = {
                    container.serverConfig.setBaseUrl(serverUrl)
                    showServerConfig = false
                },
                modifier = Modifier.padding(top = 8.dp),
            ) {
                Text("Save")
            }
        }
    }
}
