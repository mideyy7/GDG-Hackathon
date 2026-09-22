package com.devclaw.dashboard.data

import com.devclaw.dashboard.data.remote.ApiClient
import com.devclaw.dashboard.data.remote.ApiService
import com.devclaw.dashboard.data.remote.dto.ApiErrorBody
import com.devclaw.dashboard.data.remote.dto.GitHubRepo
import com.devclaw.dashboard.data.remote.dto.LinkRepositoryRequest
import com.devclaw.dashboard.data.remote.dto.RefineRunRequest
import com.devclaw.dashboard.data.remote.dto.RunsResponse
import com.devclaw.dashboard.data.remote.dto.SubmitTaskRequest
import com.devclaw.dashboard.data.remote.dto.SubmitTaskResponse
import com.devclaw.dashboard.data.remote.dto.TaskRunDetail
import com.devclaw.dashboard.data.remote.dto.UserStatus
import retrofit2.HttpException

/**
 * Domain-facing wrapper around [ApiService], mirroring apps/dashboard/src/lib/api.ts.
 *
 * Every call returns a [Result] whose failure message follows the same
 * precedence the web client uses: `e?.response?.data?.error || e.message`.
 */
interface DashboardRepository {
    suspend fun fetchUserStatus(): Result<UserStatus>
    suspend fun fetchGitHubRepos(): Result<List<GitHubRepo>>
    suspend fun linkRepository(repo: String): Result<Unit>
    suspend fun submitTask(description: String, repo: String? = null): Result<SubmitTaskResponse>
    suspend fun fetchRuns(limit: Int = 20, offset: Int = 0): Result<RunsResponse>
    suspend fun fetchRun(runId: String): Result<TaskRunDetail>
    suspend fun approveRun(runId: String): Result<Unit>
    suspend fun rejectRun(runId: String): Result<Unit>
    suspend fun refineRun(runId: String, refinement: String): Result<Unit>

    /** Builds the GitHub OAuth URL for the web user, mirroring `getGitHubOAuthUrl`. */
    fun githubOAuthUrl(baseUrl: String, userId: String): String
}

class DashboardRepositoryImpl(private val apiService: ApiService) : DashboardRepository {

    override suspend fun fetchUserStatus(): Result<UserStatus> =
        safeCall { apiService.fetchUserStatus() }

    override suspend fun fetchGitHubRepos(): Result<List<GitHubRepo>> =
        safeCall { apiService.fetchGitHubRepos().repos }

    override suspend fun linkRepository(repo: String): Result<Unit> =
        safeCall { apiService.linkRepository(LinkRepositoryRequest(repo)) }

    override suspend fun submitTask(description: String, repo: String?): Result<SubmitTaskResponse> =
        safeCall { apiService.submitTask(SubmitTaskRequest(description, repo)) }

    override suspend fun fetchRuns(limit: Int, offset: Int): Result<RunsResponse> =
        safeCall { apiService.fetchRuns(limit, offset) }

    override suspend fun fetchRun(runId: String): Result<TaskRunDetail> =
        safeCall { apiService.fetchRun(runId) }

    override suspend fun approveRun(runId: String): Result<Unit> =
        safeCall { apiService.approveRun(runId) }

    override suspend fun rejectRun(runId: String): Result<Unit> =
        safeCall { apiService.rejectRun(runId) }

    override suspend fun refineRun(runId: String, refinement: String): Result<Unit> =
        safeCall { apiService.refineRun(runId, RefineRunRequest(refinement)) }

    override fun githubOAuthUrl(baseUrl: String, userId: String): String {
        val normalizedBase = baseUrl.trimEnd('/')
        val encodedUserId = java.net.URLEncoder.encode(userId, "UTF-8")
        return "$normalizedBase/api/web/auth/github?userId=$encodedUserId"
    }

    private suspend fun <T> safeCall(block: suspend () -> T): Result<T> = try {
        Result.success(block())
    } catch (e: HttpException) {
        Result.failure(ApiException(extractServerError(e) ?: e.message() ?: "Request failed"))
    } catch (e: Exception) {
        Result.failure(ApiException(e.message ?: "Request failed"))
    }

    private fun extractServerError(e: HttpException): String? {
        val body = e.response()?.errorBody()?.string() ?: return null
        return runCatching {
            ApiClient.json.decodeFromString(ApiErrorBody.serializer(), body).error
        }.getOrNull()
    }
}

/** Thrown by [DashboardRepositoryImpl.safeCall]; `message` is always the user-facing string. */
class ApiException(message: String) : Exception(message)
