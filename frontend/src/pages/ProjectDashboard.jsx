/**
 * ProjectDashboard.jsx — Step 3.1 CSV Data Verification Workspace (`/project/:projectId`)
 * Reads `:projectId` from React Router, retrieves the matching project definition
 * and normalized CSV sessions/responses from `DataContext`, and renders a Swiss × Bento
 * verification summary (KPI counts, parsed session pills, and a responsive sample rows
 * table) before Steps 3.2–3.4 add toolbar modals, Chart.js tiles, and the sidebar.
 */

import { useEffect, useId, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  CalendarRange,
  Database,
  FileSpreadsheet,
  Star,
} from 'lucide-react';
import { useLang } from '../context/LangContext.jsx';
import { useData } from '../context/DataContext.jsx';
import StatusSelect from '../components/StatusSelect.jsx';

export default function ProjectDashboard() {
  const { projectId } = useParams();
  const { lang, t } = useLang();
  const { projects, responsesByProject, isLoading, loadError, updateProjectStatus } = useData();
  const tableCaptionId = useId();

  // Resolve active project metadata and its grouped CSV data bucket
  const activeProject = useMemo(
    () => projects.find((project) => project.id === projectId) ?? null,
    [projects, projectId]
  );

  const projectData = responsesByProject[projectId] ?? { sessions: [], responses: [] };
  const { sessions, responses } = projectData;

  const projectCopy = activeProject ? activeProject[lang] ?? activeProject.en : null;

  // Compute mean numeric satisfaction score across loaded responses
  const averageScore = useMemo(() => {
    const validScores = responses
      .map((row) => row.score)
      .filter((score) => typeof score === 'number' && Number.isFinite(score));

    if (validScores.length === 0) {
      return '—';
    }
    const sum = validScores.reduce((acc, value) => acc + value, 0);
    return (sum / validScores.length).toFixed(2);
  }, [responses]);

  // Keep the browser tab title synchronized with the active project title and language
  useEffect(() => {
    const label = projectCopy?.title ?? projectId ?? '';
    document.title = t('dashboard.pageTitle', { id: label });
  }, [projectCopy, projectId, t]);

  // Unknown `:projectId` fallback view
  if (!activeProject) {
    return (
      <main className="page-stage">
        <article className="bento-card placeholder-card">
          <header>
            <span className="mono-tag">{projectId}</span>
          </header>
          <div className="placeholder-body">
            <h1 className="font-editorial">{t('dashboard.notFoundTitle')}</h1>
            <p className="placeholder-subtitle">{t('dashboard.notFoundSubtitle')}</p>
          </div>
          <footer className="hairline-top">
            <Link to="/" className="btn">
              <ArrowLeft size={16} strokeWidth={1.5} aria-hidden="true" />
              <span>{t('common.backHome')}</span>
            </Link>
          </footer>
        </article>
      </main>
    );
  }

  return (
    <main className="dashboard-main">
      {/* Top project summary header with synchronized StatusSelect */}
      <section className="dashboard-header hairline-bottom">
        <div className="dashboard-header-inner">
          <div className="dashboard-header-copy">
            <div className="dashboard-header-tags">
              <span className="mono-tag">{activeProject.code}</span>
              <span className="font-mono-label dashboard-kicker">
                {t('dashboard.kicker')}
              </span>
            </div>

            <div className="dashboard-title-row">
              <h1 className="font-editorial dashboard-title">{projectCopy.title}</h1>
              <StatusSelect
                status={activeProject.status}
                projectTitle={projectCopy.title}
                onChange={(nextStatus) => updateProjectStatus(activeProject.id, nextStatus)}
              />
            </div>

            <p className="dashboard-subtitle">{projectCopy.subtitle}</p>
          </div>
        </div>
      </section>

      <div className="dashboard-content">
        {/* Loading / error status banner */}
        {isLoading && (
          <div className="bento-card dashboard-banner" role="status">
            <Database size={16} strokeWidth={1.5} aria-hidden="true" />
            <span>{t('dashboard.loadingData')}</span>
          </div>
        )}

        {loadError && (
          <div className="bento-card dashboard-banner error" role="alert">
            <AlertCircle size={16} strokeWidth={1.5} aria-hidden="true" />
            <span>
              {t('dashboard.loadError')}: {loadError}
            </span>
          </div>
        )}

        {/* 3-tile verification KPI strip confirming parsed CSV counts */}
        <section className="dashboard-kpi-strip" aria-label={t('dashboard.kicker')}>
          <article className="bento-card dashboard-kpi-tile">
            <span className="font-mono-label dashboard-kpi-label">
              <CalendarRange size={14} strokeWidth={1.5} aria-hidden="true" />
              <span>{t('dashboard.sessionsLoaded')}</span>
            </span>
            <p className="font-editorial dashboard-kpi-value tabular-nums">
              {sessions.length}
            </p>
          </article>

          <article className="bento-card dashboard-kpi-tile">
            <span className="font-mono-label dashboard-kpi-label">
              <FileSpreadsheet size={14} strokeWidth={1.5} aria-hidden="true" />
              <span>{t('dashboard.responsesLoaded')}</span>
            </span>
            <p className="font-editorial dashboard-kpi-value tabular-nums">
              {responses.length}
            </p>
          </article>

          <article className="bento-card dashboard-kpi-tile">
            <span className="font-mono-label dashboard-kpi-label">
              <Star size={14} strokeWidth={1.5} aria-hidden="true" />
              <span>{t('dashboard.avgScore')}</span>
            </span>
            <p className="font-editorial dashboard-kpi-value tabular-nums">
              {averageScore}
              <span className="dashboard-kpi-unit">/ 5</span>
            </p>
          </article>
        </section>

        {/* Parsed sessions overview card */}
        <section className="bento-card dashboard-section">
          <header className="dashboard-section-header">
            <h2 className="font-editorial">{t('dashboard.parsedSessionsTitle')}</h2>
            <span className="font-mono-label dashboard-section-count tabular-nums">
              {sessions.length}
            </span>
          </header>

          {sessions.length === 0 ? (
            <p className="dashboard-empty-text">{t('dashboard.noResponsesYet')}</p>
          ) : (
            <ul className="parsed-sessions-list">
              {sessions.map((session) => (
                <li key={session.id} className="parsed-session-item hairline">
                  <div className="parsed-session-info">
                    <span className="parsed-session-title">{session.title}</span>
                    <span className="font-mono-label parsed-session-dates tabular-nums">
                      {session.startDate}
                      {session.endDate && session.endDate !== session.startDate
                        ? ` — ${session.endDate}`
                        : ''}
                    </span>
                  </div>
                  <span className="font-mono-label status-badge active tabular-nums">
                    {session.responses.length} {t('card.responses')}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Responsive parsed CSV preview table verifying all normalized columns */}
        <section className="bento-card dashboard-section">
          <header className="dashboard-section-header">
            <h2 className="font-editorial">{t('dashboard.sampleRowsTitle')}</h2>
            <span className="font-mono-label dashboard-section-count tabular-nums">
              {responses.length}
            </span>
          </header>

          {responses.length === 0 ? (
            <p className="dashboard-empty-text">{t('dashboard.noResponsesYet')}</p>
          ) : (
            <div
              tabIndex={0}
              role="region"
              aria-labelledby={tableCaptionId}
              className="table-wrapper"
            >
              <table className="csv-preview-table">
                <caption id={tableCaptionId} className="visually-hidden">
                  {t('dashboard.sampleRowsCaption', { project: projectCopy.title })}
                </caption>
                <thead>
                  <tr>
                    <th scope="col">{t('dashboard.colSession')}</th>
                    <th scope="col">{t('dashboard.colDates')}</th>
                    <th scope="col">{t('dashboard.colCategories')}</th>
                    <th scope="col">{t('dashboard.colComfort')}</th>
                    <th scope="col">{t('dashboard.colScore')}</th>
                    <th scope="col">{t('dashboard.colOutcome')}</th>
                    <th scope="col">{t('dashboard.colNotes')}</th>
                  </tr>
                </thead>
                <tbody>
                  {responses.map((row) => (
                    <tr key={row.id}>
                      <th scope="row">{row.sessionTitle}</th>
                      <td className="tabular-nums cell-mono">
                        {row.startDate}
                      </td>
                      <td className="cell-mono">
                        {row.cat1} / {row.cat2}
                      </td>
                      <td className="cell-mono">{row.comfort}</td>
                      <td className="tabular-nums cell-score">
                        {row.score ?? '—'}
                      </td>
                      <td>
                        <span
                          className={`font-mono-label outcome-chip ${row.outcome}`}
                        >
                          {row.outcome}
                        </span>
                      </td>
                      <td className="cell-notes">
                        <strong>{row.note1}</strong>
                        {row.note2 ? ` — ${row.note2}` : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
