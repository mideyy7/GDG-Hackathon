package com.devclaw.dashboard.data

import com.devclaw.dashboard.data.remote.dto.GitHubRepo
import com.devclaw.dashboard.data.remote.dto.RunsResponse
import com.devclaw.dashboard.data.remote.dto.SubmitTaskResponse
import com.devclaw.dashboard.data.remote.dto.TaskRunDetail
import com.devclaw.dashboard.data.remote.dto.UserStatus

/**
 * In-memory [DashboardRepository] double for ViewModel tests. Each field is a
 * canned [Result] returned by the matching call; call-through lists record
 * what was invoked so tests can assert on request parameters (e.g. the
 * description passed to [submitTask]).
 */
class FakeDashboardRepository : DashboardRepository {
    var userStatus: Result<UserStatus> = Result.success(UserStatus(authenticated = true, linkedRepo = null))
    var repos: Result<List<GitHubRepo>> = Result.success(emptyList())
    var linkResult: Result<Unit> = Result.success(Unit)
    var submitTaskResult: Result<SubmitTaskResponse> = Result.success(
        SubmitTaskResponse(success = true, runId = "run-1", issueUrl = "https://github.com/x/y/issues/1", message = "ok")
    )
    var runsResult: Result<RunsResponse> = Result.success(RunsResponse(runs = emptyList(), total = 0))
    var runDetailResult: Result<TaskRunDetail>? = null
    var actionResult: Result<Unit> = Result.success(Unit)

    val linkedRepos = mutableListOf<String>()
    val submittedDescriptions = mutableListOf<String>()
    val fetchRunCalls = mutableListOf<String>()
    val approveCalls = mutableListOf<String>()
    val rejectCalls = mutableListOf<String>()
    val refineCalls = mutableListOf<Pair<String, String>>()
    var fetchRunsCallCount = 0

    override suspend fun fetchUserStatus(): Result<UserStatus> = userStatus

    override suspend fun fetchGitHubRepos(): Result<List<GitHubRepo>> = repos

    override suspend fun linkRepository(repo: String): Result<Unit> {
        linkedRepos += repo
        return linkResult
    }

    override suspend fun submitTask(description: String, repo: String?): Result<SubmitTaskResponse> {
        submittedDescriptions += description
        return submitTaskResult
    }

    override suspend fun fetchRuns(limit: Int, offset: Int): Result<RunsResponse> {
        fetchRunsCallCount++
        return runsResult
    }

    override suspend fun fetchRun(runId: String): Result<TaskRunDetail> {
        fetchRunCalls += runId
        return runDetailResult ?: Result.failure(ApiException("no run configured for $runId"))
    }

    override suspend fun approveRun(runId: String): Result<Unit> {
        approveCalls += runId
        return actionResult
    }

    override suspend fun rejectRun(runId: String): Result<Unit> {
        rejectCalls += runId
        return actionResult
    }

    override suspend fun refineRun(runId: String, refinement: String): Result<Unit> {
        refineCalls += runId to refinement
        return actionResult
    }

    override fun githubOAuthUrl(baseUrl: String, userId: String): String =
        "$baseUrl/api/web/auth/github?userId=$userId"
}
