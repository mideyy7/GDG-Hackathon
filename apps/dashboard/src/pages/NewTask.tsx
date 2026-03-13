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

const STEPS = [
  'A GitHub issue is created for your task',
  'DevCore generates an architecture plan',
  'You review and approve the plan',
  'AI agents implement the code',
  'Security scan runs on the diff',
  'A pull request is opened for review',
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
    <div className="animate-fade-up">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-black text-white tracking-tight">New Task</h1>
        <p className="text-gray-300 text-sm mt-1">
          Describe what you want built, fixed, or changed in plain language.
        </p>
      </div>

      {!linkedRepo && (
        <div className="card border-yellow-500/20 bg-yellow-500/5 mb-6 text-sm">
          <p className="text-yellow-300 font-medium mb-1">⚠ No Repository Linked</p>
          <p className="text-gray-300">
            You haven't linked a repository yet.{' '}
            <a href="/repositories" className="text-brand hover:text-brand-dark underline">
              Link one first
            </a>{' '}
            before submitting a task.
          </p>
        </div>
      )}

      {/* Two-column layout */}
      <div className="grid lg:grid-cols-[1fr_280px] gap-6 items-start">

        {/* Main column */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Textarea with character count inside */}
          <div>
            <label className="label">Task Description</label>
            <div className="relative">
              <textarea
                className="textarea h-44 text-sm leading-relaxed pb-7"
                placeholder="Describe the task in plain language. Be specific about what you want added, changed, or fixed."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={submitting}
                maxLength={2000}
              />
              <span className="absolute bottom-2.5 right-3 text-[10px] text-gray-600 pointer-events-none tabular-nums">
                {description.length}/2000
              </span>
            </div>
          </div>

          {/* Examples as chips with + icon */}
          <div>
            <p className="label">Examples — click to use</p>
            <div className="flex flex-col gap-1.5">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  className="group flex items-center gap-2 text-left text-xs text-gray-400 hover:text-gray-200 px-3 py-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.05] hover:border-white/[0.10] transition-all duration-150 disabled:opacity-40"
                  onClick={() => setDescription(ex)}
                  disabled={submitting}
                >
                  <span className="shrink-0 w-4 h-4 rounded-full border border-gray-600 group-hover:border-brand group-hover:text-brand flex items-center justify-center text-[10px] transition-colors">+</span>
                  {ex}
                </button>
              ))}
            </div>
          </div>


      {/* What happens next */}
      <div className="mt-8 card">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          What happens next
        </p>
        <ol className="space-y-2 text-sm text-gray-400">
          {[
            'A GitHub issue is created for your task',
            'CoreDev generates an architecture plan',
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
