import { useEffect, useState } from 'react';
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
        <p className="text-gray-500 text-sm mt-1">
          Select a GitHub repository to link as your active project.
        </p>
      </div>

      {/* Current linked repo */}
      {linkedRepo && (
        <div className="card border-green-500/20 bg-green-500/5 flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-green-400" />
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Active Repository</p>
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
        <input
          type="search"
          className="input"
          placeholder="Search repositories…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      )}

      {/* Repo list */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-4 bg-gray-800 rounded w-1/3 mb-1" />
              <div className="h-3 bg-gray-800 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-sm text-gray-500">
            {repos.length === 0
              ? 'No repositories found on your GitHub account.'
              : 'No repositories match your search.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((repo) => {
            const isLinked = repo.fullName === linkedRepo;
            const isLinking = linking === repo.fullName;
            return (
              <div
                key={repo.fullName}
                className={`card-hover flex items-center gap-4 ${isLinked ? 'border-green-500/20 bg-green-500/5' : ''}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-sm text-gray-200 truncate">
                      {repo.fullName}
                    </p>
                    {repo.private && (
                      <span className="badge bg-gray-700 text-gray-400 text-xs">private</span>
                    )}
                    {isLinked && (
                      <span className="badge bg-green-500/20 text-green-400 text-xs">active</span>
                    )}
                  </div>
                  {repo.description && (
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      {repo.description}
                    </p>
                  )}
                  <p className="text-xs text-gray-700 mt-0.5 font-mono">
                    {repo.defaultBranch} · updated{' '}
                    {new Date(repo.updatedAt).toLocaleDateString()}
                  </p>
                </div>

                <button
                  className={isLinked ? 'btn-ghost text-xs text-green-400' : 'btn-secondary text-xs'}
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
