/**
 * LandingPage.jsx — ESN Section Project Directory (`/`)
 * Renders the Swiss × Bento landing hero (64px ESN Star logo, kicker, editorial
 * title, subtitle, and `+ New Project` trigger) followed by chunked 3-card rows.
 * Incomplete rows (1 or 2 cards) are padded with invisible `.project-spacer`
 * items so cards in partial rows stay the exact same width as full 3-card rows.
 */

import { useEffect, useMemo, useState } from 'react';
import { Info, Plus, X } from 'lucide-react';
import { useLang } from '../context/LangContext.jsx';
import ProjectCard from '../components/ProjectCard.jsx';

const CARDS_PER_ROW = 3;

/**
 * Splits a flat array of projects into rows of at most `size` items (default 3)
 * so CSS flexbox X-axis hover expansion operates independently within each row.
 */
function chunkIntoRows(items, size = CARDS_PER_ROW) {
  const rows = [];
  for (let i = 0; i < items.length; i += size) {
    rows.push(items.slice(i, i + size));
  }
  return rows;
}

export default function LandingPage({ projects = [], onStatusChange, onOpenNewProject }) {
  const { t } = useLang();

  // Temporary Step 2.1 placeholder notice state until NewProjectModal is built in Step 2.2
  const [showModalPlaceholder, setShowModalPlaceholder] = useState(false);

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

  // Trigger parent modal handler if provided (Step 2.2), otherwise toggle Step 2.1 preview banner
  const handleNewProjectClick = () => {
    if (onOpenNewProject) {
      onOpenNewProject();
      return;
    }
    setShowModalPlaceholder((prev) => !prev);
  };

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
              onClick={handleNewProjectClick}
            >
              <Plus size={16} strokeWidth={1.5} aria-hidden="true" />
              <span>{t('landing.newProject')}</span>
            </button>
          </div>
        </div>

        {/* Dismissible placeholder banner shown until Step 2.2 wires NewProjectModal.jsx */}
        {showModalPlaceholder && (
          <div className="landing-placeholder-notice bento-card" role="status">
            <Info size={16} strokeWidth={1.5} aria-hidden="true" />
            <span>{t('landing.newProjectSoon')}</span>
            <button
              type="button"
              className="btn ghost landing-notice-close"
              aria-label={t('landing.dismissNotice')}
              onClick={() => setShowModalPlaceholder(false)}
            >
              <X size={15} strokeWidth={1.5} aria-hidden="true" />
            </button>
          </div>
        )}
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
                  onStatusChange={onStatusChange}
                />
              ))}

              {/* Pad partial rows to 3 items so rest & hover widths match full rows */}
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
    </main>
  );
}
