/**
 * ProjectDashboard.jsx — Step 3.2 Dashboard Header & Session Management Toolbar
 * Renders:
 * 1. Dashboard Header: project code, Newsreader title, Inter subtitle, and synchronized `StatusSelect`.
 * 2. Session Toolbar: `All Sessions (Combined)` + individual session dropdown,
 *    `+ Add Session` (`AddSessionModal`), `Delete Session` (`DeleteSessionModal`),
 *    `+ Add Demo Response`, and `Upload CSV` (`replaceCsvData`).
 * 3. Step 3.2 Filter Preview: shows the active filter's response count and table
 *    before Step 3.3 adds the KPI strip and customizable Chart.js Bento grid.
 */

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  ChevronDown,
  CircleCheck,
  Database,
  Plus,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import { useLang } from '../context/LangContext.jsx';
import { useData } from '../context/DataContext.jsx';
import StatusSelect from '../components/StatusSelect.jsx';
import AddSessionModal from '../components/modals/AddSessionModal.jsx';
import DeleteSessionModal from '../components/modals/DeleteSessionModal.jsx';

// Sample pools used by `+ Add Demo Response` for realistic live chart/table testing
const DEMO_CAT1 = ['erasmus', 'local', 'both'];
const DEMO_CAT2 = ['social', 'language', 'culture', 'mix', 'support'];
const DEMO_COMFORT = ['high', 'high', 'medium', 'low'];
const DEMO_SCORES = [5, 5, 4, 4, 3];
const DEMO_OUTCOMES = ['yes', 'yes', 'yes', 'maybe', 'no'];
const DEMO_HIGHLIGHTS = [
  'Camaraderie',
  'Serendipity',
  'Belonging',
  'Warmth',
  'Discovery',
  'Harmony',
];
const DEMO_SUGGESTIONS = [
  'Great pacing — keep the icebreaker prompt cards on each table',
  'Share the meetup reminder earlier on the ESN WhatsApp group',
  'Add 15 extra minutes for open mingling at the end',
  'Loved the balance between Erasmus newcomers and local volunteers',
  'Include a quick group photo before wrapping up',
];

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

/**
 * Formats an ISO `YYYY-MM-DD` date range without timezone drift using UTC formatting.
 */
function formatDateRange(startDate, endDate, lang) {
  if (!startDate) {
    return '';
  }
  const locale = lang === 'tr' ? 'tr-TR' : 'en-US';
  const formatter = new Intl.DateTimeFormat(locale, {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const parseUtc = (iso) => {
    const [y, m, d] = iso.split('-').map(Number);
    if (!y || !m || !d) {
      return null;
    }
    return new Date(Date.UTC(y, m - 1, d));
  };

  const startObj = parseUtc(startDate);
  if (!startObj) {
    return startDate;
  }

  const endObj = endDate ? parseUtc(endDate) : null;
  if (!endObj || endDate === startDate) {
    return formatter.format(startObj);
  }

  const shortFormatter = new Intl.DateTimeFormat(locale, {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
  });

  if (startObj.getUTCFullYear() === endObj.getUTCFullYear()) {
    return `${shortFormatter.format(startObj)} – ${formatter.format(endObj)}`;
  }

  return `${formatter.format(startObj)} – ${formatter.format(endObj)}`;
}

export default function ProjectDashboard() {
  const { projectId } = useParams();
  const { lang, t } = useLang();
  const {
    projects,
    responsesByProject,
    isLoading,
    loadError,
    updateProjectStatus,
    addSession,
    deleteSession,
    addResponse,
    replaceCsvData,
  } = useData();

  // Active session filter (`"all"` or a specific `session.id`)
  const [selectedSessionId, setSelectedSessionId] = useState('all');

  // Modal & status feedback banner states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [toolbarNotice, setToolbarNotice] = useState(null);

  const sessionSelectId = useId();
  const tableCaptionId = useId();
  const fileInputRef = useRef(null);

  // Resolve active project metadata and its grouped CSV data bucket
  const activeProject = useMemo(
    () => projects.find((project) => project.id === projectId) ?? null,
    [projects, projectId]
  );

  const projectData = responsesByProject[projectId] ?? { sessions: [], responses: [] };
  const { sessions, responses } = projectData;
  const projectCopy = activeProject ? activeProject[lang] ?? activeProject.en : null;

  // Automatically fall back to `"all"` if the user switches projects and the previous session ID doesn't exist
  const effectiveSessionId = useMemo(() => {
    if (selectedSessionId === 'all') {
      return 'all';
    }
    return sessions.some((session) => session.id === selectedSessionId)
      ? selectedSessionId
      : 'all';
  }, [selectedSessionId, sessions]);

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === effectiveSessionId) ?? null,
    [sessions, effectiveSessionId]
  );

  // Filtered response list based on `effectiveSessionId`
  const filteredResponses = useMemo(() => {
    if (effectiveSessionId === 'all') {
      return responses;
    }
    return activeSession?.responses ?? [];
  }, [effectiveSessionId, responses, activeSession]);

  // Toolbar button disabled rules per Step 3.2 spec
  const canDeleteSession = effectiveSessionId !== 'all' && sessions.length > 1;
  const canAddDemoResponse = effectiveSessionId !== 'all' && Boolean(activeSession);

  // Keep browser tab title synchronized with the active project title and language
  useEffect(() => {
    const label = projectCopy?.title ?? projectId ?? '';
    document.title = t('dashboard.pageTitle', { id: label });
  }, [projectCopy, projectId, t]);

  // Add a new session and immediately select it in the toolbar dropdown
  const handleAddSession = useCallback(
    ({ title, startDate, endDate }) => {
      if (!activeProject) {
        return;
      }
      const newSessionId = addSession(activeProject.id, {
        title,
        startDate,
        endDate,
      });
      setSelectedSessionId(newSessionId);
      setToolbarNotice(null);
    },
    [activeProject, addSession]
  );

  // Delete the selected session and reset selection back to `"all"`
  const handleConfirmDeleteSession = useCallback(
    (sessionIdToDelete) => {
      if (!activeProject) {
        return;
      }
      deleteSession(activeProject.id, sessionIdToDelete);
      setSelectedSessionId('all');
      setToolbarNotice(null);
    },
    [activeProject, deleteSession]
  );

  // Inject a realistic randomized demo response into the currently selected session
  const handleAddDemoResponse = useCallback(() => {
    if (!activeProject || !activeSession) {
      return;
    }
    const demoRow = {
      id: `demo_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      projectId: activeProject.id,
      sessionId: activeSession.id,
      sessionTitle: activeSession.title,
      startDate: activeSession.startDate,
      endDate: activeSession.endDate,
      cat1: pickRandom(DEMO_CAT1),
      cat2: pickRandom(DEMO_CAT2),
      comfort: pickRandom(DEMO_COMFORT),
      score: pickRandom(DEMO_SCORES),
      outcome: pickRandom(DEMO_OUTCOMES),
      note1: pickRandom(DEMO_HIGHLIGHTS),
      note2: pickRandom(DEMO_SUGGESTIONS),
    };
    addResponse(activeProject.id, activeSession.id, demoRow);
    setToolbarNotice({
      type: 'success',
      text: t('dashboard.demoAdded', { session: activeSession.title }),
    });
  }, [activeProject, activeSession, addResponse, t]);

  // Parse a user-selected local `.csv` file and live-update `DataContext`
  const handleCsvUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    try {
      const csvText = await file.text();
      const parsed = replaceCsvData(csvText);
      setSelectedSessionId('all');
      setToolbarNotice({
        type: 'success',
        text: t('dashboard.csvUploaded', {
          count: parsed.rows.length,
          file: file.name,
        }),
      });
    } catch {
      setToolbarNotice({
        type: 'error',
        text: t('dashboard.csvUploadError'),
      });
    } finally {
      // Clear file input so uploading the same filename twice still fires `onChange`
      event.target.value = '';
    }
  };

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
      {/* Dashboard Header: Project title, subtitle, and synchronized StatusSelect */}
      <section className="dashboard-header hairline-bottom">
        <div className="dashboard-header-inner">
          <div className="dashboard-header-copy">
            <div className="dashboard-header-tags">
              <span className="mono-tag">{activeProject.code}</span>
              <span className="font-mono-label dashboard-kicker">
                {projectCopy.category}
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
        {/* Session Management Toolbar */}
        <section
          className="bento-card session-toolbar"
          aria-label={t('dashboard.toolbarLabel')}
        >
          {/* Left: Session dropdown (`All Sessions` + each session with dates & response count) */}
          <div className="session-select-group">
            <label htmlFor={sessionSelectId} className="visually-hidden">
              {t('dashboard.sessionSelectLabel')}
            </label>
            <div className="session-select-wrap">
              <select
                id={sessionSelectId}
                name="session-filter"
                className="session-select"
                value={effectiveSessionId}
                onChange={(event) => {
                  setSelectedSessionId(event.target.value);
                  setToolbarNotice(null);
                }}
              >
                <option value="all">
                  {t('dashboard.allSessions')} ({responses.length})
                </option>
                {sessions.map((session) => {
                  const dateLabel = formatDateRange(
                    session.startDate,
                    session.endDate,
                    lang
                  );
                  return (
                    <option key={session.id} value={session.id}>
                      {session.title}
                      {dateLabel ? ` · ${dateLabel}` : ''} ({session.responses.length})
                    </option>
                  );
                })}
              </select>
              <ChevronDown
                size={15}
                strokeWidth={1.5}
                aria-hidden="true"
                className="session-select-chevron"
              />
            </div>
          </div>

          {/* Right: Add Session, Delete Session, Add Demo Response, and Upload CSV actions */}
          <div className="session-toolbar-actions">
            <button
              type="button"
              className="btn primary"
              onClick={() => setIsAddModalOpen(true)}
            >
              <Plus size={15} strokeWidth={1.5} aria-hidden="true" />
              <span>{t('dashboard.addSession')}</span>
            </button>

            <button
              type="button"
              className="btn"
              disabled={!canDeleteSession}
              onClick={() => setIsDeleteModalOpen(true)}
            >
              <Trash2 size={15} strokeWidth={1.5} aria-hidden="true" />
              <span>{t('dashboard.deleteSession')}</span>
            </button>

            <button
              type="button"
              className="btn"
              disabled={!canAddDemoResponse}
              onClick={handleAddDemoResponse}
            >
              <Sparkles size={15} strokeWidth={1.5} aria-hidden="true" />
              <span>{t('dashboard.addDemoResponse')}</span>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="visually-hidden"
              onChange={handleCsvUpload}
            />
            <button
              type="button"
              className="btn ghost"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={15} strokeWidth={1.5} aria-hidden="true" />
              <span>{t('dashboard.uploadCsv')}</span>
            </button>
          </div>
        </section>

        {/* Loading, error, or live action confirmation banners */}
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

        {toolbarNotice && (
          <div
            className={`bento-card dashboard-banner ${toolbarNotice.type}`}
            role={toolbarNotice.type === 'error' ? 'alert' : 'status'}
          >
            {toolbarNotice.type === 'error' ? (
              <AlertCircle size={16} strokeWidth={1.5} aria-hidden="true" />
            ) : (
              <CircleCheck size={16} strokeWidth={1.5} aria-hidden="true" />
            )}
            <span>{toolbarNotice.text}</span>
          </div>
        )}

        {/* Step 3.2 Filtered Response Preview Card (replaced by KPI Strip + Charts in Step 3.3) */}
        <section className="bento-card dashboard-section">
          <header className="dashboard-section-header">
            <div className="filter-preview-heading">
              <span className="font-mono-label filter-preview-kicker">
                {t('dashboard.activeFilterLabel')}:{' '}
                {activeSession
                  ? `${activeSession.title} · ${formatDateRange(
                      activeSession.startDate,
                      activeSession.endDate,
                      lang
                    )}`
                  : t('dashboard.allSessions')}
              </span>
              <h2 className="font-editorial">{t('dashboard.latestRowsTitle')}</h2>
            </div>

            <span className="font-mono-label status-badge active tabular-nums">
              {t('dashboard.filteredResponses', { count: filteredResponses.length })}
            </span>
          </header>

          {filteredResponses.length === 0 ? (
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
                  {[...filteredResponses].reverse().map((row) => (
                    <tr key={row.id}>
                      <th scope="row">{row.sessionTitle}</th>
                      <td className="tabular-nums cell-mono">
                        {formatDateRange(row.startDate, row.endDate, lang)}
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

      {/* Step 3.2 Session Management Modals */}
      <AddSessionModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddSession}
      />

      <DeleteSessionModal
        isOpen={isDeleteModalOpen}
        session={activeSession}
        formattedDateRange={
          activeSession
            ? formatDateRange(activeSession.startDate, activeSession.endDate, lang)
            : ''
        }
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDeleteSession}
      />
    </main>
  );
}
