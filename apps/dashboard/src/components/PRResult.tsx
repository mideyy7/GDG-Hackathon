interface PRResultProps {
  prUrl: string;
  prNumber?: number | null;
  branchName?: string | null;
  repo: string;
  issueUrl?: string | null;
}

export default function PRResult({
  prUrl,
  prNumber,
  branchName,
  repo,
  issueUrl,
}: PRResultProps) {
  const branchUrl = branchName
    ? `https://github.com/${repo}/tree/${branchName}`
    : null;

  return (
    <div className="card border-green-500/20 bg-green-500/5">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-green-400 text-lg">✓</span>
        <h3 className="text-sm font-bold text-green-300 uppercase tracking-wider">
          Code Ready
        </h3>
      </div>

      <div className="space-y-3">
        {prUrl && (
          <div className="flex items-center justify-between gap-4 p-3 bg-gray-900 rounded-lg border border-gray-800">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-0.5">
                Pull Request
              </p>
              <p className="text-sm text-gray-200 font-medium">
                PR #{prNumber ?? '—'}
              </p>
            </div>
            <a
              href={prUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary text-xs"
            >
              View PR →
            </a>
          </div>
        )}

        {branchName && (
          <div className="flex items-center justify-between gap-4 p-3 bg-gray-900 rounded-lg border border-gray-800">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-0.5">
                Branch
              </p>
              <p className="font-mono text-xs text-gray-300">{branchName}</p>
            </div>
            {branchUrl && (
              <a
                href={branchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary text-xs"
              >
                Browse →
              </a>
            )}
          </div>
        )}

        {issueUrl && (
          <div className="flex items-center justify-between gap-4 p-3 bg-gray-900 rounded-lg border border-gray-800">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-0.5">
                Issue
              </p>
              <p className="text-sm text-gray-300 font-mono truncate max-w-xs">
                {issueUrl.split('/').slice(-2).join('#')}
              </p>
            </div>
            <a
              href={issueUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost text-xs"
            >
              View →
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
