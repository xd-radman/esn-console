/**
 * LandingPage.jsx — ESN Section Project Directory (`/`) & New Project Flow
 * Reads synchronized `projects` (with live CSV session & response counts) from
 * `DataContext`, renders the Swiss × Bento landing hero and chunked 3-card rows
 * padded with invisible flex spacers, and hosts `NewProjectModal`.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { useLang } from '../context/LangContext.jsx';
import { useData } from '../context/DataContext.jsx';
import ProjectCard from '../components/ProjectCard.jsx';
import NewProjectModal from '../components/modals/NewProjectModal.jsx';

const CARDS_PER_ROW = 3;

/**
 * Splits a flat array of projects into rows of at most `size` items (default 3)
 * so partial rows can be padded with invisible flex spacers for equal card widths.
 */
function chunkIntoRows(items, size = CARDS_PER_ROW) {
  const rows = [];
  for (let i = 0; i < items.length; i += size) {
    rows.push(items.slice(i, i + size));
  }
  return rows;
}

export default function LandingPage() {
  const { t } = useLang();
  const { projects, updateProjectStatus, addProject } = useData();

  // Controls open/closed state for the `+ New Project` modal dialog
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Keep browser tab title localized on `/`
  useEffect(() => {
    document.title = t('landing.pageTitle');
  }, [t]);

  // Group projects into 3-column rows and count active initiatives for the hero meta strip
  const projectRows = useMemo(() => chunkIntoRows(projects, CARDS_PER_ROW), [projects]);
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
        </div>
      </section>

      {/* Chunked 3-card project directory rows with invisible flex spacers */}
      <section
        className="landing-directory"
        aria-label={t('landing.directoryLabel')}
      >
        {projectRows.map((row, rowIndex) => {
          const spacerCount = CARDS_PER_ROW - row.length;

          return (
            <div key={row[0]?.id ?? rowIndex} className="project-row">
              {row.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onStatusChange={updateProjectStatus}
                />
              ))}

              {/* Pad partial rows to 3 items so partial-row cards match full-row widths */}
              {Array.from({ length: spacerCount }, (_, idx) => (
                <div
                  key={`spacer-${rowIndex}-${idx}`}
                  className="project-spacer"
                  aria-hidden="true"
                />
              ))}
            </div>
          );
        })}
      </section>

      {/* Accessible native `<dialog>` modal for creating or duplicating a project */}
      <NewProjectModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onCreate={handleCreateProject}
        projects={projects}
      />
    </main>
  );
}
