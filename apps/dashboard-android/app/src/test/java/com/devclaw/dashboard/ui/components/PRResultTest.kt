package com.devclaw.dashboard.ui.components

import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

/** Mirrors apps/dashboard/src/__tests__/PRResult.test.tsx. */
@RunWith(RobolectricTestRunner::class)
class PRResultTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    @Test
    fun `renders PR number and view link`() {
        composeTestRule.setContent {
            PRResult(
                prUrl = "https://github.com/owner/repo/pull/5",
                prNumber = 5,
                branchName = "openclaw/plan-1",
                repo = "owner/repo",
                issueUrl = null,
            )
        }
        composeTestRule.onNodeWithText("View PR →").assertExists()
        composeTestRule.onNodeWithText("PR #5").assertExists()
    }

    @Test
    fun `renders branch name`() {
        composeTestRule.setContent {
            PRResult(
                prUrl = "https://github.com/owner/repo/pull/5",
                prNumber = null,
                branchName = "openclaw/plan-1",
                repo = "owner/repo",
                issueUrl = null,
            )
        }
        composeTestRule.onNodeWithText("openclaw/plan-1").assertExists()
    }

    @Test
    fun `renders issue link when provided`() {
        composeTestRule.setContent {
            PRResult(
                prUrl = "https://github.com/owner/repo/pull/5",
                prNumber = null,
                branchName = null,
                repo = "owner/repo",
                issueUrl = "https://github.com/owner/repo/issues/10",
            )
        }
        composeTestRule.onNodeWithText("issues#10").assertExists()
    }

    @Test
    fun `shows the code ready header`() {
        composeTestRule.setContent {
            PRResult(
                prUrl = "https://github.com/owner/repo/pull/5",
                prNumber = null,
                branchName = null,
                repo = "owner/repo",
                issueUrl = null,
            )
        }
        composeTestRule.onNodeWithText("✓ CODE READY").assertExists()
    }
}
