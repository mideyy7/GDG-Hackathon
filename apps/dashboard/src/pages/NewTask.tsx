import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { submitTask } from '../lib/api';

interface NewTaskProps {
  linkedRepo: string | null;
}

const EXAMPLES = [
  'Add dark mode support to the user settings page',
  'Fix the race condition in the authentication middleware',
  'Add rate limiting to the public API endpoints',
  'Refactor the database connection pool for better error handling',
  'Add unit tests for the payment processing module',
];

export default function NewTaskPage({ linkedRepo }: NewTaskProps) {
  const navigate = useNavigate();
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const result = await submitTask(description.trim());
      if (result.runId) {
        navigate(`/runs/${result.runId}`);
      } else {
        navigate('/runs');
      }
    } catch (e: any) {
      const msg = e?.response?.data?.error || e.message || 'Submission failed';
      setError(msg);
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl animate-fade-up">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-white tracking-tight">
          New Task
        </h1>
        <p className="text-gray-300 text-sm mt-1">
          Describe what you want built, fixed, or changed in plain language.
        </p>
      </div>

      {!linkedRepo && (
        <div className="card border-yellow-500/20 bg-yellow-500/5 mb-6 text-sm">
          <p className="text-yellow-300 font-medium mb-1">⚠ No Repository Linked</p>
          <p className="text-gray-300">
            You haven't linked a repository yet.{' '}
            <a href="/repositories" className="text-brand hover:text-red-400 underline">
              Link one first
            </a>{' '}
            before submitting a task.
          </p>
        </div>
      )}

      {linkedRepo && (
        <div className="flex items-center gap-2 mb-4 text-xs text-gray-400">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
          Working on <span className="font-mono text-gray-300">{linkedRepo}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="label">Task Description</label>
          <textarea
            className="textarea h-40 text-sm leading-relaxed"
            placeholder="Describe the task in plain language. Be specific about what you want added, changed, or fixed."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={submitting}
          />
          <p className="text-xs text-gray-500 mt-1">
            {description.length}/2000 characters
          </p>
        </div>

        {/* Examples */}
        <div>
          <p className="label">Examples</p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                className="text-xs text-gray-400 hover:text-gray-300 border border-gray-800 hover:border-gray-700 rounded-lg px-3 py-1.5 transition-colors text-left"
                onClick={() => setDescription(ex)}
                disabled={submitting}
              >
                {ex}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="card border-red-500/20 bg-red-500/5 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            className="btn-primary"
            disabled={!description.trim() || !linkedRepo || submitting}
          >
            {submitting ? (
              <>
                <span className="animate-pulse">⚡</span> Submitting…
              </>
            ) : (
              '→ Submit Task'
            )}
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => navigate(-1)}
            disabled={submitting}
          >
            Cancel
          </button>
        </div>
      </form>

      {/* What happens next */}
      <div className="mt-8 card">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          What happens next
        </p>
        <ol className="space-y-2 text-sm text-gray-300">
          {[
            'A GitHub issue is created for your task',
            'DevCore generates an architecture plan',
            'You review and approve the plan',
            'AI agents implement the code',
            'Security scan runs on the diff',
            'A pull request is opened for review',
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span className="text-brand font-mono text-xs mt-0.5 w-4 shrink-0">
                {i + 1}.
              </span>
              {step}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
