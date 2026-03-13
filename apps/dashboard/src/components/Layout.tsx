import { Link, useLocation, useNavigate } from 'react-router-dom';
import { clearSession } from '../lib/session';

interface LayoutProps {
  children: React.ReactNode;
  linkedRepo?: string | null;
}

const NAV_LINKS = [
  { to: '/', label: 'Overview' },
  { to: '/runs', label: 'Runs' },
  { to: '/new-task', label: 'New Task' },
  { to: '/repositories', label: 'Repos' },
];

export default function Layout({ children, linkedRepo }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    clearSession();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Grain overlay */}
      <div className="grain-overlay" />

      {/* Top navbar */}
      <nav className="sticky top-0 z-40 bg-gray-950/90 backdrop-blur-sm border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-6">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <span className="text-lg font-black tracking-tight">
              <span className="text-white">Core</span>
              <span className="text-brand">Dev</span>
            </span>
          </Link>

          {/* Nav links */}
          <div className="flex items-center gap-1 ml-4">
            {NAV_LINKS.map((link) => {
              const isActive =
                link.to === '/'
                  ? location.pathname === '/'
                  : location.pathname.startsWith(link.to);
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`nav-link px-3 py-1.5 text-sm font-medium rounded transition-colors duration-150 ${
                    isActive
                      ? 'text-white bg-gray-800 active'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Linked repo badge */}
          {linkedRepo && (
            <Link
              to="/repositories"
              className="hidden sm:flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
              <span className="font-mono truncate max-w-[200px]">{linkedRepo}</span>
            </Link>
          )}

          {/* New Task CTA */}
          <Link to="/new-task" className="btn-primary text-xs px-3 py-1.5">
            + New Task
          </Link>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
          >
            Logout
          </button>
        </div>
      </nav>

      {/* Page content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-4 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs text-gray-400">
          <span>
            <span className="text-gray-600 font-bold">Core</span>
            <span className="text-brand-deep font-bold">Dev</span>
            {' '}— AI Engineering Control Center
          </span>
          <span>Mission Control v0.1</span>
        </div>
      </footer>
    </div>
  );
}
