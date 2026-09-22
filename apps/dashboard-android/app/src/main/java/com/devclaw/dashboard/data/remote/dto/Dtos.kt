package com.devclaw.dashboard.data.remote.dto

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonElement

/**
 * Wire types for the gateway (api/web routes) and orchestrator (orchestrator routes) APIs.
 * Mirrors the TypeScript interfaces in apps/dashboard/src/lib/api.ts field-for-field.
 */

@Serializable
data class UserStatus(
    val authenticated: Boolean,
    val linkedRepo: String? = null,
)

@Serializable
data class GitHubRepo(
    val fullName: String,
    val name: String,
    val owner: String,
    val private: Boolean,
    val defaultBranch: String,
    val updatedAt: String,
    val description: String? = null,
)

@Serializable
data class GitHubReposResponse(
    val repos: List<GitHubRepo>,
)

@Serializable
data class AgentAssignment(
    val domain: String, // "frontend" | "backend"
    val generator: String,
    val reviewer: String,
)

@Serializable
data class ArchitecturePlan(
    val planId: String,
    val requestId: String,
    val summary: String,
    val affectedFiles: List<String> = emptyList(),
    val agentAssignments: List<AgentAssignment> = emptyList(),
    val riskFlags: List<String> = emptyList(),
    val status: String, // "pending_approval" | "approved" | "rejected"
)

@Serializable
data class TaskRunSummary(
    val id: String,
    val planId: String? = null,
    val userId: String,
    val repo: String,
    val issueUrl: String? = null,
    val issueNumber: Int? = null,
    val description: String,
    val status: String,
    val channel: String,
    val branchName: String? = null,
    val prUrl: String? = null,
    val prNumber: Int? = null,
    val createdAt: String,
)

@Serializable
data class TaskRunDetail(
    val id: String,
    val planId: String? = null,
    val userId: String,
    val repo: String,
    val issueUrl: String? = null,
    val issueNumber: Int? = null,
    val description: String,
    val status: String,
    val channel: String,
    val branchName: String? = null,
    val prUrl: String? = null,
    val prNumber: Int? = null,
    val createdAt: String,
    val planDetails: ArchitecturePlan? = null,
)

fun TaskRunDetail.toSummary() = TaskRunSummary(
    id = id,
    planId = planId,
    userId = userId,
    repo = repo,
    issueUrl = issueUrl,
    issueNumber = issueNumber,
    description = description,
    status = status,
    channel = channel,
    branchName = branchName,
    prUrl = prUrl,
    prNumber = prNumber,
    createdAt = createdAt,
)

@Serializable
data class RunsResponse(
    val runs: List<TaskRunSummary>,
    val total: Int,
)

@Serializable
data class RunEvent(
    val id: String,
    val runId: String,
    val stage: String,
    val eventType: String,
    val message: String,
    val data: Map<String, JsonElement>? = null,
    val createdAt: String,
)

@Serializable
data class SubmitTaskRequest(
    val description: String,
    val repo: String? = null,
)

@Serializable
data class SubmitTaskResponse(
    val success: Boolean,
    val runId: String,
    val issueUrl: String,
    val message: String,
)

@Serializable
data class LinkRepositoryRequest(
    val repo: String,
)

@Serializable
data class RefineRunRequest(
    val refinement: String,
)

@Serializable
data class ApiErrorBody(
    val error: String? = null,
)
