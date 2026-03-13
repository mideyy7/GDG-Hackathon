import axios from 'axios';

const GITHUB_API = 'https://api.github.com';
const parsePositiveInt = (value: string | undefined, fallback: number): number => {
    const parsed = Number.parseInt(value || '', 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const GITHUB_SEARCH_TIMEOUT_MS = parsePositiveInt(
    process.env.ORCHESTRATOR_GITHUB_SEARCH_TIMEOUT_MS,
    20_000
);
const GITHUB_CREATE_TIMEOUT_MS = parsePositiveInt(
    process.env.ORCHESTRATOR_GITHUB_CREATE_TIMEOUT_MS,
    30_000
);

/**
 * Search open issues in a repo for a title match.
 * Returns the first matching issue or null if not found.
 */
export async function findDuplicateIssue(
    token: string,
    owner: string,
    repo: string,
    title: string
): Promise<{ number: number; html_url: string } | null> {
    try {
        // Use the GitHub search issues API to find open issues with similar titles
        const query = encodeURIComponent(`repo:${owner}/${repo} is:issue is:open ${title}`);
        const response = await axios.get(`https://api.github.com/search/issues?q=${query}&per_page=5`, {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/vnd.github.v3+json',
            },
            timeout: GITHUB_SEARCH_TIMEOUT_MS,
        });

        const items = response.data.items;
        if (items && items.length > 0) {
            // Check for a close enough match (case-insensitive title substring)
            const normalizedTitle = title.toLowerCase();
            const match = items.find((issue: any) =>
                issue.title.toLowerCase().includes(normalizedTitle) ||
                normalizedTitle.includes(issue.title.toLowerCase())
            );
            if (match) {
                return { number: match.number, html_url: match.html_url };
            }
        }
        return null;
    } catch (err: any) {
        console.warn('[Orchestrator] Issue search failed, will create new issue:', err.message);
        return null;
    }
}

/**
 * Create a new GitHub issue.
 */
export async function createIssue(
    token: string,
    owner: string,
    repo: string,
    title: string,
    body: string
): Promise<{ number: number; html_url: string }> {
    const response = await axios.post(
        `${GITHUB_API}/repos/${owner}/${repo}/issues`,
        { title, body, labels: ['coredev'] },
        {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/vnd.github.v3+json',
            },
            timeout: GITHUB_CREATE_TIMEOUT_MS,
        }
    );
    return { number: response.data.number, html_url: response.data.html_url };
}

/**
 * Main entry point: find an existing duplicate or create a new issue.
 * Returns the issue number, URL, and whether it was a duplicate.
 */
export async function createOrDedupeIssue(
    token: string,
    owner: string,
    repo: string,
    title: string,
    body: string
): Promise<{ number: number; html_url: string; isDuplicate: boolean }> {
    const existing = await findDuplicateIssue(token, owner, repo, title);
    if (existing) {
        return { ...existing, isDuplicate: true };
    }
    const created = await createIssue(token, owner, repo, title, body);
    return { ...created, isDuplicate: false };
}

/**
 * Fetch the repository file tree.
 */
export async function fetchRepoTree(token: string, owner: string, repo: string): Promise<string[]> {
    try {
        const repoParams = {
            headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.v3+json' },
            timeout: GITHUB_SEARCH_TIMEOUT_MS,
        };
        const repoRes = await axios.get(`${GITHUB_API}/repos/${owner}/${repo}`, repoParams);
        const defaultBranch = repoRes.data.default_branch;

        const treeRes = await axios.get(`${GITHUB_API}/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`, repoParams);
        return treeRes.data.tree
            .filter((item: any) => item.type === 'blob')
            .map((item: any) => item.path);
    } catch (err: any) {
        console.warn('[Orchestrator] Failed to fetch repo tree:', err?.message);
        return [];
    }
}
