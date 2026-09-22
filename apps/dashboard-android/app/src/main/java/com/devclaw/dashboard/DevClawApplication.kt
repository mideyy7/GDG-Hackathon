package com.devclaw.dashboard

import android.app.Application
import com.devclaw.dashboard.data.AppContainer

class DevClawApplication : Application() {
    lateinit var container: AppContainer
        private set

    override fun onCreate() {
        super.onCreate()
        container = AppContainer(this)
    }
}
