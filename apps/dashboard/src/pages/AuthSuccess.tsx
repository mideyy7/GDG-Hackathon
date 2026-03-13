import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { setSessionId } from '../lib/session';

interface AuthSuccessProps {
  onAuthComplete: () => void | Promise<void>;
}

export default function AuthSuccessPage({ onAuthComplete }: AuthSuccessProps) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const userId = searchParams.get('userId');
    if (userId) {
      setSessionId(userId);
    }

    // Re-check auth state and redirect
    const result = onAuthComplete();
    if (result && typeof (result as Promise<void>).then === 'function') {
      (result as Promise<void>).then(() => navigate('/', { replace: true }));
    } else {
      setTimeout(() => navigate('/', { replace: true }), 200);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4">
      <div className="grain-overlay" />
      <div className="relative z-10 text-center animate-fade-up">
        <div className="text-4xl mb-4">✓</div>
        <h2 className="text-xl font-bold text-white mb-2">GitHub Connected</h2>
        <p className="text-sm text-gray-400">Redirecting to Mission Control…</p>
        <div className="mt-4 flex items-center justify-center gap-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse"
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
