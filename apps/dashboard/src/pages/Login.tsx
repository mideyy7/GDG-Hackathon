import { getOrCreateSessionId } from '../lib/session';
import { getGitHubOAuthUrl } from '../lib/api';

export default function LoginPage() {
  const handleConnect = () => {
    const userId = getOrCreateSessionId();
    const oauthUrl = getGitHubOAuthUrl(userId);
    window.location.href = oauthUrl;
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4">
      <div className="grain-overlay" />
      <div className="relative z-10 w-full max-w-md animate-fade-up">
        {/* Logo */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-black tracking-tight mb-2">
            <span className="text-white">DEV</span>
            <span className="text-brand">CLAW</span>
          </h1>
          <p className="text-gray-500 text-sm font-mono tracking-widest uppercase">
            Mission Control
          </p>
        </div>

        {/* Card */}
        <div className="card border-gray-700">
          {/* Scan line */}
          <div className="relative overflow-hidden rounded-t-xl -mx-5 -mt-5 mb-6 h-1">
            <div className="scan-line" />
          </div>

          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-bold text-white">Connect your workspace</h2>
              <p className="text-sm text-gray-400 mt-1">
                Connect your GitHub account to start submitting tasks and reviewing
                AI-generated code changes in real time.
              </p>
            </div>

            <div className="space-y-2 text-sm text-gray-400">
              {[
                'Submit natural language task descriptions',
                'Review architecture plans before execution',
                'Watch the AI code in real time',
                'Approve and merge generated PRs',
              ].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <span className="text-brand">›</span>
                  {item}
                </div>
              ))}
            </div>

            <button
              onClick={handleConnect}
              className="btn-primary w-full justify-center py-3 text-base"
            >
              <svg
                className="w-4 h-4"
                fill="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                  clipRule="evenodd"
                />
              </svg>
              Connect GitHub
            </button>

            <p className="text-xs text-gray-600 text-center">
              We request <code className="text-gray-500">repo</code> scope to read your
              repository tree and open pull requests.
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-700 mt-6">
          DevCore AI Engineering Control Center
        </p>
      </div>
    </div>
  );
}
