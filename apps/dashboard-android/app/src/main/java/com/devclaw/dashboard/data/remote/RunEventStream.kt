package com.devclaw.dashboard.data.remote

import com.devclaw.dashboard.data.remote.dto.RunEvent
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.sse.EventSource
import okhttp3.sse.EventSourceListener
import okhttp3.sse.EventSources

/** Emitted by [RunEventStream.connect], mirroring the states AgentTerminal.tsx tracks locally. */
sealed interface RunStreamEvent {
    data object Connected : RunStreamEvent
    data class Message(val event: RunEvent) : RunStreamEvent
    data object StreamError : RunStreamEvent
}

/**
 * SSE client for `/orchestrator/api/runs/:runId/events`, mirroring
 * `openRunEventStream` in apps/dashboard/src/lib/api.ts.
 *
 * Browsers' EventSource can't send custom headers, so the web client passes the
 * session token as a query param instead; we do the same here for parity, even
 * though OkHttp *could* set a header directly.
 */
class RunEventStream(private val okHttpClient: OkHttpClient) {

    fun connect(baseUrl: String, runId: String, sessionId: String?): Flow<RunStreamEvent> =
        callbackFlow {
            val normalizedBase = baseUrl.trimEnd('/')
            val token = sessionId.orEmpty()
            val url = "$normalizedBase/orchestrator/api/runs/$runId/events?token=$token"

            val request = Request.Builder().url(url).build()
            val listener = object : EventSourceListener() {
                override fun onOpen(eventSource: EventSource, response: Response) {
                    trySend(RunStreamEvent.Connected)
                }

                override fun onEvent(
                    eventSource: EventSource,
                    id: String?,
                    type: String?,
                    data: String
                ) {
                    runCatching { ApiClient.json.decodeFromString(RunEvent.serializer(), data) }
                        .onSuccess { trySend(RunStreamEvent.Message(it)) }
                }

                override fun onFailure(eventSource: EventSource, t: Throwable?, response: Response?) {
                    trySend(RunStreamEvent.StreamError)
                    close()
                }

                override fun onClosed(eventSource: EventSource) {
                    close()
                }
            }

            val eventSource = EventSources.createFactory(okHttpClient).newEventSource(request, listener)

            awaitClose { eventSource.cancel() }
        }
}
