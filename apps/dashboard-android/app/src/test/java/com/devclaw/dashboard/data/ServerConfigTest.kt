package com.devclaw.dashboard.data

import androidx.test.core.app.ApplicationProvider
import org.junit.Assert.assertEquals
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class ServerConfigTest {

    @Test
    fun `defaults to the emulator loopback address`() {
        val config = ServerConfig(ApplicationProvider.getApplicationContext())
        assertEquals("http://10.0.2.2:3001", config.getBaseUrl())
    }

    @Test
    fun `setBaseUrl persists and trims a trailing slash`() {
        val config = ServerConfig(ApplicationProvider.getApplicationContext())
        config.setBaseUrl("https://api.example.com/ ")
        assertEquals("https://api.example.com", config.getBaseUrl())
    }
}
