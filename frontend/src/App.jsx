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
import { useLang } from './context/LangContext.jsx';
import Header from './components/Header.jsx';
import LandingPage from './pages/LandingPage.jsx';
import ProjectDashboard from './pages/ProjectDashboard.jsx';
import LoginPage from './pages/LoginPage.jsx';

/**
 * Route guard redirecting unauthenticated visitors to `/login` while displaying
 * a centered loading card until the initial Supabase session check completes.
 */
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
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

  return children;
}

export default function App() {
  const location = useLocation();
  const { user, loading } = useAuth();

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
    </div>
  );
}
