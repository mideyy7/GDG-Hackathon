package com.devclaw.dashboard.ui

import java.time.Instant
import org.junit.Assert.assertEquals
import org.junit.Test

/** Mirrors the `timeAgo` behavior duplicated in RunCard.tsx / RunDetail.tsx. */
class DateUtilsTest {

    @Test
    fun `just now for timestamps under a minute old`() {
        val now = Instant.now().toString()
        assertEquals("just now", timeAgo(now))
    }

    @Test
    fun `minutes ago for timestamps under an hour old`() {
        val tenMinutesAgo = Instant.now().minusSeconds(10 * 60).toString()
        assertEquals("10m ago", timeAgo(tenMinutesAgo))
    }

    @Test
    fun `hours ago for timestamps under a day old`() {
        val threeHoursAgo = Instant.now().minusSeconds(3 * 3600).toString()
        assertEquals("3h ago", timeAgo(threeHoursAgo))
    }

    @Test
    fun `days ago for older timestamps`() {
        val twoDaysAgo = Instant.now().minusSeconds(2 * 86400).toString()
        assertEquals("2d ago", timeAgo(twoDaysAgo))
    }

    @Test
    fun `unparseable input is returned unchanged`() {
        assertEquals("not-a-date", timeAgo("not-a-date"))
    }
}
