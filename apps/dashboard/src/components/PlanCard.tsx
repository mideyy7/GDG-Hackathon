import { useState } from 'react';
import type { ArchitecturePlan } from '../lib/api';

interface PlanCardProps {
  plan: ArchitecturePlan;
  runId: string;
  onApprove: () => Promise<void>;
  onReject: () => Promise<void>;
  onRefine: (instructions: string) => Promise<void>;
  disabled?: boolean;
}

export default function PlanCard({
  plan,
  runId,
  onApprove,
  onReject,
  onRefine,
  disabled,
}: PlanCardProps) {
  const [refineMode, setRefineMode] = useState(false);
  const [refinement, setRefinement] = useState('');
  const [loading, setLoading] = useState<'approve' | 'reject' | 'refine' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handle = async (
    action: 'approve' | 'reject' | 'refine',
    fn: () => Promise<void>
  ) => {
    setError(null);
    setLoading(action);
    try {
      await fn();
    } catch (e: any) {
      setError(e?.response?.data?.error || e.message || 'Action failed');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="card border-yellow-500/20 bg-yellow-500/5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
          <h3 className="text-sm font-bold text-yellow-300 uppercase tracking-wider">
            Architecture Plan — Awaiting Approval
          </h3>
        </div>
        <span className="text-xs font-mono text-gray-600">{plan.planId}</span>
      </div>

      {/* Summary */}
      <p className="text-sm text-gray-300 leading-relaxed mb-5">
        {plan.summary}
      </p>

      {/* Files */}
      {plan.affectedFiles.length > 0 && (
        <div className="mb-4">
          <p className="label">Files to Change</p>
          <div className="flex flex-wrap gap-1.5">
            {plan.affectedFiles.map((f) => (
              <span key={f} className="filepath">{f}</span>
            ))}
          </div>
        </div>
      )}

      {/* Agent assignments */}
      {plan.agentAssignments.length > 0 && (
        <div className="mb-4">
          <p className="label">Agent Assignments</p>
          <div className="flex flex-col gap-1">
            {plan.agentAssignments.map((a, i) => (
              <div
                key={i}
                className="flex items-center gap-2 text-xs text-gray-400 font-mono"
              >
                <span className={`badge ${a.domain === 'frontend' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-teal-500/20 text-teal-300'}`}>
                  {a.domain}
                </span>
                <span>{a.generator}</span>
                <span className="text-gray-700">→</span>
                <span>{a.reviewer}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Risk flags */}
      {plan.riskFlags.length > 0 && (
        <div className="mb-5">
          <p className="label text-orange-400">Risk Flags</p>
          <ul className="space-y-1">
            {plan.riskFlags.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-orange-300">
                <span className="mt-1 text-orange-500">⚠</span>
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Refine input */}
      {refineMode && (
        <div className="mb-4">
          <label className="label">Refinement Instructions</label>
          <textarea
            className="textarea h-24"
            placeholder="Describe what you'd like changed in this plan..."
            value={refinement}
            onChange={(e) => setRefinement(e.target.value)}
            disabled={loading === 'refine'}
          />
        </div>
      )}

      {error && (
        <p className="text-xs text-red-400 mb-3 bg-red-500/10 px-3 py-2 rounded-lg">
          {error}
        </p>
      )}

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-gray-800">
        <button
          className="btn-primary"
          disabled={disabled || !!loading}
          onClick={() => handle('approve', onApprove)}
        >
          {loading === 'approve' ? 'Approving…' : '✓ Approve & Execute'}
        </button>

        {refineMode ? (
          <>
            <button
              className="btn-secondary"
              disabled={disabled || !!loading || !refinement.trim()}
              onClick={() =>
                handle('refine', async () => {
                  await onRefine(refinement);
                  setRefineMode(false);
                  setRefinement('');
                })
              }
            >
              {loading === 'refine' ? 'Refining…' : 'Submit Refinement'}
            </button>
            <button
              className="btn-ghost"
              onClick={() => { setRefineMode(false); setRefinement(''); }}
              disabled={!!loading}
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            className="btn-secondary"
            disabled={disabled || !!loading}
            onClick={() => setRefineMode(true)}
          >
            ✏ Refine Plan
          </button>
        )}

        <button
          className="btn-ghost text-red-500 hover:text-red-400 hover:bg-red-500/10 ml-auto"
          disabled={disabled || !!loading}
          onClick={() => handle('reject', onReject)}
        >
          {loading === 'reject' ? 'Rejecting…' : '✕ Reject'}
        </button>
      </div>
    </div>
  );
}
