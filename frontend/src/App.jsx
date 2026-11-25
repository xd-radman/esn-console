/**
 * App.jsx — Root Application Shell & Route Configuration
 * Renders the persistent global `<Header />` above `<Routes>` and manages
 * shared shell state (such as the collapsible prediction sidebar toggle used
 * on `/project/:projectId` views).
 */

import { useCallback, useState } from 'react';
import { Route, Routes } from 'react-router-dom';
import Header from './components/Header.jsx';
import LandingPage from './pages/LandingPage.jsx';
import ProjectDashboard from './pages/ProjectDashboard.jsx';

export default function App() {
  // Tracks open/closed state for the dashboard Prediction Sidebar (wired in Phase 3)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleToggleSidebar = useCallback(() => {
    setIsSidebarOpen((prev) => !prev);
  }, []);

  return (
    <div className="app-shell">
      {/* Persistent global navigation bar across landing and project routes */}
      <Header
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={handleToggleSidebar}
      />

      {/* Client-side route table */}
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/project/:projectId" element={<ProjectDashboard />} />
      </Routes>
    </div>
  );
}
