/**
 * App.jsx — Root Application Shell & Client-Side Route Table
 * Renders the persistent `<Header />` above `<Routes>`. Shared project and CSV
 * data are supplied by `DataProvider` in `main.jsx`, while `App.jsx` holds the
 * shell-level prediction sidebar toggle state.
 */

import { useCallback, useState } from 'react';
import { Route, Routes } from 'react-router-dom';
import Header from './components/Header.jsx';
import LandingPage from './pages/LandingPage.jsx';
import ProjectDashboard from './pages/ProjectDashboard.jsx';

export default function App() {
  // Tracks open/closed state for the dashboard Prediction Sidebar (wired in Phase 3.4)
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
