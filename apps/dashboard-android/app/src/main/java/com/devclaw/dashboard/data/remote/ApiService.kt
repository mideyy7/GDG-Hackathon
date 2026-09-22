package com.devclaw.dashboard.data.remote

import com.devclaw.dashboard.data.remote.dto.GitHubReposResponse
import com.devclaw.dashboard.data.remote.dto.LinkRepositoryRequest
import com.devclaw.dashboard.data.remote.dto.RefineRunRequest
import com.devclaw.dashboard.data.remote.dto.RunsResponse
import com.devclaw.dashboard.data.remote.dto.SubmitTaskRequest
import com.devclaw.dashboard.data.remote.dto.SubmitTaskResponse
import com.devclaw.dashboard.data.remote.dto.TaskRunDetail
import com.devclaw.dashboard.data.remote.dto.UserStatus
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

/**
 * Retrofit mirror of apps/dashboard/src/lib/api.ts.
 *
 * Gateway routes live under `api/web`; orchestrator routes are proxied by the
 * gateway in production (and by Vite in web dev) under `orchestrator`. Both
 * are reachable from the single base URL configured in [com.devclaw.dashboard.data.ServerConfig].
 */
interface ApiService {

    @GET("api/web/me")
    suspend fun fetchUserStatus(): UserStatus

    @GET("api/web/repos")
    suspend fun fetchGitHubRepos(): GitHubReposResponse

    @POST("api/web/repo-link")
    suspend fun linkRepository(@Body body: LinkRepositoryRequest)

    @POST("api/web/task")
    suspend fun submitTask(@Body body: SubmitTaskRequest): SubmitTaskResponse

    @GET("orchestrator/api/runs")
    suspend fun fetchRuns(
        @Query("limit") limit: Int = 20,
        @Query("offset") offset: Int = 0,
    ): RunsResponse

    @GET("orchestrator/api/runs/{runId}")
    suspend fun fetchRun(@Path("runId") runId: String): TaskRunDetail

    @POST("orchestrator/api/runs/{runId}/approve")
    suspend fun approveRun(@Path("runId") runId: String)

    @POST("orchestrator/api/runs/{runId}/reject")
    suspend fun rejectRun(@Path("runId") runId: String)

    @POST("orchestrator/api/runs/{runId}/refine")
    suspend fun refineRun(@Path("runId") runId: String, @Body body: RefineRunRequest)
}
