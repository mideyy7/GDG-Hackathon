package com.devclaw.dashboard.ui

import java.time.Instant
import java.time.format.DateTimeFormatter
import java.time.format.DateTimeParseException

/** Mirrors the `timeAgo` helper duplicated in RunCard.tsx and RunDetail.tsx. */
fun timeAgo(iso: String): String {
    val instant = parseIso(iso) ?: return iso
    val diffMs = System.currentTimeMillis() - instant.toEpochMilli()
    val mins = diffMs / 60_000
    if (mins < 1) return "just now"
    if (mins < 60) return "${mins}m ago"
    val hrs = mins / 60
    if (hrs < 24) return "${hrs}h ago"
    val days = hrs / 24
    return "${days}d ago"
}

fun formatDateTime(iso: String): String {
    val instant = parseIso(iso) ?: return iso
    return DateTimeFormatter.ofPattern("MMM d, yyyy, h:mm a")
        .withZone(java.time.ZoneId.systemDefault())
        .format(instant)
}

fun formatTime(iso: String): String {
    val instant = parseIso(iso) ?: return iso
    return DateTimeFormatter.ofPattern("HH:mm:ss")
        .withZone(java.time.ZoneId.systemDefault())
        .format(instant)
}

private fun parseIso(iso: String): Instant? = try {
    Instant.parse(iso)
} catch (e: DateTimeParseException) {
    null
}
