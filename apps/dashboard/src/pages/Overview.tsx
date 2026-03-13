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
    <div className="space-y-8 animate-fade-up">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight">
          Mission Control
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          AI engineering control center — submit tasks, review plans, ship code.
        </p>
      </div>

      {/* Setup prompt (no linked repo) */}
      {!linkedRepo && (
        <div className="card border-yellow-500/20 bg-yellow-500/5 flex items-start gap-4">
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

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Recent Runs', value: stats.total, color: 'text-white' },
          { label: 'Completed', value: stats.completed, color: 'text-green-400' },
          { label: 'Active', value: stats.active, color: 'text-purple-400' },
          { label: 'Pending Approval', value: stats.pending, color: 'text-yellow-400' },
        ].map((s) => (
          <div key={s.label} className="card text-center">
            <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-1 uppercase tracking-wider">
              {s.label}
            </p>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid sm:grid-cols-2 gap-4">
        <Link
          to="/new-task"
          className="card-hover flex items-center gap-4 group"
        >
          <div className="w-10 h-10 rounded-lg bg-brand/10 border border-brand/20 flex items-center justify-center text-brand text-lg group-hover:bg-brand/20 transition-colors">
            +
          </div>
          <div>
            <p className="text-sm font-semibold text-white">New Task</p>
            <p className="text-xs text-gray-500">Submit a coding task description</p>
          </div>
          <span className="ml-auto text-gray-700 group-hover:text-gray-400 transition-colors">→</span>
        </Link>

        <Link
          to="/runs"
          className="card-hover flex items-center gap-4 group"
        >
          <div className="w-10 h-10 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center text-gray-400 text-lg group-hover:border-gray-600 transition-colors">
            ≡
          </div>
          <div>
            <p className="text-sm font-semibold text-white">All Runs</p>
            <p className="text-xs text-gray-500">View run history and details</p>
          </div>
          <span className="ml-auto text-gray-700 group-hover:text-gray-400 transition-colors">→</span>
        </Link>
      </div>

      {/* Recent runs */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wider">
            Recent Runs
          </h2>
          <Link to="/runs" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
            View all →
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card animate-pulse">
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
            <p className="text-xs text-gray-600 mt-1">
              Submit your first task to get started
            </p>
            <Link to="/new-task" className="btn-primary mt-4 inline-flex">
              Submit a Task
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {recentRuns.map((run) => (
              <RunCard key={run.id} run={run} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
