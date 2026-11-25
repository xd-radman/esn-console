/**
 * App.jsx — Root Application Shell, Shared Project State & Route Table
 * Holds the in-memory `projects` array (seeded from `initialProjects.js` until
 * Phase 4 Supabase persistence) so status updates made via `StatusSelect` stay
 * synchronized across `LandingPage`, `Header`, and `ProjectDashboard`.
 */

import { useCallback, useState } from 'react';
import { Route, Routes } from 'react-router-dom';
import Header from './components/Header.jsx';
import LandingPage from './pages/LandingPage.jsx';
import ProjectDashboard from './pages/ProjectDashboard.jsx';
import { INITIAL_PROJECTS } from './lib/initialProjects.js';

export default function App() {
  // Shared project list mirroring the future Supabase `projects` table
  const [projects, setProjects] = useState(INITIAL_PROJECTS);

  // Tracks open/closed state for the dashboard Prediction Sidebar (wired in Phase 3)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleToggleSidebar = useCallback(() => {
    setIsSidebarOpen((prev) => !prev);
  }, []);

  // Update a single project's `'active' | 'inactive'` status across all views
  const handleStatusChange = useCallback((projectId, nextStatus) => {
    setProjects((prev) =>
      prev.map((project) =>
        project.id === projectId ? { ...project, status: nextStatus } : project
      )
    );
  }, []);

  return (
    <div className="app-shell">
      {/* Persistent global navigation bar across landing and project routes */}
      <Header
        projects={projects}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={handleToggleSidebar}
      />

      {/* Client-side route table */}
      <Routes>
        <Route
          path="/"
          element={
            <LandingPage
              projects={projects}
              onStatusChange={handleStatusChange}
            />
          }
        />
        <Route
          path="/project/:projectId"
          element={<ProjectDashboard projects={projects} />}
        />
      </Routes>
    </div>
  );
}
