package com.devclaw.dashboard.ui.components

import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

/** Mirrors apps/dashboard/src/__tests__/StatusBadge.test.tsx. */
@RunWith(RobolectricTestRunner::class)
class StatusBadgeTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    @Test
    fun `renders pending_approval status`() {
        composeTestRule.setContent { StatusBadge(status = "pending_approval") }
        composeTestRule.onNodeWithText("Awaiting Approval").assertExists()
    }

    @Test
    fun `renders completed status`() {
        composeTestRule.setContent { StatusBadge(status = "completed") }
        composeTestRule.onNodeWithText("Completed").assertExists()
    }

    @Test
    fun `renders failed status`() {
        composeTestRule.setContent { StatusBadge(status = "failed") }
        composeTestRule.onNodeWithText("Failed").assertExists()
    }

    @Test
    fun `renders security_blocked status`() {
        composeTestRule.setContent { StatusBadge(status = "security_blocked") }
        composeTestRule.onNodeWithText("Security Blocked").assertExists()
    }

    @Test
    fun `falls back gracefully for unknown status`() {
        composeTestRule.setContent { StatusBadge(status = "unknown_status") }
        composeTestRule.onNodeWithText("unknown_status").assertExists()
    }

    @Test
    fun `renders planning stage badge`() {
        composeTestRule.setContent { StageBadge(stage = "planning") }
        composeTestRule.onNodeWithText("Planning").assertExists()
    }

    @Test
    fun `falls back gracefully for unknown stage`() {
        composeTestRule.setContent { StageBadge(stage = "custom_stage") }
        composeTestRule.onNodeWithText("custom_stage").assertExists()
    }
}
