import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchRun, approveRun, rejectRun, refineRun } from '../lib/api';
import type { TaskRunDetail } from '../lib/api';
import StatusBadge from '../components/StatusBadge';
import PlanCard from '../components/PlanCard';
import PRResult from '../components/PRResult';
import AgentTerminal from '../components/AgentTerminal';

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function RunDetailPage() {
  const { runId } = useParams<{ runId: string }>();
  const [run, setRun] = useState<TaskRunDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!runId) return;
    try {
      const data = await fetchRun(runId);
      setRun(data);
      setError(null);
    } catch (e: any) {
      setError(e?.response?.data?.error || e.message || 'Failed to load run');
    }
  }, [runId]);

  useEffect(() => {
    setLoading(true);
    reload().finally(() => setLoading(false));
  }, [reload]);

  // Poll for status updates on active runs
  useEffect(() => {
    if (!run) return;
    const activeStatuses = ['approved', 'generating', 'pending_approval'];
    if (!activeStatuses.includes(run.status)) return;

    const interval = setInterval(reload, 5000);
    return () => clearInterval(interval);
  }, [run, reload]);

  const handleApprove = async () => {
    if (!runId) return;
    setActionError(null);
    await approveRun(runId);
    await reload();
  };

  const handleReject = async () => {
    if (!runId) return;
    setActionError(null);
    await rejectRun(runId);
    await reload();
  };

  const handleRefine = async (refinement: string) => {
    if (!runId) return;
    setActionError(null);
    await refineRun(runId, refinement);
    await reload();
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-6 bg-gray-800 rounded w-1/3" />
        <div className="h-4 bg-gray-800 rounded w-1/2" />
        <div className="card h-40" />
      </div>
    );
  }

  if (error || !run) {
    return (
      <div className="card border-red-500/20 text-center py-12">
        <p className="text-sm text-red-400 mb-4">{error || 'Run not found'}</p>
        <Link to="/runs" className="btn-secondary text-xs">
          ← Back to Runs
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-up max-w-3xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Link to="/runs" className="hover:text-gray-400 transition-colors">
          Runs
        </Link>
        <span>/</span>
        <span className="font-mono text-gray-500 truncate">{run.id}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-white leading-snug">
            {run.description}
          </h1>
          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-500">
            <span className="font-mono">{run.repo}</span>
            {run.issueNumber && (
              <a
                href={run.issueUrl || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-red-brand transition-colors"
              >
                Issue #{run.issueNumber}
              </a>
            )}
            <span>{timeAgo(run.createdAt)}</span>
          </div>
        </div>
        <StatusBadge status={run.status} />
      </div>

      {actionError && (
        <div className="card border-red-500/20 bg-red-500/5 text-sm text-red-400">
          {actionError}
        </div>
      )}

      {/* PR Result */}
      {run.status === 'completed' && run.prUrl && (
        <PRResult
          prUrl={run.prUrl}
          prNumber={run.prNumber}
          branchName={run.branchName}
          repo={run.repo}
          issueUrl={run.issueUrl}
        />
      )}

      {/* Branch (completed without PR) */}
      {run.status === 'completed' && !run.prUrl && run.branchName && (
        <div className="card border-green-500/20 bg-green-500/5">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Branch Ready</p>
          <div className="flex items-center justify-between">
            <span className="filepath">{run.branchName}</span>
            <a
              href={`https://github.com/${run.repo}/tree/${run.branchName}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary text-xs"
            >
              View on GitHub →
            </a>
          </div>
        </div>
      )}

      {/* Security blocked */}
      {run.status === 'security_blocked' && (
        <div className="card border-orange-500/20 bg-orange-500/5">
          <div className="flex items-start gap-3">
            <span className="text-orange-400 text-xl mt-0.5">🛡</span>
            <div>
              <h3 className="text-sm font-bold text-orange-300 mb-1">
                Security Gate Blocked
              </h3>
              <p className="text-sm text-gray-400">
                The generated code was blocked before being pushed because our
                security reviewer detected vulnerabilities. Please refine your
                task description and submit again.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Failed */}
      {run.status === 'failed' && (
        <div className="card border-red-500/20 bg-red-500/5">
          <div className="flex items-start gap-3">
            <span className="text-red-400 text-xl mt-0.5">✕</span>
            <div>
              <h3 className="text-sm font-bold text-red-300 mb-1">
                Execution Failed
              </h3>
              <p className="text-sm text-gray-400">
                Something went wrong during execution. Check the terminal for
                details.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Plan approval card */}
      {run.status === 'pending_approval' && run.planDetails && (
        <PlanCard
          plan={run.planDetails}
          runId={run.id}
          onApprove={handleApprove}
          onReject={handleReject}
          onRefine={handleRefine}
        />
      )}

      {/* Plan summary (read-only, post-approval) */}
      {run.status !== 'pending_approval' && run.planDetails && (
        <div className="card">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Architecture Plan
          </h3>
          <p className="text-sm text-gray-300 leading-relaxed mb-4">
            {run.planDetails.summary}
          </p>
          {run.planDetails.affectedFiles.length > 0 && (
            <div className="mb-3">
              <p className="label">Files Changed</p>
              <div className="flex flex-wrap gap-1.5">
                {run.planDetails.affectedFiles.map((f) => (
                  <span key={f} className="filepath">{f}</span>
                ))}
              </div>
            </div>
          )}
          {run.planDetails.riskFlags.length > 0 && (
            <div>
              <p className="label text-orange-400">Risks</p>
              <ul className="space-y-1">
                {run.planDetails.riskFlags.map((r, i) => (
                  <li key={i} className="text-xs text-orange-300 flex items-start gap-2">
                    <span className="text-orange-500 mt-0.5">⚠</span>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Live Agent Terminal — shown when run is active or has events */}
      {['approved', 'generating', 'completed', 'failed', 'security_blocked'].includes(
        run.status
      ) && runId && (
        <AgentTerminal
          runId={runId}
          status={run.status}
          branchName={run.branchName}
          prUrl={run.prUrl}
        />
      )}

      {/* Run meta */}
      <div className="card">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Run Details
        </h3>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <div>
            <dt className="text-xs text-gray-600 uppercase tracking-wider">Run ID</dt>
            <dd className="font-mono text-xs text-gray-400 truncate">{run.id}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-600 uppercase tracking-wider">Plan ID</dt>
            <dd className="font-mono text-xs text-gray-400 truncate">{run.planId || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-600 uppercase tracking-wider">Repository</dt>
            <dd className="font-mono text-xs text-gray-300">{run.repo}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-600 uppercase tracking-wider">Channel</dt>
            <dd className="text-xs text-gray-400">{run.channel}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-600 uppercase tracking-wider">Created</dt>
            <dd className="text-xs text-gray-400">
              {new Date(run.createdAt).toLocaleString()}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray-600 uppercase tracking-wider">Status</dt>
            <dd>
              <StatusBadge status={run.status} size="sm" />
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
