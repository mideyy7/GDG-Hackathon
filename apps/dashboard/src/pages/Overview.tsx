import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchRuns } from '../lib/api';
import type { TaskRunSummary } from '../lib/api';
import RunCard from '../components/RunCard';

interface OverviewProps {
  linkedRepo: string | null;
}

export default function OverviewPage({ linkedRepo }: OverviewProps) {
  const [recentRuns, setRecentRuns] = useState<TaskRunSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRuns(5)
      .then(({ runs }) => setRecentRuns(runs))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const stats = {
    total: recentRuns.length,
    completed: recentRuns.filter((r) => r.status === 'completed').length,
    active: recentRuns.filter((r) =>
      ['approved', 'generating'].includes(r.status)
    ).length,
    pending: recentRuns.filter((r) => r.status === 'pending_approval').length,
  };

  return (
    <div className="animate-fade-up">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-black text-white tracking-tight">
          Mission Control
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          AI engineering control center — submit tasks, review plans, ship code.
        </p>
      </div>

      {/* Setup prompt (no linked repo) */}
      {!linkedRepo && (
        <div className="card border-yellow-500/20 bg-yellow-500/5 flex items-start gap-4 mb-6">
          <span className="text-2xl mt-0.5">⚡</span>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-yellow-300 mb-1">
              Link a Repository to Get Started
            </h3>
            <p className="text-sm text-gray-400 mb-3">
              Connect a GitHub repository to start submitting AI coding tasks.
            </p>
            <Link to="/repositories" className="btn-primary text-xs">
              Link Repository →
            </Link>
          </div>
        </div>
      )}

      {/* Overview area: stats + actions grouped tightly */}
      <div className="space-y-3 mb-16">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Recent Runs',      value: stats.total,     color: 'text-white',     glow: 'rgba(255,255,255,0.12)', icon: '◈', grad: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)', accent: 'rgba(200,200,200,0.25)' },
            { label: 'Completed',        value: stats.completed, color: 'text-green-400', glow: 'rgba(74,222,128,0.20)',  icon: '✓',  grad: 'linear-gradient(135deg, rgba(74,222,128,0.06) 0%, rgba(74,222,128,0.01) 100%)',   accent: 'rgba(60,140,80,0.7)' },
            { label: 'Active',           value: stats.active,    color: 'text-purple-400',glow: 'rgba(168,85,247,0.22)', icon: '⚡', grad: 'linear-gradient(135deg, rgba(168,85,247,0.07) 0%, rgba(168,85,247,0.01) 100%)',  accent: 'rgba(120,60,190,0.65)' },
            { label: 'Pending Approval', value: stats.pending,   color: 'text-yellow-400',glow: 'rgba(250,204,21,0.20)', icon: '◷', grad: 'linear-gradient(135deg, rgba(250,204,21,0.06) 0%, rgba(250,204,21,0.01) 100%)',  accent: 'rgba(180,140,20,0.65)' },
          ].map((s) => (
            <div key={s.label} className="card flex items-center gap-4 py-4" style={{ backgroundImage: s.grad, borderTop: `3px solid ${s.accent}` }}>
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                style={{ background: `radial-gradient(circle at 40% 40%, ${s.glow}, transparent 75%)`, boxShadow: `0 0 16px ${s.glow}` }}
              >
                <span className={s.color}>{s.icon}</span>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-[0.12em] leading-none mb-1">{s.label}</p>
                <p className={`text-4xl font-black leading-none tabular-nums ${s.color}`}>{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Quick actions — ghost style */}
        <div className="grid sm:grid-cols-2 gap-3">
          <Link
            to="/new-task"
            className="group flex items-center gap-4 px-5 py-4 rounded-2xl bg-brand hover:bg-brand-dark shadow-[0_0_24px_rgba(255,90,32,0.18)] hover:shadow-[0_0_32px_rgba(255,90,32,0.32)] transition-all duration-200"
          >
            <span className="text-black text-xl font-light">+</span>
            <div>
              <p className="text-sm font-bold text-black">New Task</p>
              <p className="text-xs text-black/60">Submit a coding task description</p>
            </div>
            <span className="ml-auto text-black/50 group-hover:text-black transition-colors text-sm">→</span>
          </Link>

          <Link
            to="/runs"
            className="group flex items-center gap-4 px-5 py-4 rounded-2xl border border-white/[0.10] bg-white/[0.04] hover:border-white/[0.18] hover:bg-white/[0.07] transition-all duration-200"
          >
            <span className="text-gray-400 text-xl">≡</span>
            <div>
              <p className="text-sm font-semibold text-white">All Runs</p>
              <p className="text-xs text-gray-500">View run history and details</p>
            </div>
            <span className="ml-auto text-gray-500 group-hover:text-gray-300 transition-colors text-sm">→</span>
          </Link>
        </div>
      </div>

      {/* Recent runs — unified container with dividers */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
            Recent Runs
          </h2>
          <Link to="/runs" className="text-xs text-gray-500 hover:text-gray-200 transition-colors">
            View all →
          </Link>
        </div>

        {loading ? (
          <div className="card divide-y divide-white/[0.06] p-0 overflow-hidden">
            {[1, 2, 3].map((i) => (
              <div key={i} className="px-5 py-4 animate-pulse">
                <div className="h-4 bg-gray-800 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-800 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="card border-red-500/20 text-center py-8">
            <p className="text-sm text-red-400">Failed to load runs: {error}</p>
          </div>
        ) : recentRuns.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-3xl mb-3">🤖</p>
            <p className="text-sm font-medium text-gray-400">No runs yet</p>
            <p className="text-xs text-gray-500 mt-1">Submit your first task to get started</p>
            <Link to="/new-task" className="btn-primary mt-4 inline-flex">Submit a Task</Link>
          </div>
        ) : (
          <div className="card p-0 overflow-hidden divide-y divide-white/[0.05]">
            {recentRuns.map((run) => (
              <RunCard key={run.id} run={run} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
