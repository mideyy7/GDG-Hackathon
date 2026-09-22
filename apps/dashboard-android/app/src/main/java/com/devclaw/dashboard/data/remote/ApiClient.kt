package com.devclaw.dashboard.data.remote

import com.devclaw.dashboard.BuildConfig
import com.devclaw.dashboard.data.SessionManager
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory
import java.util.concurrent.TimeUnit

/**
 * Builds the Retrofit/OkHttp stack that talks to the gateway. Every request
 * carries `X-Session-Token`, mirroring the `sessionHeaders()` helper in
 * apps/dashboard/src/lib/api.ts. The OkHttpClient is also reused (unauthenticated,
 * without the JSON converter) by [com.devclaw.dashboard.data.remote.RunEventStream]
 * for the SSE connection.
 */
object ApiClient {

    @OptIn(kotlinx.serialization.ExperimentalSerializationApi::class)
    val json: Json = Json {
        ignoreUnknownKeys = true
        isLenient = true
        explicitNulls = false
    }

    fun buildOkHttpClient(sessionManager: SessionManager): OkHttpClient {
        val builder = OkHttpClient.Builder()
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(15, TimeUnit.SECONDS)
            .addInterceptor { chain ->
                val sessionId = sessionManager.getSessionId()
                val request = if (sessionId != null) {
                    chain.request().newBuilder()
                        .addHeader("X-Session-Token", sessionId)
                        .build()
                } else {
                    chain.request()
                }
                chain.proceed(request)
            }

        if (BuildConfig.DEBUG) {
            builder.addInterceptor(
                HttpLoggingInterceptor().apply { level = HttpLoggingInterceptor.Level.BASIC }
            )
        }
        return builder.build()
    }

    /**
     * SSE connections are long-lived, so they need an unbounded read timeout —
     * unlike [buildOkHttpClient]'s 30s default, which is sized for normal requests.
     */
    fun buildSseClient(okHttpClient: OkHttpClient): OkHttpClient =
        okHttpClient.newBuilder()
            .readTimeout(0, TimeUnit.SECONDS)
            .build()

    fun buildApiService(baseUrl: String, okHttpClient: OkHttpClient): ApiService {
        val normalizedBase = if (baseUrl.endsWith("/")) baseUrl else "$baseUrl/"
        val contentType = "application/json".toMediaType()
        val retrofit = Retrofit.Builder()
            .baseUrl(normalizedBase)
            .client(okHttpClient)
            .addConverterFactory(json.asConverterFactory(contentType))
            .build()
        return retrofit.create(ApiService::class.java)
    }
}
