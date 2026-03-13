import express, { Request, Response } from 'express';
import crypto from 'crypto';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const port = process.env.PORT || 3001;

// Trust proxies (like Cloudflare Tunnel) to correctly identify the original protocol (HTTPS)
app.set('trust proxy', 1);

app.use(cors());
app.use(express.json());

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

const parsePositiveInt = (value: string | undefined, fallback: number): number => {
    const parsed = Number.parseInt(value || '', 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const GATEWAY_GITHUB_OAUTH_TIMEOUT_MS = parsePositiveInt(
    process.env.GATEWAY_GITHUB_OAUTH_TIMEOUT_MS,
    30_000
);
const GATEWAY_BOT_SEND_TIMEOUT_MS = parsePositiveInt(
    process.env.GATEWAY_BOT_SEND_TIMEOUT_MS,
    15_000
);
const GATEWAY_GITHUB_REPOS_TIMEOUT_MS = parsePositiveInt(
    process.env.GATEWAY_GITHUB_REPOS_TIMEOUT_MS,
    30_000
);
const GATEWAY_ORCHESTRATOR_TASK_TIMEOUT_MS = parsePositiveInt(
    process.env.GATEWAY_ORCHESTRATOR_TASK_TIMEOUT_MS,
    20 * 60 * 1000
);
const GATEWAY_ORCHESTRATOR_APPROVE_TIMEOUT_MS = parsePositiveInt(
    process.env.GATEWAY_ORCHESTRATOR_APPROVE_TIMEOUT_MS,
    4 * 60 * 60 * 1000
);
const GATEWAY_ORCHESTRATOR_REJECT_TIMEOUT_MS = parsePositiveInt(
    process.env.GATEWAY_ORCHESTRATOR_REJECT_TIMEOUT_MS,
    30_000
);
const GATEWAY_ORCHESTRATOR_REFINE_TIMEOUT_MS = parsePositiveInt(
    process.env.GATEWAY_ORCHESTRATOR_REFINE_TIMEOUT_MS,
    20 * 60 * 1000
);

const getOrchestratorBaseUrls = (): string[] => {
    const primaryUrl = process.env.ORCHESTRATOR_URL || 'http://localhost:3010';
    const candidates = [primaryUrl];

    try {
        const parsed = new URL(primaryUrl);
        if (parsed.hostname === 'host.docker.internal') {
            const localhostUrl = new URL(primaryUrl);
            localhostUrl.hostname = 'localhost';
            candidates.push(localhostUrl.toString().replace(/\/$/, ''));

            const loopbackUrl = new URL(primaryUrl);
            loopbackUrl.hostname = '127.0.0.1';
            candidates.push(loopbackUrl.toString().replace(/\/$/, ''));
        }
    } catch {
        // Keep the primary URL only if parsing fails.
    }

    return Array.from(new Set(candidates.map((url) => url.replace(/\/$/, ''))));
};

const isRetryableOrchestratorNetworkError = (error: any): boolean => {
    const code = error?.code;
    return code === 'ENOTFOUND' || code === 'EAI_AGAIN' || code === 'ECONNREFUSED' || code === 'ETIMEDOUT';
};

const postToOrchestrator = async <T>(
    endpointPath: string,
    body: unknown,
    timeoutMs: number
): Promise<T> => {
    const urls = getOrchestratorBaseUrls();
    let lastError: any;

    for (let index = 0; index < urls.length; index += 1) {
        const baseUrl = urls[index];
        const requestUrl = `${baseUrl}${endpointPath}`;

        try {
            const response = await axios.post<T>(requestUrl, body, { timeout: timeoutMs });
            return response.data;
        } catch (error: any) {
            lastError = error;
            const hasNext = index < urls.length - 1;
            if (!hasNext || !isRetryableOrchestratorNetworkError(error)) {
                break;
            }
            console.warn(`[Gateway] Orchestrator request failed via ${baseUrl} (${error.code || error.message}). Retrying with fallback URL...`);
        }
    }

    throw lastError;
};

// OAuth Init Endpoint
app.get('/api/auth/github', (req: Request, res: Response): any => {
    const clientId = process.env.GITHUB_CLIENT_ID;
    if (!clientId) {
        return res.status(500).json({ error: 'GitHub OAuth not configured on the server' });
    }

    // Accept pre-encoded opaque state from bots (s=<base64>) OR legacy explicit params
    let state: string;
    if (req.query.s) {
        state = req.query.s as string;
        try {
            const decoded = JSON.parse(Buffer.from(state, 'base64').toString('utf-8'));
            if (!decoded.userId || !decoded.provider) throw new Error('missing fields');
        } catch {
            return res.status(400).json({ error: 'Invalid state parameter' });
        }
    } else {
        const userId = req.query.userId as string;
        const provider = req.query.provider as string;
        const chatId = (req.query.chatId as string) || userId;
        if (!userId || !provider) {
            return res.status(400).json({ error: 'Missing userId or provider' });
        }
        state = Buffer.from(JSON.stringify({ userId, provider, chatId })).toString('base64');
    }

    // GITHUB_CALLBACK_URL must exactly match what is registered in your GitHub OAuth app.
    // If unset, redirect_uri is omitted and GitHub falls back to the app's registered default.
    const redirectUri = process.env.GITHUB_CALLBACK_URL?.replace(/\/+$/, '');
    const params = new URLSearchParams({ client_id: clientId, scope: 'repo', state });
    if (redirectUri) params.set('redirect_uri', redirectUri);

    res.redirect(`https://github.com/login/oauth/authorize?${params}`);
});

// OAuth Callback Endpoint
app.get('/api/auth/github/callback', async (req: Request, res: Response): Promise<any> => {
    const code = req.query.code as string;
    const state = req.query.state as string;

    if (!code || !state) {
        return res.status(400).send('Missing code or state');
    }

    try {
        const decodedState = JSON.parse(Buffer.from(state, 'base64').toString('utf-8'));
        const { userId, provider, chatId } = decodedState;

        const clientId = process.env.GITHUB_CLIENT_ID;
        const clientSecret = process.env.GITHUB_CLIENT_SECRET;

        if (!clientId || !clientSecret) {
            return res.status(500).send('GitHub OAuth not configured on the server');
        }

        const tokenResponse = await axios.post('https://github.com/login/oauth/access_token', {
            client_id: clientId,
            client_secret: clientSecret,
            code: code,
        }, {
            headers: {
                Accept: 'application/json'
            },
            timeout: GATEWAY_GITHUB_OAUTH_TIMEOUT_MS,
        });

        const accessToken = tokenResponse.data.access_token;

        if (!accessToken) {
            return res.status(400).send('Failed to obtain access token from GitHub');
        }

        if (supabase) {
            const { error } = await supabase
                .from('user_preferences')
                .upsert({ user_id: userId, github_token: accessToken }, { onConflict: 'user_id' });

            if (error) {
                console.error('[Gateway] Error saving token to Supabase:', error);
                return res.status(500).send('Failed to save GitHub token securely');
            }
        } else {
            console.warn('[Gateway] Supabase not configured. Cannot save token.');
            return res.status(500).send('Database not configured on server');
        }

        // Web provider: redirect back to the dashboard
        if (provider === 'web') {
            const dashboardUrl = process.env.DASHBOARD_URL || 'http://localhost:3005';
            const redirectUrl = decodedState.redirectUrl || `${dashboardUrl}/auth/success`;
            return res.redirect(`${redirectUrl}?userId=${encodeURIComponent(userId)}`);
        }

        // Fire-and-forget: send a proactive confirmation message to the user's chat
        if (chatId) {
            const proactiveMessage = `✅ GitHub login successful! You're all set.\n\nNext step: link your repository with /repo <owner>/<repo>, then start submitting tasks with /task <description>.`;
            let botUrl: string | undefined;
            if (provider === 'telegram') {
                botUrl = process.env.TELEGRAM_BOT_URL;
            } else if (provider === 'whatsapp') {
                botUrl = process.env.WHATSAPP_BOT_URL;
            }

            if (botUrl) {
                axios.post(`${botUrl}/api/send`, { chatId, message: proactiveMessage }, {
                    timeout: GATEWAY_BOT_SEND_TIMEOUT_MS,
                })
                    .then(() => console.log(`[Gateway] Sent login confirmation to ${provider} chat ${chatId}`))
                    .catch((err) => console.error(`[Gateway] Failed to send login confirmation to ${provider}:`, err.message));
            } else {
                console.warn(`[Gateway] No bot URL configured for provider: ${provider}. Set ${provider.toUpperCase()}_BOT_URL in .env to enable login confirmations.`);
            }
        }

        res.send(`
            <html>
                <head><title>Authentication Successful</title></head>
                <body style="font-family: sans-serif; text-align: center; padding: 50px;">
                    <h2>✅ GitHub Authentication Successful!</h2>
                    <p>Your GitHub account has been linked to DevClaw via ${provider}.</p>
                    <p><strong>You can close this window and return to your chat</strong> — we've sent you a confirmation message there too.</p>
                </body>
            </html>
        `);
    } catch (error: any) {
        console.error('[Gateway] OAuth callback error:', error.message);
        res.status(500).send('Authentication failed');
    }
});

// Main ingestion endpoint for all bot messages
app.post('/api/ingress/message', async (req: Request, res: Response): Promise<any> => {
    const { provider, payload } = req.body;

    if (!provider || !payload) {
        return res.status(400).json({ error: 'Missing provider or payload' });
    }

    console.log(`[Gateway] Received message from ${provider}:`, JSON.stringify(payload, null, 2));

    const text = payload.text || '';
    const userId = payload.userId ? payload.userId.toString() : '';

    if (payload.type === 'repo_link') {
        const parts = text.split(' ');
        if (parts.length < 2) {
            return res.status(400).json({ error: 'Invalid repo format. Use /repo <owner>/<repo>' });
        }
        const repo = parts[1].trim();

        if (supabase) {
            // Check if user is logged in
            const { data: userData, error: userError } = await supabase
                .from('user_preferences')
                .select('github_token')
                .eq('user_id', userId)
                .single();

            if (userError || !userData || !userData.github_token) {
                return res.status(200).json({ success: false, message: 'You need to log in to GitHub first before linking a repository. Use /login to authenticate.' });
            }

            const { error } = await supabase
                .from('user_preferences')
                .upsert({ user_id: userId, github_repo: repo }, { onConflict: 'user_id' });

            if (error) {
                console.error('[Gateway] Error saving to Supabase:', error);
                return res.status(500).json({ error: 'Failed to save repository link' });
            }
        } else {
            console.warn('[Gateway] Supabase not configured. Ignoring repo link.');
            return res.status(500).json({ error: 'Database not configured on server' });
        }

        return res.status(200).json({ success: true, message: `Successfully linked repository: ${repo}` });
    }

    if (payload.type === 'status') {
        if (!supabase) {
            return res.status(200).json({ success: false, message: 'Database not configured on server' });
        }

        const { data, error } = await supabase
            .from('user_preferences')
            .select('github_token, github_repo')
            .eq('user_id', userId)
            .single();

        let statusMessage = '';
        if (error || !data || !data.github_token) {
            statusMessage = '🔴 Not logged into GitHub.\nUse /login to authenticate.';
        } else {
            statusMessage = '🟢 Logged into GitHub.';
            if (data.github_repo) {
                statusMessage += `\n📁 Linked Repository: ${data.github_repo}`;
            } else {
                statusMessage += '\n📁 No repository linked.\nUse /repo <owner>/<repo> to link one.';
            }
        }

        return res.status(200).json({ success: true, message: statusMessage });
    }

    if (payload.type === 'repos') {
        if (!supabase) {
            return res.status(200).json({ success: false, message: 'Database not configured on server' });
        }

        const { data, error } = await supabase
            .from('user_preferences')
            .select('github_token')
            .eq('user_id', userId)
            .single();

        if (error || !data || !data.github_token) {
            return res.status(200).json({ success: false, message: 'You need to log in to GitHub first. Use /login to authenticate.' });
        }

        try {
            const response = await axios.get('https://api.github.com/user/repos?sort=updated&per_page=10', {
                headers: {
                    'Authorization': `Bearer ${data.github_token}`,
                    'Accept': 'application/vnd.github.v3+json'
                },
                timeout: GATEWAY_GITHUB_REPOS_TIMEOUT_MS,
            });

            const repos = response.data;
            if (repos.length === 0) {
                return res.status(200).json({ success: true, message: 'You have no accessible repositories.' });
            }

            const repoList = repos.map((r: any) => `- ${r.full_name}`).join('\n');
            const message = `Here are your recently updated repositories:\n${repoList}\n\nUse /repo <owner>/<repo> to link one project for tasks.`;
            return res.status(200).json({ success: true, message });
        } catch (error: any) {
            console.error('[Gateway] Error fetching repos:', error.response?.data || error.message);
            return res.status(200).json({ success: false, message: 'Failed to fetch repositories from GitHub.' });
        }
    }

    if (payload.type === 'approve' || payload.type === 'reject') {
        const parts = text.split(' ');
        if (parts.length < 2) {
            return res.status(200).json({ success: false, message: `Invalid ${payload.type} format. Use /${payload.type} <planId>` });
        }
        const planId = parts[1].trim();

        try {
            console.log(`[Gateway] Dispatching ${payload.type} for plan ${planId}`);
            const timeoutMs = payload.type === 'approve'
                ? GATEWAY_ORCHESTRATOR_APPROVE_TIMEOUT_MS
                : GATEWAY_ORCHESTRATOR_REJECT_TIMEOUT_MS;
            const orchResponse = await postToOrchestrator(`/api/${payload.type}`, { planId }, timeoutMs);
            return res.status(200).json(orchResponse);
        } catch (err: any) {
            const detail = err.response?.data?.error || err.message;
            console.error(`[Gateway] Orchestrator ${payload.type} failed:`, detail);
            return res.status(200).json({
                success: false,
                message: `Failed to process ${payload.type} — the orchestrator encountered an error.`,
            });
        }
    }

    if (payload.type === 'refine') {
        const parts = text.split(' ');
        if (parts.length < 3) {
            return res.status(200).json({ success: false, message: 'Invalid refine format. Use /refine <planId> <instructions>' });
        }
        const planId = parts[1].trim();
        const refinement = parts.slice(2).join(' ').trim();

        try {
            console.log(`[Gateway] Dispatching refine for plan ${planId}`);
            const orchResponse = await postToOrchestrator('/api/refine', {
                planId,
                refinement,
                userId,
                channel: provider,
                chatId: payload.chatId ? payload.chatId.toString() : ''
            }, GATEWAY_ORCHESTRATOR_REFINE_TIMEOUT_MS);
            return res.status(200).json(orchResponse);
        } catch (err: any) {
            const detail = err.response?.data?.error || err.message;
            console.error('[Gateway] Orchestrator refine failed:', detail);
            return res.status(200).json({
                success: false,
                message: 'Failed to process refinement. Ensure the planId is correct and try again.',
            });
        }
    }

    if (payload.type === 'amend') {
        const parts = text.split(' ');
        if (parts.length < 3) {
            return res.status(200).json({
                success: false,
                message: 'Invalid amend format. Use /amend <planId> <instructions>',
            });
        }
        const planId = parts[1].trim();
        const amendment = parts.slice(2).join(' ').trim();

        try {
            console.log(`[Gateway] Dispatching amend for plan ${planId}`);
            const orchResponse = await postToOrchestrator('/api/pr-amend', {
                planId,
                amendment,
                userId,
                channel: provider,
                chatId: payload.chatId ? payload.chatId.toString() : '',
            }, GATEWAY_ORCHESTRATOR_APPROVE_TIMEOUT_MS);
            return res.status(200).json(orchResponse);
        } catch (err: any) {
            const detail = err.response?.data?.error || err.message;
            console.error('[Gateway] Orchestrator amend failed:', detail);
            return res.status(200).json({
                success: false,
                message: `Failed to process amendment: ${detail}`,
            });
        }
    }

    if (payload.type === 'task') {
        // ── Validate user has a linked repo and GitHub token ──────────────────
        if (!supabase) {
            return res.status(200).json({ success: false, message: 'Database not configured on server.' });
        }

        const { data: userPrefs, error: prefsError } = await supabase
            .from('user_preferences')
            .select('github_repo, github_token')
            .eq('user_id', userId)
            .single();

        if (prefsError || !userPrefs) {
            return res.status(200).json({
                success: false,
                message: 'No account found. Please /login to GitHub and link a repo with /repo <owner>/<repo>.',
            });
        }

        if (!userPrefs.github_token) {
            return res.status(200).json({
                success: false,
                message: 'You need to /login to GitHub before submitting tasks.',
            });
        }

        if (!userPrefs.github_repo) {
            return res.status(200).json({
                success: false,
                message: 'No repository linked. Use /repo <owner>/<repo> to link one first.',
            });
        }

        // ── Build the task description ────────────────────────────────────────
        const description = text
            .replace(/^\/task\s+/i, '')
            .replace(/^\/request\s+/i, '')
            .trim();

        if (!description) {
            return res.status(200).json({
                success: false,
                message: 'Please provide a task description. Example: /task Fix the login button on mobile.',
            });
        }

        // ── Dispatch to orchestrator ──────────────────────────────────────────
        const repoParts = userPrefs.github_repo.split('/');
        const intakePayload: import('@devclaw/contracts').IntakeRequest = {
            requestId: crypto.randomUUID(),
            userId,
            channel: provider as "telegram" | "whatsapp",
            chatId: payload.chatId ? payload.chatId.toString() : '',
            repo: {
                owner: repoParts[0],
                name: repoParts[1],
            },
            message: description,
            timestampIso: new Date().toISOString()
        };

        try {
            console.log(`[Gateway] Dispatching task to orchestrator for repo ${userPrefs.github_repo}`);
            const orchResponse = await postToOrchestrator('/api/task', intakePayload, GATEWAY_ORCHESTRATOR_TASK_TIMEOUT_MS);
            return res.status(200).json(orchResponse);
        } catch (err: any) {
            const status = err.response?.status;
            const detail = err.response?.data?.error || err.message;
            console.error('[Gateway] Orchestrator dispatch failed:', detail);

            if (status === 400) {
                return res.status(200).json({ success: false, message: `Bad task request: ${detail}` });
            }
            if (status === 502) {
                return res.status(200).json({
                    success: false,
                    message: `GitHub issue creation failed: ${detail}`,
                });
            }
            return res.status(200).json({
                success: false,
                message: 'Task submission failed — the orchestrator is unavailable. Please try again shortly.',
            });
        }
    }

    res.status(200).json({ success: true, message: 'Message ingested' });
});

// ─── Web API Routes ──────────────────────────────────────────────────────────
// These routes are consumed by the Web Mission Control dashboard.
// Authentication: userId passed as X-Session-Token header (web-generated UUID).

const getWebUserId = (req: Request): string | null => {
    const token = req.headers['x-session-token'];
    if (!token || typeof token !== 'string') return null;
    return token.trim() || null;
};

// GET /api/web/me — return GitHub auth + repo status for web user
app.get('/api/web/me', async (req: Request, res: Response): Promise<any> => {
    const userId = getWebUserId(req);
    if (!userId) return res.status(401).json({ error: 'Missing X-Session-Token header' });
    if (!supabase) return res.status(500).json({ error: 'Database not configured' });

    const { data, error } = await supabase
        .from('user_preferences')
        .select('github_token, github_repo')
        .eq('user_id', userId)
        .single();

    if (error || !data) {
        return res.status(200).json({ authenticated: false, linkedRepo: null });
    }

    return res.status(200).json({
        authenticated: !!data.github_token,
        linkedRepo: data.github_repo || null,
    });
});

// GET /api/web/repos — list accessible GitHub repos for web user
app.get('/api/web/repos', async (req: Request, res: Response): Promise<any> => {
    const userId = getWebUserId(req);
    if (!userId) return res.status(401).json({ error: 'Missing X-Session-Token header' });
    if (!supabase) return res.status(500).json({ error: 'Database not configured' });

    const { data, error } = await supabase
        .from('user_preferences')
        .select('github_token')
        .eq('user_id', userId)
        .single();

    if (error || !data?.github_token) {
        return res.status(401).json({ error: 'GitHub not connected. Complete OAuth first.' });
    }

    try {
        const response = await axios.get(
            'https://api.github.com/user/repos?sort=updated&per_page=50&type=all',
            {
                headers: {
                    Authorization: `Bearer ${data.github_token}`,
                    Accept: 'application/vnd.github.v3+json',
                },
                timeout: GATEWAY_GITHUB_REPOS_TIMEOUT_MS,
            }
        );
        const repos = response.data.map((r: any) => ({
            fullName: r.full_name,
            name: r.name,
            owner: r.owner.login,
            private: r.private,
            defaultBranch: r.default_branch,
            updatedAt: r.updated_at,
            description: r.description,
        }));
        return res.status(200).json({ repos });
    } catch (err: any) {
        console.error('[Gateway] Failed to fetch GitHub repos for web user:', err.message);
        return res.status(502).json({ error: 'Failed to fetch repositories from GitHub' });
    }
});

// POST /api/web/repo-link — link a repository for the web user
app.post('/api/web/repo-link', async (req: Request, res: Response): Promise<any> => {
    const userId = getWebUserId(req);
    if (!userId) return res.status(401).json({ error: 'Missing X-Session-Token header' });
    if (!supabase) return res.status(500).json({ error: 'Database not configured' });

    const { repo } = req.body;
    if (!repo || typeof repo !== 'string' || !repo.includes('/')) {
        return res.status(400).json({ error: 'Invalid repo format. Expected "owner/name".' });
    }

    const { data: userData } = await supabase
        .from('user_preferences')
        .select('github_token')
        .eq('user_id', userId)
        .single();

    if (!userData?.github_token) {
        return res.status(401).json({ error: 'GitHub not connected. Complete OAuth first.' });
    }

    const { error } = await supabase
        .from('user_preferences')
        .upsert({ user_id: userId, github_repo: repo }, { onConflict: 'user_id' });

    if (error) {
        console.error('[Gateway] Failed to save web repo link:', error);
        return res.status(500).json({ error: 'Failed to save repository link' });
    }

    return res.status(200).json({ success: true, linkedRepo: repo });
});

// POST /api/web/task — submit a new task from the web UI
app.post('/api/web/task', async (req: Request, res: Response): Promise<any> => {
    const userId = getWebUserId(req);
    if (!userId) return res.status(401).json({ error: 'Missing X-Session-Token header' });
    if (!supabase) return res.status(500).json({ error: 'Database not configured' });

    const { description, repo } = req.body;
    if (!description || typeof description !== 'string' || !description.trim()) {
        return res.status(400).json({ error: 'Task description is required.' });
    }

    const { data: userPrefs, error: prefsError } = await supabase
        .from('user_preferences')
        .select('github_token, github_repo')
        .eq('user_id', userId)
        .single();

    if (prefsError || !userPrefs) {
        return res.status(401).json({ error: 'Account not found. Please connect GitHub first.' });
    }
    if (!userPrefs.github_token) {
        return res.status(401).json({ error: 'GitHub not connected. Complete OAuth first.' });
    }

    const targetRepo = repo || userPrefs.github_repo;
    if (!targetRepo) {
        return res.status(400).json({ error: 'No repository linked. Link a repo before submitting a task.' });
    }

    const repoParts = targetRepo.split('/');
    if (repoParts.length !== 2) {
        return res.status(400).json({ error: 'Invalid repository format.' });
    }

    const intakePayload: import('@devclaw/contracts').IntakeRequest = {
        requestId: crypto.randomUUID(),
        userId,
        channel: 'web',
        repo: { owner: repoParts[0], name: repoParts[1] },
        message: description.trim(),
        timestampIso: new Date().toISOString(),
    };

    try {
        const orchResponse = await postToOrchestrator('/api/task', intakePayload, GATEWAY_ORCHESTRATOR_TASK_TIMEOUT_MS);
        return res.status(200).json(orchResponse);
    } catch (err: any) {
        const status = err.response?.status;
        const detail = err.response?.data?.error || err.message;
        console.error('[Gateway] Web task dispatch failed:', detail);
        if (status === 400) return res.status(400).json({ error: detail });
        if (status === 502) return res.status(502).json({ error: `GitHub issue creation failed: ${detail}` });
        return res.status(503).json({ error: 'Orchestrator unavailable. Try again shortly.' });
    }
});

// GET /api/web/auth/github — initiate OAuth for web (userId in query or X-Session-Token)
app.get('/api/web/auth/github', (req: Request, res: Response): any => {
    const clientId = process.env.GITHUB_CLIENT_ID;
    if (!clientId) return res.status(500).json({ error: 'GitHub OAuth not configured' });

    const userId = (req.query.userId as string) || getWebUserId(req) || '';
    if (!userId) return res.status(400).json({ error: 'userId is required' });

    const dashboardUrl = process.env.DASHBOARD_URL || 'http://localhost:3005';
    const redirectUrl = `${dashboardUrl}/auth/success`;
    const state = Buffer.from(JSON.stringify({ userId, provider: 'web', redirectUrl })).toString('base64');

    const redirectUri = process.env.GITHUB_CALLBACK_URL?.replace(/\/+$/, '');
    const params = new URLSearchParams({ client_id: clientId, scope: 'repo', state });
    if (redirectUri) params.set('redirect_uri', redirectUri);

    res.redirect(`https://github.com/login/oauth/authorize?${params}`);
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({ status: 'ok' });
});


// Only start the server if not imported as a module (useful for testing)
if (require.main === module) {
    app.listen(port, () => {
        console.log(`[Gateway] Service listening on port ${port}`);
    });
}

export default app;
