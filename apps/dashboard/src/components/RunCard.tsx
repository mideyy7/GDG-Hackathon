import { Link } from 'react-router-dom';
import StatusBadge from './StatusBadge';
import type { TaskRunSummary } from '../lib/api';

interface RunCardProps {
  run: TaskRunSummary;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function RunCard({ run }: RunCardProps) {
  return (
    <Link
      to={`/runs/${run.id}`}
      className="card-hover block group"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Description */}
          <p className="text-sm font-semibold text-gray-100 leading-snug line-clamp-2 group-hover:text-white transition-colors">
            {run.description}
          </p>

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className="font-mono text-xs text-gray-500 bg-gray-800 group-hover:bg-gray-700 px-1.5 py-0.5 rounded transition-colors">{run.repo}</span>
            {run.issueNumber && (
              <a
                href={run.issueUrl || '#'}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-xs text-gray-600 hover:text-brand transition-colors"
              >
                #{run.issueNumber}
              </a>
            )}
            <span className="text-xs text-gray-600">{timeAgo(run.createdAt)}</span>
          </div>

          {/* Branch / PR */}
          {(run.branchName || run.prUrl) && (
            <div className="flex items-center gap-3 mt-2">
              {run.branchName && (
                <span className="filepath">{run.branchName}</span>
              )}
              {run.prUrl && (
                <a
                  href={run.prUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs text-green-400 hover:text-green-300 transition-colors"
                >
                  View PR →
                </a>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          <StatusBadge status={run.status} />
          <span className="text-[10px] font-bold text-cyan-300 uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity duration-150 whitespace-nowrap drop-shadow-[0_0_6px_rgba(103,232,249,0.6)]">
            Quick View →
          </span>
        </div>
      </div>
    </Link>
  );
}
