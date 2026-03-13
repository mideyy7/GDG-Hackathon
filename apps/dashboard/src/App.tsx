import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getOrCreateSessionId, getSessionId } from './lib/session';
import { fetchUserStatus } from './lib/api';

import LoginPage from './pages/Login';
import AuthSuccessPage from './pages/AuthSuccess';
import OverviewPage from './pages/Overview';
import RepositoriesPage from './pages/Repositories';
import NewTaskPage from './pages/NewTask';
import RunsPage from './pages/Runs';
import RunDetailPage from './pages/RunDetail';
import Layout from './components/Layout';

interface AppState {
  loading: boolean;
  authenticated: boolean;
  linkedRepo: string | null;
}

function ProtectedRoute({ children, appState, onReload }: {
  children: React.ReactNode;
  appState: AppState;
  onReload: () => void;
}) {
  if (appState.loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-500 text-sm animate-pulse font-mono">
          INITIALIZING...
        </div>
      </div>
    );
  }
  if (!appState.authenticated) {
    return <Navigate to="/login" replace />;
  }
  return (
    <Layout linkedRepo={appState.linkedRepo}>
      {children}
    </Layout>
  );
}

export default function App() {
  const [appState, setAppState] = useState<AppState>({
    loading: true,
    authenticated: false,
    linkedRepo: null,
  });

  const checkAuth = async () => {
    // Ensure a session ID exists (creates one if not present)
    getOrCreateSessionId();

    if (!getSessionId()) {
      setAppState({ loading: false, authenticated: false, linkedRepo: null });
      return;
    }

    try {
      const status = await fetchUserStatus();
      setAppState({
        loading: false,
        authenticated: status.authenticated,
        linkedRepo: status.linkedRepo,
      });
    } catch {
      setAppState({ loading: false, authenticated: false, linkedRepo: null });
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/auth/success"
          element={<AuthSuccessPage onAuthComplete={checkAuth} />}
        />

        {/* Protected routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute appState={appState} onReload={checkAuth}>
              <OverviewPage linkedRepo={appState.linkedRepo} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/repositories"
          element={
            <ProtectedRoute appState={appState} onReload={checkAuth}>
              <RepositoriesPage onRepoLinked={checkAuth} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/new-task"
          element={
            <ProtectedRoute appState={appState} onReload={checkAuth}>
              <NewTaskPage linkedRepo={appState.linkedRepo} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/runs"
          element={
            <ProtectedRoute appState={appState} onReload={checkAuth}>
              <RunsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/runs/:runId"
          element={
            <ProtectedRoute appState={appState} onReload={checkAuth}>
              <RunDetailPage />
            </ProtectedRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
