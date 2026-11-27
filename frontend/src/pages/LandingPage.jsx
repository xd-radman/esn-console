/**
 * LandingPage.jsx — ESN Section Project Directory (`/`) & New Project Flow
 * Reads synchronized `projects` (with live CSV session & response counts) from
 * `DataContext`, renders the Swiss × Bento landing hero and an explicit 3-column
 * CSS Grid (`repeat(3, minmax(0, 1fr))` on desktop) so partial rows keep identical
 * card widths to full 3-card rows, and hosts `NewProjectModal`.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { useLang } from '../context/LangContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useData } from '../context/DataContext.jsx';
import ProjectCard from '../components/ProjectCard.jsx';
import NewProjectModal from '../components/modals/NewProjectModal.jsx';

export default function LandingPage() {
  const { t } = useLang();
  const { isAdmin } = useAuth();
  const { projects, updateProjectStatus, addProject } = useData();

  // Controls open/closed state for the `+ New Project` modal dialog
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Keep browser tab title localized on `/`
  useEffect(() => {
    document.title = t('landing.pageTitle');
  }, [t]);

  // Count active initiatives for the hero metadata strip
  const activeCount = useMemo(
    () => projects.filter((project) => project.status === 'active').length,
    [projects]
  );

  // Append newly created project card to shared DataContext and close modal
  const handleCreateProject = useCallback(
    (newProject) => {
      addProject(newProject);
      setIsModalOpen(false);
    },
    [addProject]
  );

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  return (
    <main className="landing-main">
      {/* Swiss International Landing Hero */}
      <section className="landing-hero hairline-bottom">
        <div className="landing-hero-inner">
          <div className="landing-hero-copy">
            <div className="landing-hero-brand">
              <img
                src="/esnstar_logo.png"
                alt=""
                width="64"
                height="64"
                className="landing-hero-logo"
              />
              <div className="landing-hero-tags">
                <span className="mono-tag">{t('landing.kicker')}</span>
                <span className="font-mono-label landing-hero-counts tabular-nums">
                  {t('landing.totalProjects', { count: projects.length })} ·{' '}
                  {t('landing.activeCount', { count: activeCount })}
                </span>
              </div>
            </div>

            <h1 className="font-editorial landing-hero-title">
              {t('landing.title')}
            </h1>
            <p className="landing-hero-subtitle">{t('landing.subtitle')}</p>
          </div>

          {isAdmin && (
            <div className="landing-hero-actions">
              <button
                type="button"
                className="btn primary landing-new-btn"
                onClick={() => setIsModalOpen(true)}
              >
                <Plus size={16} strokeWidth={1.5} aria-hidden="true" />
                <span>{t('landing.newProject')}</span>
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Fixed 3-column desktop CSS Grid ensuring equal card widths across partial rows */}
      <section
        className="landing-directory"
        aria-label={t('landing.directoryLabel')}
      >
        {projects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            canEditStatus={isAdmin}
            onStatusChange={updateProjectStatus}
          />
        ))}
      </section>

      {/* Accessible native `<dialog>` modal for creating or duplicating a project (Admin only) */}
      {isAdmin && (
        <NewProjectModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onCreate={handleCreateProject}
          projects={projects}
        />
      )}
    </main>
  );
}
