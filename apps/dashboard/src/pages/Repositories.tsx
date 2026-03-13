import { useEffect, useRef, useState } from 'react';
import { fetchGitHubRepos, linkRepository } from '../lib/api';
import type { GitHubRepo } from '../lib/api';
import { fetchUserStatus } from '../lib/api';

interface RepositoriesProps {
  onRepoLinked: () => void;
}

export default function RepositoriesPage({ onRepoLinked }: RepositoriesProps) {
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState<string | null>(null);
  const [linkedRepo, setLinkedRepo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [success, setSuccess] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([fetchGitHubRepos(), fetchUserStatus()])
      .then(([repoList, status]) => {
        setRepos(repoList);
        setLinkedRepo(status.linkedRepo);
      })
      .catch((e) => setError(e.response?.data?.error || e.message))
      .finally(() => setLoading(false));
  }, []);

  const handleLink = async (fullName: string) => {
    setLinking(fullName);
    setError(null);
    setSuccess(null);
    try {
      await linkRepository(fullName);
      setLinkedRepo(fullName);
      setSuccess(`Linked ${fullName} as your active repository.`);
      onRepoLinked();
    } catch (e: any) {
      setError(e.response?.data?.error || e.message || 'Failed to link repository');
    } finally {
      setLinking(null);
    }
  };

  const filtered = repos.filter((r) =>
    r.fullName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight">
          Repositories
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Select a GitHub repository to link as your active project.
        </p>
      </div>

      {/* Current linked repo */}
      {linkedRepo && (
        <div className="card border-green-500/20 bg-green-500/5 flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-green-400" />
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider">Active Repository</p>
            <p className="font-mono text-sm text-green-300">{linkedRepo}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="card border-green-500/20 bg-green-500/5 text-sm text-green-300">
          ✓ {success}
        </div>
      )}

      {error && (
        <div className="card border-red-500/20 bg-red-500/5 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Search */}
      {!loading && repos.length > 0 && (
        <div className="relative">
          <input
            ref={searchRef}
            type="search"
            className="input pr-9"
            placeholder="Search repositories…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && searchRef.current?.blur()}
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
            onClick={() => searchRef.current?.focus()}
            tabIndex={-1}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      )}

      {/* Repo list */}
      {loading ? (
        <div className="rounded-2xl border border-white/[0.08] bg-gray-800/60 backdrop-blur-sm overflow-hidden divide-y divide-white/[0.06]">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="px-5 py-4 animate-pulse">
              <div className="h-4 bg-gray-700 rounded w-1/3 mb-2" />
              <div className="h-3 bg-gray-700 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-sm text-gray-400">
            {repos.length === 0
              ? 'No repositories found on your GitHub account.'
              : 'No repositories match your search.'}
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/[0.08] bg-gray-800/60 backdrop-blur-sm overflow-hidden divide-y divide-white/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
          {filtered.map((repo) => {
            const isLinked = repo.fullName === linkedRepo;
            const isLinking = linking === repo.fullName;
            return (
              <div
                key={repo.fullName}
                className={`group flex items-center gap-4 px-5 py-4 transition-colors duration-150 hover:bg-white/[0.03] ${isLinked ? 'bg-green-500/[0.04]' : ''}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-sm text-gray-200 truncate">
                      {repo.fullName}
                    </p>
                    {repo.private && (
                      <span className="badge bg-gray-700 text-gray-300 text-xs">private</span>
                    )}
                    {isLinked && (
                      <span className="badge bg-green-500/20 text-green-400 text-xs">active</span>
                    )}
                  </div>
                  {repo.description && (
                    <p className="text-xs text-gray-400 truncate mt-0.5">
                      {repo.description}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-0.5 font-mono">
                    {repo.defaultBranch} · updated{' '}
                    {new Date(repo.updatedAt).toLocaleDateString()}
                  </p>
                </div>

                <button
                  className={isLinked ? 'btn-ghost text-xs text-green-400' : 'btn-secondary text-xs hover:!bg-brand-dark hover:!text-white hover:!border-brand-dark'}
                  onClick={() => !isLinked && handleLink(repo.fullName)}
                  disabled={isLinking || isLinked}
                >
                  {isLinking ? 'Linking…' : isLinked ? '✓ Active' : 'Link'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
