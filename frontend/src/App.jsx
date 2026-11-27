/**
 * App.jsx — Root Application Shell, Protected Routes & Client-Side Route Table
 * Renders the persistent `<Header />` on authenticated routes above `<Routes>`.
 * Protects `/` and `/project/:projectId` via `ProtectedRoute` so unauthenticated
 * users are redirected to `/login`, while coordinating `PredictionSidebar` state
 * between `Header` and `ProjectDashboard`.
 */

import { useCallback, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { LoaderCircle } from 'lucide-react';
import { useAuth } from './context/AuthContext.jsx';
import { useData } from './context/DataContext.jsx';
import { useLang } from './context/LangContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import Header from './components/Header.jsx';
import ErrorToast from './components/ErrorToast.jsx';
import LandingPage from './pages/LandingPage.jsx';
import ProjectDashboard from './pages/ProjectDashboard.jsx';
import LoginPage from './pages/LoginPage.jsx';
import AccessPendingPage from './pages/AccessPendingPage.jsx';

/**
 * Route guard redirecting unauthenticated visitors to `/login`, rendering the
 * `AccessPendingPage` limbo screen for accounts lacking `view_workspace`, and
 * showing a centered loading card until the initial Supabase session check completes.
 */
function ProtectedRoute({ children }) {
  const { user, isLimbo, loading } = useAuth();
  const { t } = useLang();

  if (loading) {
    return (
      <main className="auth-stage">
        <div className="bento-card auth-loading-card" role="status" aria-live="polite">
          <LoaderCircle
            size={20}
            strokeWidth={1.5}
            aria-hidden="true"
            className="auth-spinner"
          />
          <span className="font-mono-label">{t('auth.checkingSession')}</span>
        </div>
      </main>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Lock accounts without `view_workspace` out of all workspace routes until approved
  if (isLimbo) {
    return <AccessPendingPage />;
  }

  return children;
}

export default function App() {
  const location = useLocation();
  const { user, loading } = useAuth();
  const { actionError, dismissActionError } = useData();

  // Tracks open/closed state for the dashboard Prediction Sidebar
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleToggleSidebar = useCallback(() => {
    setIsSidebarOpen((prev) => !prev);
  }, []);

  const handleCloseSidebar = useCallback(() => {
    setIsSidebarOpen(false);
  }, []);

  // Hide the authenticated workspace header on `/login` or before sign-in resolves
  const showHeader = !loading && Boolean(user) && location.pathname !== '/login';

  return (
    <ToastProvider>
      <div className="app-shell">
        {showHeader && (
          <Header
            isSidebarOpen={isSidebarOpen}
            onToggleSidebar={handleToggleSidebar}
          />
        )}

        {/* Client-side route table with auth protection on workspace routes */}
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <LandingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/project/:projectId"
            element={
              <ProtectedRoute>
                <ProjectDashboard
                  isSidebarOpen={isSidebarOpen}
                  onCloseSidebar={handleCloseSidebar}
                />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        {/* Persistent dismissible toast region for Supabase write/RLS errors */}
        <ErrorToast error={actionError} onDismiss={dismissActionError} />
      </div>
    </ToastProvider>
  );
}
