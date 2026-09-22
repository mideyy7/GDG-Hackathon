package com.devclaw.dashboard.ui.components

import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import com.devclaw.dashboard.data.remote.dto.TaskRunSummary
import java.time.Instant
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

/** Mirrors apps/dashboard/src/__tests__/RunCard.test.tsx. */
@RunWith(RobolectricTestRunner::class)
class RunCardTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    private val baseRun = TaskRunSummary(
        id = "run-abc-123",
        planId = "plan-1",
        userId = "user-1",
        repo = "owner/my-repo",
        issueUrl = "https://github.com/owner/my-repo/issues/42",
        issueNumber = 42,
        description = "Fix the login bug on mobile",
        status = "pending_approval",
        channel = "web",
        branchName = null,
        prUrl = null,
        prNumber = null,
        createdAt = Instant.now().toString(),
    )

    @Test
    fun `renders the task description`() {
        composeTestRule.setContent { RunCard(run = baseRun, onClick = {}) }
        composeTestRule.onNodeWithText("Fix the login bug on mobile").assertExists()
    }

    @Test
    fun `renders the repo name`() {
        composeTestRule.setContent { RunCard(run = baseRun, onClick = {}) }
        composeTestRule.onNodeWithText("owner/my-repo").assertExists()
    }

    @Test
    fun `renders the issue number`() {
        composeTestRule.setContent { RunCard(run = baseRun, onClick = {}) }
        composeTestRule.onNodeWithText("#42").assertExists()
    }

    @Test
    fun `renders status badge`() {
        composeTestRule.setContent { RunCard(run = baseRun, onClick = {}) }
        composeTestRule.onNodeWithText("Awaiting Approval").assertExists()
    }

    @Test
    fun `renders branch name when present`() {
        val run = baseRun.copy(branchName = "openclaw/plan-1-fix-login", status = "completed")
        composeTestRule.setContent { RunCard(run = run, onClick = {}) }
        composeTestRule.onNodeWithText("openclaw/plan-1-fix-login").assertExists()
    }

    @Test
    fun `renders PR link when present`() {
        val run = baseRun.copy(status = "completed", prUrl = "https://github.com/owner/my-repo/pull/5")
        composeTestRule.setContent { RunCard(run = run, onClick = {}) }
        composeTestRule.onNodeWithText("View PR →").assertExists()
    }

    @Test
    fun `invokes onClick when tapped`() {
        var clicked = false
        composeTestRule.setContent { RunCard(run = baseRun, onClick = { clicked = true }) }
        composeTestRule.onNodeWithText("Fix the login bug on mobile").performClick()
        assert(clicked)
    }
}
