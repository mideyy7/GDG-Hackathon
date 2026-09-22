package com.devclaw.dashboard.data

import android.content.Context
import android.content.SharedPreferences
import com.devclaw.dashboard.BuildConfig

/**
 * Holds the gateway origin the app talks to.
 *
 * The web dashboard gets this for free from same-origin requests plus a Vite
 * dev proxy (see apps/dashboard/vite.config.ts): api and orchestrator paths
 * are relative, resolved against whatever host served the page. A native
 * app has no "page origin" to inherit, so it needs an explicit, user-editable
 * base URL instead. It defaults to the emulator's host-loopback address
 * (10.0.2.2) so a local `npm run dev:servers` backend works out of the box.
 */
class ServerConfig(context: Context) {

    private val prefs: SharedPreferences =
        context.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    fun getBaseUrl(): String =
        prefs.getString(BASE_URL_KEY, null) ?: BuildConfig.DEFAULT_SERVER_BASE_URL

    fun setBaseUrl(url: String) {
        val trimmed = url.trim().trimEnd('/')
        prefs.edit().putString(BASE_URL_KEY, trimmed).apply()
    }

    private companion object {
        const val PREFS_NAME = "coredev_server_config"
        const val BASE_URL_KEY = "server_base_url"
    }
}
