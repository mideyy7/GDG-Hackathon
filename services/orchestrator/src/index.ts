import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { IntakeRequest } from '@coredev/contracts';
import { createOrDedupeIssue, fetchRepoTree } from './githubClient';
import { getOrchestrationEngine } from './orchestrationEngine';
import {
    buildExecutionSubTasks,
    provisionIsolatedExecutionEnvironment,
    resolveApprovedPlan,
    resolvePreferredExecutionBranch,
} from './executionPreparation';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const port = process.env.PORT || 3010;

app.use(cors());
app.use(express.json());

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;
const orchestrationEngine = getOrchestrationEngine();

const parsePositiveInt = (value: string | undefined, fallback: number): number => {
    const parsed = Number.parseInt(value || '', 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const ORCHESTRATOR_BOT_SEND_TIMEOUT_MS = parsePositiveInt(
    process.env.ORCHESTRATOR_BOT_SEND_TIMEOUT_MS,
    20_000
);

const resolveBotUrl = (channel: unknown): string | undefined => {
    if (channel === 'telegram') {
        return process.env.TELEGRAM_BOT_URL;
    }
    if (channel === 'whatsapp') {
        return process.env.WHATSAPP_BOT_URL;
    }
    return undefined;
};

const formatErrorDetails = (err: any): string => {
    const message = err?.message || 'Unknown error';
    const status = err?.response?.status;
    const statusText = err?.response?.statusText;
    const url = err?.config?.url;
    const data = err?.response?.data;
    const dataText = data
        ? typeof data === 'string'
            ? data
            : JSON.stringify(data)
        : '';

    return [
        message,
        status ? `status=${status}${statusText ? ` ${statusText}` : ''}` : '',
        url ? `url=${url}` : '',
        dataText ? `data=${dataText}` : '',
    ]
        .filter(Boolean)
        .join(' | ');
};

// ─── Health Check ────────────────────────────────────────────────────────────

app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', service: 'orchestrator' });
});

// ─── POST /api/task ──────────────────────────────────────────────────────────
//
// Accepts a normalized task dispatch from the openclaw-gateway.
// Payload shape (matches IntakeRequest from docs/architecture/contracts.md):
//   {
//     requestId: string,
//     channel: "telegram" | "whatsapp",
//     userId: string,
//     repo: { owner: string, name: string },
//     message: string,
//     timestampIso: string,
//     chatId?: string
//   }
//
// Responsibilities:
//   1. Validate input.
//   2. Fetch github token from database.
//   3. Create or deduplicate a GitHub issue.
//   4. Persist a task_run record to Supabase.
//   5. Send an approval card to the user's chat bot.
//   6. Return an ACK to the gateway.

app.post('/api/task', async (req: Request, res: Response): Promise<any> => {
    const intake: IntakeRequest = req.body;
    const { userId, channel, chatId, repo, message: description } = intake;

    if (!userId || !channel || !repo || !repo.owner || !repo.name || !description) {
        return res.status(400).json({
            error: 'Missing required fields: userId, channel, repo, message',
        });
    }

    const owner = repo.owner;
    const repoName = repo.name;
    const repoFullName = `${owner}/${repoName}`;

    if (!supabase) {
        return res.status(500).json({ error: 'Supabase is not configured' });
    }

    // ── Fetch GitHub Token ───────────────────────────────────────────────────
    const { data: userPrefs, error: prefsError } = await supabase
        .from('user_preferences')
        .select('github_token')
        .eq('user_id', userId)
        .single();

    if (prefsError || !userPrefs || !userPrefs.github_token) {
        return res.status(401).json({ error: 'No GitHub token found. Please /login first.' });
    }
    const githubToken = userPrefs.github_token;

    const runId = uuidv4();

    // ── Insert stub task_run immediately so the dashboard can find the run ────
    // Plan details are filled in once the planner responds.
    await supabase.from('task_runs').insert({
        id: runId,
        user_id: userId,
        repo: repoFullName,
        description,
        status: 'planning',
        channel,
        chat_id: chatId || null,
        created_at: new Date().toISOString(),
    });

    const issueTitle = `Task: ${description.slice(0, 80)}`;
    const issueBody = [
        `**Requested via:** ${channel}`,
        `**User ID:** ${userId}`,
        '',
        '### Description',
        description,
        '',
        '---',
        '_This issue was created automatically by CoreDev. Awaiting approval before execution._',
    ].join('\n');

    let issueNumber: number;
    let issueUrl: string;
    let isDuplicate: boolean;

    // ── Step 1: Create or deduplicate GitHub issue ──────────────────────────
    try {
        const result = await createOrDedupeIssue(githubToken, owner, repoName, issueTitle, issueBody);
        issueNumber = result.number;
        issueUrl = result.html_url;
        isDuplicate = result.isDuplicate;
        console.log(
            `[Orchestrator] ${isDuplicate ? 'Linked to existing' : 'Created new'} issue #${issueNumber}: ${issueUrl}`
        );
    } catch (err: any) {
        console.error('[Orchestrator] Failed to create/find GitHub issue:', formatErrorDetails(err));
        return res.status(502).json({
            error: 'Failed to create or find a GitHub issue. Check that the repo exists and the token has "repo" scope.',
        });
    }

    // ── Step 2: Return immediate ACK to gateway ──────────────────────────────
    const ackMessage = isDuplicate
        ? `🔗 Linked to existing issue: ${issueUrl}\n\n⚙️ I'm generating an architecture plan now. I'll message you when ready.`
        : `✅ Created new issue: ${issueUrl}\n\n⚙️ I'm generating an architecture plan now. I'll message you when ready.`;

    res.status(200).json({ success: true, message: ackMessage, issueNumber, issueUrl, runId });

    // ── Step 3: Asynchronous background processing ───────────────────────────
    (async () => {
        let repoFileTree: string[] | undefined;
        try {
            repoFileTree = await fetchRepoTree(githubToken, owner, repoName);
        } catch (e: any) {
            console.warn('[Orchestrator] Failed to fetch repo tree for planner context', e.message);
        }

        let plan: import('@coredev/contracts').ArchitecturePlan | undefined;
        try {
            plan = await orchestrationEngine.plan({
                intake,
                repoFullName,
                issueNumber,
                repoFileTree,
            });
            console.log(`[Orchestrator] Fetched Architecture Plan ${plan?.planId}`);
        } catch (err: any) {
            console.error('[Orchestrator] Failed to fetch architecture plan:', formatErrorDetails(err));
            // Send failure message directly to chat
            if (chatId) {
                const failureMessage = `❌ *Plan generation failed*\n\nCouldn't create an architecture plan for issue #${issueNumber}.\n_${err?.message || 'Gateway timeout or planner unavailable.'}_\n\nTry again with /task`;
                const botUrl = resolveBotUrl(channel);

                if (botUrl) {
                    axios.post(`${botUrl}/api/send`, { chatId, message: failureMessage }, {
                        timeout: ORCHESTRATOR_BOT_SEND_TIMEOUT_MS,
                    }).catch(e => console.error(e));
                }
            }
            return;
        }

        // ── Step 4: Update task_run with plan details ─────────────────────────
        // The stub row was already inserted before GitHub issue creation.
        if (supabase) {
            const { error: dbError } = await supabase.from('task_runs').update({
                plan_id: plan?.planId,
                plan_details: plan,
                issue_url: issueUrl,
                issue_number: issueNumber,
                status: 'pending_approval',
            }).eq('id', runId);

            if (dbError) {
                console.warn('[Orchestrator] Could not update task_run with plan details:', dbError.message);
            }
        }

        // ── Emit plan_ready event for SSE clients ────────────────────────────────
        await persistAndEmitEvent(createRunEvent(
            runId, 'pending_approval', 'plan_ready',
            `Architecture plan ready — ${plan?.affectedFiles?.length || 0} files affected`,
            { planId: plan?.planId, summary: plan?.summary }
        ));

        // ── Step 5: Build approval card message ──────────────────────────────────
        const issueLabel = isDuplicate ? `🔗 Linked to existing issue #${issueNumber}` : `✅ Created issue #${issueNumber}`;
        const formattedFiles = plan?.affectedFiles?.length ? plan.affectedFiles.map(f => `- \`${f}\``).join('\n') : '_None_';
        const formattedRisks = plan?.riskFlags?.length ? plan.riskFlags.map(r => `⚠️ ${r}`).join('\n') : '_None_';

        const approvalMessage = [
            `🤖 *CoreDev — Plan Ready*`,
            '',
            `${issueLabel}`,
            `🔗 ${issueUrl}`,
            '',
            `📋 *Task:* ${description}`,
            '',
            `🏗️ *Architecture Plan*`,
            `${plan?.summary || 'No summary available.'}`,
            '',
            `📂 *Files to change:*`,
            `${formattedFiles}`,
            '',
            ...(plan?.riskFlags?.length ? [`⚠️ *Risks:*`, `${formattedRisks}`, ''] : []),
            `─────────────────────`,
            `✅ /approve ${plan?.planId}`,
            `✏️ /refine ${plan?.planId} [your changes]`,
            `❌ /reject ${plan?.planId}`,
        ].join('\n');

        // ── Step 6: Fire approval card to the user's chat (fire-and-forget) ──────
        if (chatId) {
            const botUrl = resolveBotUrl(channel);

            if (botUrl) {
                axios
                    .post(`${botUrl}/api/send`, { chatId, message: approvalMessage }, {
                        timeout: ORCHESTRATOR_BOT_SEND_TIMEOUT_MS,
                    })
                    .then(() =>
                        console.log(`[Orchestrator] Sent approval card to ${channel} chat ${chatId}`)
                    )
                    .catch((err) =>
                        console.error(
                            `[Orchestrator] Failed to send approval card to ${channel}:`,
                            err.message
                        )
                    );
            } else {
                console.warn(
                    `[Orchestrator] No bot URL configured for channel "${channel}". ` +
                    `Set ${channel.toUpperCase()}_BOT_URL in .env to enable approval cards.`
                );
            }
        }
    })();
});

// ─── POST /api/approve ───────────────────────────────────────────────────────
app.post('/api/approve', async (req: Request, res: Response): Promise<any> => {
    const { runId, planId } = req.body;

    if (!runId && !planId) {
        return res.status(400).json({ error: 'Must provide runId or planId' });
    }

    if (!supabase) {
        return res.status(500).json({ error: 'Supabase is not configured' });
    }

    const matchQuery = runId ? { id: runId } : { plan_id: planId };

    const { data: updated, error } = await supabase
        .from('task_runs')
        .update({ status: 'approved' })
        .match(matchQuery)
        .eq('status', 'pending_approval')   // idempotency gate: only approve once
        .select()
        .single();

    if (error || !updated) {
        // Either not found or already approved/executing — fetch to distinguish
        const { data: existingRun } = await supabase
            .from('task_runs')
            .select('id, status, plan_id')
            .match(matchQuery)
            .single();
        if (!existingRun) {
            return res.status(404).json({ error: 'Task run not found' });
        }
        // Already approved — return 200 so the gateway doesn't retry
        return res.status(200).json({ success: true, message: 'Task already processing', status: existingRun.status });
    }

    if (updated.chat_id) {
        const botUrl = resolveBotUrl(updated.channel);
        if (botUrl) {
            const inProgressMessage = [
                `⚡ *Execution started!*`,
                '',
                `The CoreDev agents are now implementing your task for *${updated.repo || 'your repository'}*.`,
                `_I'll notify you when the code is ready with a link to the branch._`,
            ].join('\n');
            axios
                .post(`${botUrl}/api/send`, {
                    chatId: updated.chat_id,
                    message: inProgressMessage,
                }, {
                    timeout: ORCHESTRATOR_BOT_SEND_TIMEOUT_MS,
                })
                .then(() => {
                    console.log(
                        `[Orchestrator] Sent execution-start update to ${updated.channel} chat ${updated.chat_id}`
                    );
                })
                .catch((notifyErr: any) => {
                    console.warn(
                        `[Orchestrator] Failed to send execution-start update to ${updated.channel}: ` +
                        `${notifyErr?.message || notifyErr}`
                    );
                });
        }
    }

    console.log(`[Orchestrator] Task ${updated.id} (plan ${updated.plan_id}) was APPROVED`);
    res.status(200).json({
        success: true,
        message: 'Task approved and dispatched for execution',
        task: updated,
        execution: {
            status: 'queued',
        },
    });

    // Run execution asynchronously to prevent gateway timeouts
    (async () => {
        let execution: import('./orchestrationEngine').ExecuteResult | undefined;
        let preparation:
            | {
                isolatedEnvironmentPath: string;
                executionBranchName: string;
                subTaskCount: number;
            }
            | undefined;
        try {
            const approvedPlan = resolveApprovedPlan(updated.plan_details);
            if (!approvedPlan) {
                console.error('[Orchestrator] Approved task is missing a valid architecture plan.', updated);
                return;
            }

            if (!updated.repo || typeof updated.repo !== 'string') {
                console.error('[Orchestrator] Approved task is missing repository metadata for execution.', updated);
                return;
            }

            const executionSubTasks = buildExecutionSubTasks(approvedPlan);
            const preferredBranch = resolvePreferredExecutionBranch(
                updated.plan_details,
                updated.plan_id,
                updated.description
            );

            let githubToken: string | undefined;
            if (updated.user_id) {
                const { data: userPrefs, error: prefsError } = await supabase
                    .from('user_preferences')
                    .select('github_token')
                    .eq('user_id', updated.user_id)
                    .single();

                if (!prefsError && userPrefs?.github_token) {
                    githubToken = userPrefs.github_token;
                }
            }

            const isolatedEnvironment = await provisionIsolatedExecutionEnvironment({
                runId: updated.id,
                repoFullName: updated.repo,
                planId: approvedPlan.planId || updated.plan_id,
                description: updated.description || approvedPlan.summary,
                planDetails: updated.plan_details,
                preferredBranchName: preferredBranch.branchName,
                githubToken,
            });

            preparation = {
                isolatedEnvironmentPath: isolatedEnvironment.workspacePath,
                executionBranchName: isolatedEnvironment.branchName,
                subTaskCount: executionSubTasks.length,
            };

            // Update status to 'generating' so the dashboard shows live progress
            if (supabase) {
                supabase.from('task_runs')
                    .update({ status: 'generating', branch_name: isolatedEnvironment.branchName })
                    .eq('id', updated.id)
                    .then(({ error: dbErr }) => {
                        if (dbErr) console.error('[Orchestrator] Failed to update generating status:', dbErr);
                    });
            }

            const execBotUrl = resolveBotUrl(updated.channel);
            if (updated.chat_id && execBotUrl) {
                axios.post(`${execBotUrl}/api/send`, {
                    chatId: updated.chat_id,
                    message: `⚙️ *Workspace ready!*\n\n_Cloned \`${updated.repo}\` onto branch \`${isolatedEnvironment.branchName}\`. Starting code generation now..._`,
                }, { timeout: ORCHESTRATOR_BOT_SEND_TIMEOUT_MS }).catch(() => { });
            }
            execution = await orchestrationEngine.execute({
                runId: updated.id,
                planId: approvedPlan.planId || updated.plan_id,
                requestId: approvedPlan.requestId,
                userId: updated.user_id,
                repo: updated.repo,
                issueNumber: updated.issue_number,
                issueUrl: updated.issue_url,
                description: updated.description,
                planDetails: approvedPlan,
                executionSubTasks,
                isolatedEnvironmentPath: isolatedEnvironment.workspacePath,
                executionBranchName: isolatedEnvironment.branchName,
                progressChatId: updated.chat_id || undefined,
                progressBotUrl: execBotUrl || undefined,
                progressCallbackUrl: `http://localhost:${process.env.PORT || 3010}/api/runs/${updated.id}/progress`,
            });

            if (execution.approvedPatchSet) {
                const patchSetRef = (execution.approvedPatchSet as any)?.patchSetRef || 'n/a';
                console.log(
                    `[Orchestrator] Received approved patch set for run ${updated.id}: ${patchSetRef}`
                );
            }
            if (execution.branchPush) {
                const branchName = (execution.branchPush as any)?.branchName || 'n/a';
                const pushed = (execution.branchPush as any)?.pushed;
                console.log(
                    `[Orchestrator] Execution branch status for run ${updated.id}: ` +
                    `branch=${branchName} pushed=${String(pushed)}`
                );

                // Persist branch name and completion status for future /amend operations
                if (supabase) {
                    supabase.from('task_runs')
                        .update({ status: 'completed', branch_name: branchName })
                        .eq('id', updated.id)
                        .then(({ error: dbErr }) => {
                            if (dbErr) console.error('[Orchestrator] Failed to update completion status:', dbErr);
                        });
                }
                // Ensure pr_url is stored if a PR was opened
                if (supabase && (execution as any).prUrl) {
                    supabase.from('task_runs')
                        .update({ pr_url: (execution as any).prUrl, pr_number: (execution as any).prNumber })
                        .eq('id', updated.id)
                        .then(() => { });
                }

                if (updated.chat_id) {
                    const botUrl = resolveBotUrl(updated.channel);
                    if (botUrl) {
                        const branchUrl = `https://github.com/${updated.repo}/tree/${branchName}`;
                        const completionMessage = [
                            `✅ *Code is ready!*`,
                            '',
                            `Your task has been implemented for *${updated.repo}*.`,
                            '',
                            `🌿 *Branch:* \`${branchName}\``,
                            `🔗 ${pushed ? branchUrl : '_Branch not pushed_'}`,
                            '',
                            `_Review the changes and merge when ready, or use:_`,
                            `✏️ /amend ${updated.plan_id} [instructions]`,
                        ].join('\n');
                        axios.post(`${botUrl}/api/send`, {
                            chatId: updated.chat_id,
                            message: completionMessage,
                        }, { timeout: ORCHESTRATOR_BOT_SEND_TIMEOUT_MS }).catch(() => { });
                    }
                }
            }
            console.log(`[Orchestrator] Task ${updated.id} execution completed asynchronously.`);
        } catch (err: any) {
            // Security gate blocked the execution
            const secData = err?.response?.data;
            if (err?.response?.status === 422 && secData?.error === 'security_blocked') {
                console.warn(
                    `[Orchestrator] Security gate BLOCKED runId=${updated.id}: ${secData.summary}`
                );
                if (supabase) {
                    supabase
                        .from('task_runs')
                        .update({ status: 'security_blocked' })
                        .eq('id', updated.id)
                        .then(({ error: dbErr }) => {
                            if (dbErr) console.error('[Orchestrator] Failed to mark security_blocked:', dbErr);
                        });
                }
                if (updated.chat_id) {
                    const botUrl = resolveBotUrl(updated.channel);
                    if (botUrl) {
                        const vulns: Array<{ severity: string; category: string; detail: string; file?: string }> =
                            secData.vulnerabilities || [];
                        const criticalOrHigh = vulns.filter(
                            (v) => v.severity === 'critical' || v.severity === 'high'
                        );
                        const vulnLines = criticalOrHigh
                            .slice(0, 5)
                            .map(
                                (v) =>
                                    `• *[${v.severity.toUpperCase()}]* ${v.category}${v.file ? ` in \`${v.file}\`` : ''}: ${v.detail}`
                            )
                            .join('\n');
                        const securityMessage = [
                            `🛡️ *Security Gate Blocked*`,
                            '',
                            `The generated code was blocked before being pushed because our security reviewer found vulnerabilities.`,
                            '',
                            vulnLines || `_${secData.summary}_`,
                            '',
                            `Please refine your task description and try again with /task, or contact support if you believe this is a false positive.`,
                        ].join('\n');
                        axios.post(
                            `${botUrl}/api/send`,
                            { chatId: updated.chat_id, message: securityMessage },
                            { timeout: ORCHESTRATOR_BOT_SEND_TIMEOUT_MS }
                        ).catch(() => { });
                    }
                }
                return;
            }

            console.error('[Orchestrator] Failed to dispatch approved task for execution:', formatErrorDetails(err));
            if (supabase) {
                supabase.from('task_runs')
                    .update({ status: 'failed' })
                    .eq('id', updated.id)
                    .then(({ error: dbErr }) => {
                        if (dbErr) console.error('[Orchestrator] Failed to update failed status:', dbErr);
                    });
            }
            if (updated.chat_id) {
                const botUrl = resolveBotUrl(updated.channel);
                if (botUrl) {
                    axios.post(`${botUrl}/api/send`, {
                        chatId: updated.chat_id,
                        message: `❌ *Execution failed*\n\nSomething went wrong while implementing your task.\n_${err?.message || 'Unknown error'}_\n\nPlease try again with /task`,
                    }, { timeout: ORCHESTRATOR_BOT_SEND_TIMEOUT_MS }).catch(() => { });
                }
            }
        }
    })();
});

// ─── POST /api/reject ────────────────────────────────────────────────────────
app.post('/api/reject', async (req: Request, res: Response): Promise<any> => {
    const { runId, planId } = req.body;

    if (!runId && !planId) {
        return res.status(400).json({ error: 'Must provide runId or planId' });
    }

    if (!supabase) {
        return res.status(500).json({ error: 'Supabase is not configured' });
    }

    const matchQuery = runId ? { id: runId } : { plan_id: planId };

    const { data: updated, error } = await supabase
        .from('task_runs')
        .update({ status: 'rejected' })
        .match(matchQuery)
        .select()
        .single();

    if (error || !updated) {
        return res.status(404).json({ error: 'Task run not found' });
    }

    console.log(`[Orchestrator] Task ${updated.id} (plan ${updated.plan_id}) was REJECTED`);
    return res.status(200).json({ success: true, message: 'Task rejected', task: updated });
});

// ─── POST /api/refine ────────────────────────────────────────────────────────
app.post('/api/refine', async (req: Request, res: Response): Promise<any> => {
    const { planId, refinement, userId, channel, chatId } = req.body;

    if (!planId || !refinement) {
        return res.status(400).json({ error: 'Must provide planId and refinement' });
    }

    if (!supabase) {
        return res.status(500).json({ error: 'Supabase is not configured' });
    }

    const { data: existingRun, error } = await supabase
        .from('task_runs')
        .select('*')
        .eq('plan_id', planId)
        .single();

    if (error || !existingRun) {
        return res.status(404).json({ error: 'Task run not found' });
    }

    if (existingRun.status !== 'pending_approval') {
        return res.status(400).json({ error: `Cannot refine task in status ${existingRun.status}` });
    }

    // Acknowledge receipt to gateway immediately
    res.status(200).json({ success: true, message: `⚙️ Refining plan ${planId} with your instructions... I'll message you when it's updated.` });

    // Process refinement in the background
    (async () => {
        let refinedPlan: import('@coredev/contracts').ArchitecturePlan | undefined;
        try {
            refinedPlan = await orchestrationEngine.refine({
                planId,
                repoFullName: existingRun.repo,
                changeRequest: refinement,
                issueNumber: existingRun.issue_number
            });
            console.log(`[Orchestrator] Fetched Refined Architecture Plan ${refinedPlan?.planId}`);
        } catch (err: any) {
            console.error('[Orchestrator] Failed to fetch refined architecture plan:', formatErrorDetails(err));
            if (chatId || existingRun.chat_id) {
                const targetChatId = chatId || existingRun.chat_id;
                const failureMessage = `❌ *Refinement failed*\n\nCouldn't update the plan for issue #${existingRun.issue_number}.\n_${err?.message || 'Gateway timeout or planner unavailable.'}_\n\nTry again with *refine [your instructions]*`;
                const targetChannel = channel || existingRun.channel;
                const botUrl = resolveBotUrl(targetChannel);

                if (botUrl) {
                    axios.post(`${botUrl}/api/send`, { chatId: targetChatId, message: failureMessage }, {
                        timeout: ORCHESTRATOR_BOT_SEND_TIMEOUT_MS,
                    }).catch(e => console.error(e));
                }
            }
            return;
        }

        // Persist updated plan to Supabase
        const { error: dbError } = await supabase.from('task_runs').update({
            plan_id: refinedPlan.planId,
            plan_details: refinedPlan,
        }).eq('id', existingRun.id);

        if (dbError) {
            console.warn('[Orchestrator] Could not update task_run with refined plan:', dbError.message);
        }

        // Send updated approval card to user's chat
        const issueLabel = `🔄 Plan Updated for issue #${existingRun.issue_number}`;
        const formattedFiles = refinedPlan?.affectedFiles?.length ? refinedPlan.affectedFiles.map(f => `- \`${f}\``).join('\n') : '_None_';
        const formattedRisks = refinedPlan?.riskFlags?.length ? refinedPlan.riskFlags.map(r => `⚠️ ${r}`).join('\n') : '_None_';

        const approvalMessage = [
            `🔄 *CoreDev — Plan Updated*`,
            '',
            `${issueLabel}`,
            `🔗 ${existingRun.issue_url}`,
            '',
            `📋 *Task:* ${existingRun.description}`,
            '',
            `🏗️ *New Architecture Plan*`,
            `${refinedPlan?.summary || 'No summary available.'}`,
            '',
            `📂 *Files to change:*`,
            `${formattedFiles}`,
            '',
            ...(refinedPlan?.riskFlags?.length ? [`⚠️ *Risks:*`, `${formattedRisks}`, ''] : []),
            `─────────────────────`,
            `✅ /approve ${refinedPlan?.planId}`,
            `✏️ /refine ${refinedPlan?.planId} [your changes]`,
            `❌ /reject ${refinedPlan?.planId}`,
        ].join('\n');

        const botChannel = channel || existingRun.channel;
        const targetChatId = chatId || existingRun.chat_id;
        if (targetChatId) {
            const botUrl = resolveBotUrl(botChannel);

            if (botUrl) {
                axios.post(`${botUrl}/api/send`, { chatId: targetChatId, message: approvalMessage }, {
                    timeout: ORCHESTRATOR_BOT_SEND_TIMEOUT_MS,
                }).catch(e => console.error(e));
            }
        }
    })();
});

// ─── POST /api/pr-amend ──────────────────────────────────────────────────────
app.post('/api/pr-amend', async (req: Request, res: Response): Promise<any> => {
    const { planId, runId, amendment, userId, channel, chatId } = req.body;

    if ((!planId && !runId) || !amendment) {
        return res.status(400).json({ error: 'Must provide (planId or runId) and amendment instructions' });
    }

    if (!supabase) {
        return res.status(500).json({ error: 'Supabase is not configured' });
    }

    const matchQuery = runId ? { id: runId } : { plan_id: planId };
    const { data: existingRun, error } = await supabase
        .from('task_runs')
        .select('*')
        .match(matchQuery)
        .single();

    if (error || !existingRun) {
        return res.status(404).json({ error: 'Task run not found' });
    }

    if (existingRun.status !== 'completed') {
        return res.status(400).json({
            error: `Cannot amend task in status "${existingRun.status}". Task must be completed first.`
        });
    }

    if (!existingRun.branch_name) {
        return res.status(400).json({ error: 'No branch name stored for this task run. Cannot amend.' });
    }

    // Acknowledge immediately
    res.status(200).json({
        success: true,
        message: `🔧 Amending branch \`${existingRun.branch_name}\` with your instructions... I'll message you when done.`
    });

    // Dispatch amendment in background
    (async () => {
        const targetChatId = chatId || existingRun.chat_id;
        const targetChannel = channel || existingRun.channel;
        const botUrl = resolveBotUrl(targetChannel);

        try {
            const amendRunId = `${existingRun.id}-amend-${Date.now()}`;
            const approvedPlan = resolveApprovedPlan(existingRun.plan_details);
            if (!approvedPlan) {
                throw new Error('Original plan details not found for amendment.');
            }

            // Fetch github token for the user
            let amendGithubToken: string | undefined;
            if (supabase && (userId || existingRun.user_id)) {
                const { data: userPrefs } = await supabase
                    .from('user_preferences')
                    .select('github_token')
                    .eq('user_id', userId || existingRun.user_id)
                    .single();
                if (userPrefs?.github_token) {
                    amendGithubToken = userPrefs.github_token;
                }
            }

            const isolatedEnvironment = await provisionIsolatedExecutionEnvironment({
                runId: amendRunId,
                repoFullName: existingRun.repo,
                planId: approvedPlan.planId || existingRun.plan_id,
                description: amendment,
                planDetails: existingRun.plan_details,
                preferredBranchName: existingRun.branch_name,
                githubToken: amendGithubToken,
            });

            const executionSubTasks = buildExecutionSubTasks(approvedPlan);

            const amendBotUrl = resolveBotUrl(targetChannel);
            const execution = await orchestrationEngine.execute({
                runId: amendRunId,
                planId: approvedPlan.planId || existingRun.plan_id,
                requestId: approvedPlan.requestId,
                userId: userId || existingRun.user_id,
                repo: existingRun.repo,
                issueNumber: existingRun.issue_number,
                issueUrl: existingRun.issue_url,
                description: amendment,
                planDetails: approvedPlan,
                executionSubTasks,
                isolatedEnvironmentPath: isolatedEnvironment.workspacePath,
                executionBranchName: isolatedEnvironment.branchName,
                progressChatId: targetChatId || undefined,
                progressBotUrl: amendBotUrl || undefined,
                progressCallbackUrl: `http://localhost:${process.env.PORT || 3010}/api/runs/${amendRunId}/progress`,
            });

            const branchName = (execution.branchPush as any)?.branchName || existingRun.branch_name;
            const pushed = (execution.branchPush as any)?.pushed;
            const branchUrl = `https://github.com/${existingRun.repo}/tree/${branchName}`;

            if (targetChatId && botUrl) {
                const doneMessage = [
                    `✅ *Amendment applied!*`,
                    '',
                    `Your changes have been added to branch \`${branchName}\`.`,
                    `🔗 ${pushed ? branchUrl : '_Branch not pushed_'}`,
                    '',
                    `_Review the updated changes and merge when ready._`,
                ].join('\n');
                axios.post(`${botUrl}/api/send`, { chatId: targetChatId, message: doneMessage }, {
                    timeout: ORCHESTRATOR_BOT_SEND_TIMEOUT_MS,
                }).catch(() => { });
            }
        } catch (err: any) {
            console.error('[Orchestrator] Amendment failed:', err?.message);
            if (targetChatId && botUrl) {
                axios.post(`${botUrl}/api/send`, {
                    chatId: targetChatId,
                    message: `❌ *Amendment failed*\n\n_${err?.message || 'Unknown error'}_\n\nPlease try again with /amend`,
                }, { timeout: ORCHESTRATOR_BOT_SEND_TIMEOUT_MS }).catch(() => { });
            }
        }
    })();
});

// ─── Web Dashboard Routes ─────────────────────────────────────────────────────
// All routes require X-Session-Token header (web userId from dashboard).

const getWebUserId = (req: Request): string | null => {
    const token = req.headers['x-session-token'];
    if (!token || typeof token !== 'string') return null;
    return token.trim() || null;
};

// In-memory SSE clients map: runId → Set of Response objects
const sseClients = new Map<string, Set<Response>>();

export const emitRunEvent = (runId: string, event: import('@coredev/contracts').RunEvent): void => {
    const clients = sseClients.get(runId);
    if (!clients || clients.size === 0) return;

    const payload = `data: ${JSON.stringify(event)}\n\n`;
    for (const client of clients) {
        try {
            client.write(payload);
        } catch {
            // Client disconnected — will be cleaned up on 'close'
        }
    }
};

// Persist a run event to Supabase run_events table and emit to SSE clients
const persistAndEmitEvent = async (event: import('@coredev/contracts').RunEvent): Promise<void> => {
    if (supabase) {
        supabase.from('run_events').insert({
            id: event.id,
            run_id: event.runId,
            stage: event.stage,
            event_type: event.eventType,
            message: event.message,
            data: event.data || {},
            created_at: event.createdAt,
        }).then(({ error }) => {
            if (error) console.warn('[Orchestrator] Failed to persist run_event:', error.message);
        });
    }
    emitRunEvent(event.runId, event);
};

export const createRunEvent = (
    runId: string,
    stage: string,
    eventType: import('@coredev/contracts').RunEventType,
    message: string,
    data?: Record<string, unknown>
): import('@coredev/contracts').RunEvent => ({
    id: uuidv4(),
    runId,
    stage,
    eventType,
    message,
    data,
    createdAt: new Date().toISOString(),
});

// GET /api/runs — list runs for a web user (requires X-Session-Token)
app.get('/api/runs', async (req: Request, res: Response): Promise<any> => {
    const userId = getWebUserId(req);
    if (!userId) return res.status(401).json({ error: 'Missing X-Session-Token header' });
    if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });

    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const offset = Number(req.query.offset) || 0;

    const { data, error } = await supabase
        .from('task_runs')
        .select('id, plan_id, user_id, repo, issue_url, issue_number, description, status, channel, branch_name, pr_url, pr_number, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

    if (error) {
        console.error('[Orchestrator] Failed to list runs:', error.message);
        return res.status(500).json({ error: 'Failed to fetch runs' });
    }

    const runs = (data || []).map((r: any) => ({
        id: r.id,
        planId: r.plan_id,
        userId: r.user_id,
        repo: r.repo,
        issueUrl: r.issue_url,
        issueNumber: r.issue_number,
        description: r.description,
        status: r.status,
        channel: r.channel,
        branchName: r.branch_name,
        prUrl: r.pr_url,
        prNumber: r.pr_number,
        createdAt: r.created_at,
    }));

    return res.status(200).json({ runs, total: runs.length, offset, limit });
});

// GET /api/runs/:runId — get a single run's details
app.get('/api/runs/:runId', async (req: Request, res: Response): Promise<any> => {
    const userId = getWebUserId(req);
    if (!userId) return res.status(401).json({ error: 'Missing X-Session-Token header' });
    if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });

    const { runId } = req.params;

    const { data, error } = await supabase
        .from('task_runs')
        .select('*')
        .eq('id', runId)
        .eq('user_id', userId)
        .single();

    if (error || !data) {
        return res.status(404).json({ error: 'Run not found' });
    }

    return res.status(200).json({
        id: data.id,
        planId: data.plan_id,
        planDetails: data.plan_details,
        userId: data.user_id,
        repo: data.repo,
        issueUrl: data.issue_url,
        issueNumber: data.issue_number,
        description: data.description,
        status: data.status,
        channel: data.channel,
        branchName: data.branch_name,
        prUrl: data.pr_url,
        prNumber: data.pr_number,
        createdAt: data.created_at,
    });
});

// POST /api/runs/:runId/approve — approve a plan from web UI
app.post('/api/runs/:runId/approve', async (req: Request, res: Response): Promise<any> => {
    const userId = getWebUserId(req);
    if (!userId) return res.status(401).json({ error: 'Missing X-Session-Token header' });
    if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });

    const { runId } = req.params;

    // Verify ownership
    const { data: run } = await supabase
        .from('task_runs')
        .select('id, user_id, plan_id')
        .eq('id', runId)
        .eq('user_id', userId)
        .single();

    if (!run) return res.status(404).json({ error: 'Run not found' });

    // Delegate to the existing /api/approve handler logic by calling it internally
    // Re-use the planId from the run
    const fakeReq = { body: { runId, planId: run.plan_id } } as Request;
    const fakeRes = {
        status: (code: number) => ({
            json: (body: any) => res.status(code).json(body),
        }),
    } as unknown as Response;

    // Directly handle: update status + trigger async execution
    const { data: updated, error } = await supabase
        .from('task_runs')
        .update({ status: 'approved' })
        .eq('id', runId)
        .eq('status', 'pending_approval')
        .select()
        .single();

    if (error || !updated) {
        const { data: existing } = await supabase.from('task_runs').select('id, status').eq('id', runId).single();
        if (!existing) return res.status(404).json({ error: 'Run not found' });
        return res.status(200).json({ success: true, message: 'Already processing', status: existing.status });
    }

    await persistAndEmitEvent(createRunEvent(runId, 'approved', 'stage_change', 'Task approved — starting execution'));

    res.status(200).json({ success: true, message: 'Task approved and queued for execution', run: updated });

    // Async execution (same logic as /api/approve)
    (async () => {
        try {
            const approvedPlan = resolveApprovedPlan(updated.plan_details);
            if (!approvedPlan || !updated.repo) return;

            const executionSubTasks = buildExecutionSubTasks(approvedPlan);
            const preferredBranch = resolvePreferredExecutionBranch(updated.plan_details, updated.plan_id, updated.description);

            let githubToken: string | undefined;
            if (updated.user_id) {
                const { data: userPrefs } = await supabase.from('user_preferences').select('github_token').eq('user_id', updated.user_id).single();
                if (userPrefs?.github_token) githubToken = userPrefs.github_token;
            }

            await persistAndEmitEvent(createRunEvent(runId, 'generating', 'stage_change', 'Provisioning isolated workspace'));

            const isolatedEnvironment = await provisionIsolatedExecutionEnvironment({
                runId: updated.id,
                repoFullName: updated.repo,
                planId: approvedPlan.planId || updated.plan_id,
                description: updated.description || approvedPlan.summary,
                planDetails: updated.plan_details,
                preferredBranchName: preferredBranch.branchName,
                githubToken,
            });

            supabase.from('task_runs').update({ status: 'generating', branch_name: isolatedEnvironment.branchName }).eq('id', updated.id).then(() => {});

            await persistAndEmitEvent(createRunEvent(runId, 'generating', 'execution_started', `Workspace ready on branch ${isolatedEnvironment.branchName}`, { branch: isolatedEnvironment.branchName }));

            const execution = await orchestrationEngine.execute({
                runId: updated.id,
                planId: approvedPlan.planId || updated.plan_id,
                requestId: approvedPlan.requestId,
                userId: updated.user_id,
                repo: updated.repo,
                issueNumber: updated.issue_number,
                issueUrl: updated.issue_url,
                description: updated.description,
                planDetails: approvedPlan,
                executionSubTasks,
                isolatedEnvironmentPath: isolatedEnvironment.workspacePath,
                executionBranchName: isolatedEnvironment.branchName,
            });

            if (execution.branchPush) {
                const branchName = (execution.branchPush as any)?.branchName || 'n/a';
                const pushed = (execution.branchPush as any)?.pushed;
                supabase.from('task_runs').update({ status: 'completed', branch_name: branchName }).eq('id', updated.id).then(() => {});

                if ((execution as any).prUrl) {
                    supabase.from('task_runs').update({ pr_url: (execution as any).prUrl, pr_number: (execution as any).prNumber }).eq('id', updated.id).then(() => {});
                }

                await persistAndEmitEvent(createRunEvent(runId, 'completed', 'completed', `Code ready on branch ${branchName}`, {
                    branchName,
                    pushed,
                    prUrl: (execution as any).prUrl,
                }));
            }
        } catch (err: any) {
            const secData = err?.response?.data;
            if (err?.response?.status === 422 && secData?.error === 'security_blocked') {
                supabase.from('task_runs').update({ status: 'security_blocked' }).eq('id', runId).then(() => {});
                await persistAndEmitEvent(createRunEvent(runId, 'security_blocked', 'error', 'Security gate blocked execution', { vulnerabilities: secData.vulnerabilities }));
            } else {
                supabase.from('task_runs').update({ status: 'failed' }).eq('id', runId).then(() => {});
                await persistAndEmitEvent(createRunEvent(runId, 'failed', 'error', err?.message || 'Execution failed'));
            }
        }
    })();
});

// POST /api/runs/:runId/reject — reject a plan from web UI
app.post('/api/runs/:runId/reject', async (req: Request, res: Response): Promise<any> => {
    const userId = getWebUserId(req);
    if (!userId) return res.status(401).json({ error: 'Missing X-Session-Token header' });
    if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });

    const { runId } = req.params;

    const { data: updated, error } = await supabase
        .from('task_runs')
        .update({ status: 'rejected' })
        .eq('id', runId)
        .eq('user_id', userId)
        .select()
        .single();

    if (error || !updated) return res.status(404).json({ error: 'Run not found' });

    await persistAndEmitEvent(createRunEvent(runId, 'rejected', 'stage_change', 'Plan rejected by user'));
    return res.status(200).json({ success: true, message: 'Plan rejected', run: updated });
});

// POST /api/runs/:runId/refine — refine a plan from web UI
app.post('/api/runs/:runId/refine', async (req: Request, res: Response): Promise<any> => {
    const userId = getWebUserId(req);
    if (!userId) return res.status(401).json({ error: 'Missing X-Session-Token header' });
    if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });

    const { runId } = req.params;
    const { refinement } = req.body;

    if (!refinement || typeof refinement !== 'string' || !refinement.trim()) {
        return res.status(400).json({ error: 'Refinement instructions are required' });
    }

    const { data: existingRun, error } = await supabase
        .from('task_runs')
        .select('*')
        .eq('id', runId)
        .eq('user_id', userId)
        .single();

    if (error || !existingRun) return res.status(404).json({ error: 'Run not found' });
    if (existingRun.status !== 'pending_approval') {
        return res.status(400).json({ error: `Cannot refine task in status "${existingRun.status}"` });
    }

    await persistAndEmitEvent(createRunEvent(runId, 'planning', 'stage_change', 'Refining plan with user instructions'));

    res.status(200).json({ success: true, message: 'Refining plan...' });

    (async () => {
        try {
            const refinedPlan = await orchestrationEngine.refine({
                planId: existingRun.plan_id,
                repoFullName: existingRun.repo,
                changeRequest: refinement,
                issueNumber: existingRun.issue_number,
            });

            await supabase.from('task_runs').update({ plan_id: refinedPlan.planId, plan_details: refinedPlan }).eq('id', runId);
            await persistAndEmitEvent(createRunEvent(runId, 'pending_approval', 'plan_ready', 'Plan updated — awaiting approval', { planId: refinedPlan.planId }));
        } catch (err: any) {
            await persistAndEmitEvent(createRunEvent(runId, 'failed', 'error', `Refinement failed: ${err.message}`));
        }
    })();
});

// POST /api/runs/:runId/progress — internal endpoint for agent-runner to push live progress events
// Called by agent-runner during execution to stream real-time updates to the web dashboard
app.post('/api/runs/:runId/progress', async (req: Request, res: Response): Promise<any> => {
    const { runId } = req.params;
    const { stage, eventType, message, data } = req.body || {};
    if (!stage || !eventType || !message) {
        return res.status(400).json({ error: 'Missing required fields: stage, eventType, message' });
    }
    await persistAndEmitEvent(createRunEvent(runId, stage, eventType, message, data));
    return res.status(200).json({ ok: true });
});

// GET /api/runs/:runId/events — SSE stream of run events
// Accepts token via X-Session-Token header OR ?token= query param (for EventSource)
app.get('/api/runs/:runId/events', async (req: Request, res: Response): Promise<any> => {
    const userId = getWebUserId(req) || (req.query.token as string) || null;
    if (!userId) return res.status(401).json({ error: 'Missing session token' });
    if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });

    const { runId } = req.params;

    // Verify ownership
    const { data: run } = await supabase.from('task_runs').select('id, user_id').eq('id', runId).eq('user_id', userId).single();
    if (!run) return res.status(404).json({ error: 'Run not found' });

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    // Send historic events first
    const { data: historicEvents } = await supabase
        .from('run_events')
        .select('*')
        .eq('run_id', runId)
        .order('created_at', { ascending: true });

    if (historicEvents) {
        for (const e of historicEvents) {
            const event: import('@coredev/contracts').RunEvent = {
                id: e.id,
                runId: e.run_id,
                stage: e.stage,
                eventType: e.event_type,
                message: e.message,
                data: e.data,
                createdAt: e.created_at,
            };
            res.write(`data: ${JSON.stringify(event)}\n\n`);
        }
    }

    // Register client for live events
    if (!sseClients.has(runId)) sseClients.set(runId, new Set());
    sseClients.get(runId)!.add(res);

    // Heartbeat every 15s to keep connection alive
    const heartbeat = setInterval(() => {
        try { res.write(': heartbeat\n\n'); } catch { clearInterval(heartbeat); }
    }, 15_000);

    req.on('close', () => {
        clearInterval(heartbeat);
        const clients = sseClients.get(runId);
        if (clients) {
            clients.delete(res);
            if (clients.size === 0) sseClients.delete(runId);
        }
    });
});

// ─── Server Boot ─────────────────────────────────────────────────────────────

if (require.main === module) {
    app.listen(port, () => {
        console.log(`[Orchestrator] Service listening on port ${port}`);
    });
}

export default app;
