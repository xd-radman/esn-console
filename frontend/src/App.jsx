/**
 * App.jsx — Root Application Shell & Client-Side Route Table
 * Renders the persistent `<Header />` above `<Routes>`. Shared project and CSV
 * data are supplied by `DataProvider` in `main.jsx`, while `App.jsx` coordinates
 * the collapsible `PredictionSidebar` open/closed state between `Header` and `ProjectDashboard`.
 */

import { useCallback, useState } from 'react';
import { Route, Routes } from 'react-router-dom';
import Header from './components/Header.jsx';
import LandingPage from './pages/LandingPage.jsx';
import ProjectDashboard from './pages/ProjectDashboard.jsx';

export default function App() {
  // Tracks open/closed state for the dashboard Prediction Sidebar
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleToggleSidebar = useCallback(() => {
    setIsSidebarOpen((prev) => !prev);
  }, []);

  const handleCloseSidebar = useCallback(() => {
    setIsSidebarOpen(false);
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
        <Route
          path="/project/:projectId"
          element={
            <ProjectDashboard
              isSidebarOpen={isSidebarOpen}
              onCloseSidebar={handleCloseSidebar}
            />
          }
        />
      </Routes>
    </div>
  );
}
