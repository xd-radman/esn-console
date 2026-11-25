/**
 * ProjectDashboard.jsx — Dynamic Project Route (`/project/:projectId`) Placeholder
 * Reads `:projectId` from the URL via React Router, localizes the document title
 * and UI copy via `LangContext`, and provides navigation back to `/`.
 * Full KPI strip, charts, and sidebar will replace this placeholder in Phase 3.
 */

import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, FolderKanban } from 'lucide-react';
import { useLang } from '../context/LangContext.jsx';

export default function ProjectDashboard() {
  // Extract `:projectId` segment from `/project/:projectId` and translation helper
  const { projectId } = useParams();
  const { t } = useLang();

  // Reflect the active project slug and selected language in the browser tab title
  useEffect(() => {
    document.title = t('dashboard.pageTitle', { id: projectId ?? '' });
  }, [projectId, t]);

  return (
    <main className="page-stage">
      <article className="bento-card placeholder-card">
        {/* Card header: route preview kicker and current project slug pill */}
        <header>
          <span className="mono-tag">{t('dashboard.kicker')}</span>
          <span className="font-mono-label status-badge">
            <FolderKanban size={14} strokeWidth={1.5} aria-hidden="true" />
            <span>{projectId}</span>
          </span>
        </header>

        {/* Editorial placeholder heading and description */}
        <div className="placeholder-body">
          <h1 className="font-editorial">{t('dashboard.placeholderTitle')}</h1>
          <p className="placeholder-subtitle">{t('dashboard.placeholderSubtitle')}</p>
        </div>

        {/* Definition list displaying the parsed `:projectId` URL parameter */}
        <dl className="route-param-row hairline">
          <dt className="font-mono-label">{t('dashboard.projectIdLabel')}</dt>
          <dd className="font-mono-value">{projectId}</dd>
        </dl>

        {/* Footer with back-to-home navigation and current route path indicator */}
        <footer className="hairline-top">
          <Link to="/" className="btn">
            <ArrowLeft size={16} strokeWidth={1.5} aria-hidden="true" />
            <span>{t('common.backHome')}</span>
          </Link>
          <span className="font-mono-label">/project/{projectId}</span>
        </footer>
      </article>
    </main>
  );
}
