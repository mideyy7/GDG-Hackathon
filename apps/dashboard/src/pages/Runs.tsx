import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchRuns } from '../lib/api';
import type { TaskRunSummary } from '../lib/api';
import RunCard from '../components/RunCard';

const STATUS_FILTERS = ['all', 'pending_approval', 'generating', 'completed', 'failed', 'rejected'];

export default function RunsPage() {
  const [runs, setRuns] = useState<TaskRunSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const LIMIT = 20;

  const loadRuns = async (newOffset = 0) => {
    setLoading(true);
    try {
      const { runs: fetched } = await fetchRuns(LIMIT, newOffset);
      if (newOffset === 0) {
        setRuns(fetched);
      } else {
        setRuns((prev) => [...prev, ...fetched]);
      }
      setHasMore(fetched.length === LIMIT);
      setOffset(newOffset);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRuns(0);
  }, []);

  const filtered =
    filter === 'all' ? runs : runs.filter((r) => r.status === filter);

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Runs</h1>
          <p className="text-gray-400 text-sm mt-1">
            All task runs and their current status.
          </p>
        </div>
        <Link to="/new-task" className="btn-primary text-xs">
          + New Task
        </Link>
      </div>

      {/* Status filter tabs */}
      <div className="flex items-center gap-1 flex-wrap">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
              filter === s
                ? 'bg-gray-700 text-white'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/60'
            }`}
          >
            {s === 'all' ? 'All' : s.replace('_', ' ')}
            {s === 'all' && (
              <span className="ml-1.5 text-gray-500">{runs.length}</span>
            )}
            {s !== 'all' && (
              <span className="ml-1.5 text-gray-500">
                {runs.filter((r) => r.status === s).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Runs list */}
      {loading && runs.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.08] bg-gray-800/60 backdrop-blur-sm overflow-hidden divide-y divide-white/[0.06]">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="px-5 py-4 animate-pulse">
              <div className="h-4 bg-gray-700 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-700 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="card border-red-500/20 text-center py-8">
          <p className="text-sm text-red-400">Failed to load runs: {error}</p>
          <button
            className="btn-secondary mt-4 text-xs"
            onClick={() => loadRuns(0)}
          >
            Retry
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-3xl mb-3">🤖</p>
          <p className="text-sm font-medium text-gray-400">
            {filter === 'all' ? 'No runs yet' : `No ${filter.replace('_', ' ')} runs`}
          </p>
          {filter === 'all' && (
            <Link to="/new-task" className="btn-primary mt-4 inline-flex text-sm">
              Submit Your First Task
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-white/[0.08] bg-gray-800/60 backdrop-blur-sm overflow-hidden divide-y divide-white/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
            {filtered.map((run) => (
              <RunCard key={run.id} run={run} />
            ))}
          </div>

          {hasMore && (
            <div className="text-center pt-2">
              <button
                className="btn-secondary text-xs"
                onClick={() => loadRuns(offset + LIMIT)}
                disabled={loading}
              >
                {loading ? 'Loading…' : 'Load More'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
