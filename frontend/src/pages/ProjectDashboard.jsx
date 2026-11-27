/**
 * ProjectDashboard.jsx — Project Analytics Workspace (`/project/:projectId`)
 * Connects `DataContext` to:
 * 1. Dashboard Header: project code, Newsreader title, Inter subtitle, and synchronized `StatusSelect`.
 * 2. Session Management Toolbar: session filter dropdown, `+ Add Session`, `Delete Session`,
 *    `+ Add Demo Response`, and `Upload CSV`.
 * 3. Summary KPI Strip (`SummaryStrip.jsx`): Total Responses, Positive Outcome Rate (%), Avg Score (/ 5).
 * 4. Customizable 12-Column Bento Graph Grid (`ChartGrid.jsx`) backed by Chart.js.
 */

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Papa from 'papaparse';
import {
  AlertCircle,
  ArrowLeft,
  BookmarkCheck,
  ChevronDown,
  CircleCheck,
  Database,
  Eye,
  LoaderCircle,
  Plus,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Upload,
  User,
  Users,
} from 'lucide-react';
import { useLang } from '../context/LangContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useData } from '../context/DataContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import {
  buildDefaultProjectKpis,
  getActiveColumns,
  normalizeRowToSchema,
  validateCSVHeadersAgainstSchema,
} from '../lib/csvSchema.js';
import StatusSelect from '../components/StatusSelect.jsx';
import SummaryStrip from '../components/SummaryStrip.jsx';
import ChartGrid from '../components/ChartGrid.jsx';
import FeedbackTable from '../components/FeedbackTable.jsx';
import PredictionSidebar from '../components/PredictionSidebar.jsx';
import AddSessionModal from '../components/modals/AddSessionModal.jsx';
import DeleteSessionModal from '../components/modals/DeleteSessionModal.jsx';
import DeleteProjectModal from '../components/modals/DeleteProjectModal.jsx';
import ProjectColumnsModal from '../components/modals/ProjectColumnsModal.jsx';

// Fallback sample pools used by `+ Add Demo Response` when a dynamic column has no prior values
const DEMO_CATEGORY_FALLBACK = ['Option A', 'Option B', 'Option C'];
const DEMO_NUMBERS = [3, 4, 4, 5, 5];
const DEMO_TEXT_SAMPLES = [
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
 * Generates a realistic schema-aligned `extra_data` object matching the active
 * project's `config.columns`, sampling existing category/numeric ranges when present.
 */
function buildDynamicDemoExtraData(columns = [], existingResponses = []) {
  const extraData = {};

  for (const col of getActiveColumns(columns)) {

    if (col.type === 'category') {
      const existingValues = Array.from(
        new Set(
          existingResponses
            .map((row) => String(row?.extra_data?.[col.key] ?? '').trim())
            .filter(Boolean)
        )
      );
      extraData[col.key] = pickRandom(
        existingValues.length > 0 ? existingValues : DEMO_CATEGORY_FALLBACK
      );
    } else if (col.type === 'number') {
      const existingNums = existingResponses
        .map((row) => Number(row?.extra_data?.[col.key]))
        .filter((val) => Number.isFinite(val));
      if (existingNums.length > 0) {
        extraData[col.key] = pickRandom(existingNums);
      } else {
        extraData[col.key] = pickRandom(DEMO_NUMBERS);
      }
    } else {
      extraData[col.key] = pickRandom(DEMO_TEXT_SAMPLES);
    }
  }

  return extraData;
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

export default function ProjectDashboard({
  isSidebarOpen = false,
  onCloseSidebar,
}) {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { lang, t } = useLang();
  const {
    profile,
    hasPermission,
    canViewInactiveProjects,
    canSetDefaultLayout,
    updateUserPreferences,
    loading: authLoading,
  } = useAuth();
  const { showToast } = useToast();

  // Granular per-capability permission gates
  const canManageProjects = hasPermission('manage_projects');
  const canManageSessions = hasPermission('manage_sessions');
  const canManageResponses = hasPermission('manage_responses');
  const canManageGraphs = hasPermission('manage_graphs');
  const canUsePredictor = hasPermission('use_predictor');
  const {
    projects,
    responsesByProject,
    graphsByProject,
    isLoading,
    loadError,
    updateProjectStatus,
    deleteProject,
    updateProjectColumns,
    addSession,
    deleteSession,
    bulkInsertResponses,
    saveProjectDefaultLayout,
  } = useData();

  // Active session filter (`"all"` or a specific `session.id`)
  const [selectedSessionId, setSelectedSessionId] = useState('all');

  // Modal & status feedback banner states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleteProjectModalOpen, setIsDeleteProjectModalOpen] = useState(false);
  const [isColumnsModalOpen, setIsColumnsModalOpen] = useState(false);
  const [toolbarNotice, setToolbarNotice] = useState(null);

  const sessionSelectId = useId();
  const fileInputRef = useRef(null);

  // Resolve active project metadata, CSV data bucket, and active Bento graph layout
  const activeProject = useMemo(
    () => projects.find((project) => project.id === projectId) ?? null,
    [projects, projectId]
  );

  const projectData = responsesByProject[projectId] ?? { sessions: [], responses: [] };
  const { sessions, responses } = projectData;
  const activeGraphs = useMemo(
    () => graphsByProject[projectId] ?? [],
    [graphsByProject, projectId]
  );
  const projectCopy = activeProject ? activeProject[lang] ?? activeProject.en : null;

  // Resolve shared team default KPIs & graphs from Supabase project data
  const teamDefaultKpis = useMemo(() => {
    const cols = activeProject?.config?.columns ?? [];
    if (Array.isArray(activeProject?.config?.defaultKpis)) {
      return activeProject.config.defaultKpis.slice(0, 3);
    }
    if (Array.isArray(activeProject?.config?.kpis)) {
      return activeProject.config.kpis.slice(0, 3);
    }
    return buildDefaultProjectKpis(cols, t('kpi.totalResponses'));
  }, [activeProject, t]);

  const teamDefaultGraphs = useMemo(() => {
    if (activeGraphs.length > 0) {
      return activeGraphs;
    }
    const savedBlueprints = activeProject?.config?.defaultGraphs;
    if (Array.isArray(savedBlueprints) && savedBlueprints.length > 0) {
      return savedBlueprints.map((bp, idx) => ({
        id: `default_bp_${idx}_${bp.metric_key || bp.metricKey || 'chart'}`,
        metricKey: bp.metric_key || bp.metricKey || '__session__',
        chartStyle: bp.chart_style || bp.chartStyle || 'bar',
        colSpan: Number(bp.col_span ?? bp.colSpan) || 6,
        customTitle: bp.custom_title ?? bp.customTitle ?? '',
        sortOrder: Number(bp.sort_order ?? idx) || idx,
        config: bp.config ?? null,
      }));
    }
    return [];
  }, [activeGraphs, activeProject]);

  // Check if the current user has a saved personal layout override for this project
  const personalLayout =
    profile?.preferences?.dashboardLayouts?.[projectId] ?? null;
  const hasCustomLayout = Boolean(personalLayout?.hasCustomLayout);

  const effectiveKpis = useMemo(() => {
    if (hasCustomLayout && Array.isArray(personalLayout?.kpis)) {
      return personalLayout.kpis.slice(0, 3);
    }
    return teamDefaultKpis;
  }, [hasCustomLayout, personalLayout, teamDefaultKpis]);

  const effectiveGraphs = useMemo(() => {
    if (hasCustomLayout && Array.isArray(personalLayout?.graphs)) {
      return personalLayout.graphs;
    }
    return teamDefaultGraphs;
  }, [hasCustomLayout, personalLayout, teamDefaultGraphs]);

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

  // Filtered response list and scoped sessions array driving KPIs and charts
  const filteredResponses = useMemo(() => {
    if (effectiveSessionId === 'all') {
      return responses;
    }
    return activeSession?.responses ?? [];
  }, [effectiveSessionId, responses, activeSession]);

  const scopedSessions = useMemo(
    () => (activeSession ? [activeSession] : sessions),
    [activeSession, sessions]
  );

  // Toolbar button disabled rules
  const canDeleteSession = effectiveSessionId !== 'all' && sessions.length > 1;
  const canAddDemoResponse = effectiveSessionId !== 'all' && Boolean(activeSession);

  // Keep browser tab title synchronized with the active project title and language
  useEffect(() => {
    const label = projectCopy?.title ?? projectId ?? '';
    document.title = t('dashboard.pageTitle', { id: label });
  }, [projectCopy, projectId, t]);

  // Add a new session in Supabase (and optionally import an attached validated CSV into it)
  const handleAddSession = useCallback(
    async ({ title, startDate, endDate, csvAttachment = null }) => {
      if (!activeProject) {
        return;
      }
      const newSessionId = await addSession(activeProject.id, {
        title,
        startDate,
        endDate,
      });
      if (!newSessionId) {
        return;
      }

      setSelectedSessionId(newSessionId);
      setToolbarNotice(null);

      if (csvAttachment && Array.isArray(csvAttachment.rows) && csvAttachment.rows.length > 0) {
        const projectColumns = activeProject.config?.columns ?? [];
        const mappedRows = csvAttachment.rows.map((row) =>
          normalizeRowToSchema(row, projectColumns)
        );
        const inserted = await bulkInsertResponses(
          activeProject.id,
          newSessionId,
          mappedRows
        );
        if (inserted && inserted.length > 0) {
          const extraCount = csvAttachment.extraColumns?.length ?? 0;
          showToast(
            extraCount > 0
              ? t('dashboard.csvImportedWithExtra', {
                  count: inserted.length,
                  extra: extraCount,
                })
              : t('dashboard.csvImportedSuccess', { count: inserted.length }),
            'success'
          );
        }
      }
    },
    [activeProject, addSession, bulkInsertResponses, showToast, t]
  );

  // Delete the selected session from Supabase and reset selection back to `"all"`
  const handleConfirmDeleteSession = useCallback(
    async (sessionIdToDelete) => {
      if (!activeProject) {
        return;
      }
      const deleted = await deleteSession(activeProject.id, sessionIdToDelete);
      if (deleted) {
        setSelectedSessionId('all');
        setToolbarNotice(null);
      }
    },
    [activeProject, deleteSession]
  );

  // Inject a realistic schema-aligned demo response via `bulkInsertResponses`
  const handleAddDemoResponse = useCallback(async () => {
    if (!activeProject || !activeSession) {
      return;
    }
    const projectColumns = activeProject.config?.columns ?? [];
    const demoExtraData = buildDynamicDemoExtraData(projectColumns, responses);
    const inserted = await bulkInsertResponses(activeProject.id, activeSession.id, [
      demoExtraData,
    ]);
    if (inserted && inserted.length > 0) {
      setToolbarNotice({
        type: 'success',
        text: t('dashboard.demoAdded', { session: activeSession.title }),
      });
    }
  }, [activeProject, activeSession, responses, bulkInsertResponses, t]);

  // Parse a `.csv` file with PapaParse, strictly validate headers against `config.columns`, and bulk-insert
  const handleCsvUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !activeProject) {
      return;
    }

    if (!activeSession) {
      showToast(t('dashboard.selectSessionForCsv'), 'info');
      return;
    }

    try {
      const csvText = await file.text();
      const parsed = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
      });
      const headers = (parsed.meta?.fields ?? [])
        .map((field) => String(field ?? '').trim())
        .filter(Boolean);
      const rows = Array.isArray(parsed.data) ? parsed.data : [];

      if (headers.length === 0 || rows.length === 0) {
        showToast(t('toast.csvEmpty'), 'error');
        return;
      }

      const projectColumns = activeProject.config?.columns ?? [];
      const { valid, missingColumns, extraColumns } =
        validateCSVHeadersAgainstSchema(headers, projectColumns);

      if (!valid) {
        showToast(
          t('dashboard.csvMissingColumns', {
            columns: missingColumns.join(', '),
          }),
          'error'
        );
        return;
      }

      const mappedRows = rows.map((row) =>
        normalizeRowToSchema(row, projectColumns)
      );
      const inserted = await bulkInsertResponses(
        activeProject.id,
        activeSession.id,
        mappedRows
      );

      if (inserted && inserted.length > 0) {
        showToast(
          extraColumns.length > 0
            ? t('dashboard.csvImportedWithExtra', {
                count: inserted.length,
                extra: extraColumns.length,
              })
            : t('dashboard.csvImportedSuccess', { count: inserted.length }),
          'success'
        );
      }
    } catch {
      showToast(t('dashboard.csvUploadError'), 'error');
    }
  };

  // Persist edited project column schema via `updateProjectColumns`
  const handleSaveProjectColumns = useCallback(
    async (nextColumns) => {
      if (!activeProject) {
        return false;
      }
      return updateProjectColumns(activeProject.id, nextColumns);
    },
    [activeProject, updateProjectColumns]
  );

  // Persist a personal layout override (`kpis` + `graphs`) into `profile.preferences.dashboardLayouts[projectId]`
  const persistPersonalLayout = useCallback(
    async (nextKpis, nextGraphs) => {
      if (!activeProject) {
        return false;
      }
      const existingLayouts =
        profile?.preferences?.dashboardLayouts &&
        typeof profile.preferences.dashboardLayouts === 'object'
          ? profile.preferences.dashboardLayouts
          : {};

      return updateUserPreferences({
        dashboardLayouts: {
          ...existingLayouts,
          [activeProject.id]: {
            hasCustomLayout: true,
            kpis: nextKpis,
            graphs: nextGraphs,
          },
        },
      });
    },
    [activeProject, profile, updateUserPreferences]
  );

  // Clear this project's personal override from `profile.preferences.dashboardLayouts`
  const clearPersonalLayoutOverride = useCallback(async () => {
    if (!activeProject) {
      return false;
    }
    const existingLayouts =
      profile?.preferences?.dashboardLayouts &&
      typeof profile.preferences.dashboardLayouts === 'object'
        ? profile.preferences.dashboardLayouts
        : {};
    const nextLayouts = { ...existingLayouts };
    delete nextLayouts[activeProject.id];

    return updateUserPreferences({
      dashboardLayouts: nextLayouts,
    });
  }, [activeProject, profile, updateUserPreferences]);

  // Save personal KPI box changes (only affects the current user)
  const handleSavePersonalKpis = useCallback(
    async (nextKpis) => persistPersonalLayout(nextKpis, effectiveGraphs),
    [persistPersonalLayout, effectiveGraphs]
  );

  // Permanently delete the active project and redirect back to the project directory
  const handleConfirmDeleteProject = useCallback(
    async (targetProjectId) => {
      const ok = await deleteProject(targetProjectId);
      if (ok) {
        setIsDeleteProjectModalOpen(false);
        navigate('/', { replace: true });
      }
      return ok;
    },
    [deleteProject, navigate]
  );

  // Personal Graph CRUD callbacks (stored in `profile.preferences.dashboardLayouts[projectId]`)
  const handleAddGraph = useCallback(
    async (graphConfig) => {
      const newGraph = {
        id: `personal_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
        metricKey:
          graphConfig.config?.xAxisKey || graphConfig.metricKey || '__session__',
        chartStyle: graphConfig.chartStyle || 'bar',
        colSpan: Number(graphConfig.colSpan) || 6,
        customTitle: graphConfig.customTitle?.trim() || '',
        sortOrder: effectiveGraphs.length,
        config: graphConfig.config ?? null,
      };
      const ok = await persistPersonalLayout(effectiveKpis, [
        ...effectiveGraphs,
        newGraph,
      ]);
      if (ok) {
        showToast(t('charts.graphAddedToast'), 'success');
      }
    },
    [effectiveKpis, effectiveGraphs, persistPersonalLayout, showToast, t]
  );

  const handleUpdateGraph = useCallback(
    async (graphId, updates) => {
      const nextGraphs = effectiveGraphs.map((graph) =>
        graph.id === graphId
          ? {
              ...graph,
              metricKey:
                updates.config?.xAxisKey ||
                updates.metricKey ||
                graph.metricKey,
              chartStyle: updates.chartStyle || graph.chartStyle,
              colSpan: Number(updates.colSpan) || graph.colSpan,
              customTitle: updates.customTitle?.trim() ?? '',
              config: updates.config ?? graph.config ?? null,
            }
          : graph
      );
      const ok = await persistPersonalLayout(effectiveKpis, nextGraphs);
      if (ok) {
        showToast(t('charts.graphUpdatedToast'), 'success');
      }
    },
    [effectiveKpis, effectiveGraphs, persistPersonalLayout, showToast, t]
  );

  const handleRemoveGraph = useCallback(
    async (graphId) => {
      const nextGraphs = effectiveGraphs.filter((graph) => graph.id !== graphId);
      await persistPersonalLayout(effectiveKpis, nextGraphs);
    },
    [effectiveKpis, effectiveGraphs, persistPersonalLayout]
  );

  // Reset the current user's personal layout override back to the shared team default
  const handleResetToDefaultLayout = useCallback(async () => {
    const ok = await clearPersonalLayoutOverride();
    if (ok) {
      showToast(t('dashboard.resetLayoutToast'), 'success');
    }
  }, [clearPersonalLayoutOverride, showToast, t]);

  // Leadership action (`owner`, `president`, `vice_president`): publish current view as team default
  const handleSetTeamDefaultLayout = useCallback(async () => {
    if (!activeProject || !canSetDefaultLayout) {
      return;
    }
    const ok = await saveProjectDefaultLayout(activeProject.id, {
      kpis: effectiveKpis,
      graphs: effectiveGraphs,
    });
    if (ok) {
      if (hasCustomLayout) {
        await clearPersonalLayoutOverride();
      }
      showToast(t('dashboard.setDefaultLayoutToast'), 'success');
    }
  }, [
    activeProject,
    canSetDefaultLayout,
    saveProjectDefaultLayout,
    effectiveKpis,
    effectiveGraphs,
    hasCustomLayout,
    clearPersonalLayoutOverride,
    showToast,
    t,
  ]);

  // Redirect non-leadership users cleanly to `/` if they open an inactive project URL directly
  const isRestrictedInactive =
    !authLoading &&
    Boolean(activeProject) &&
    activeProject.status !== 'active' &&
    !canViewInactiveProjects;

  useEffect(() => {
    if (!isRestrictedInactive) {
      return;
    }
    showToast(t('dashboard.inactiveProjectRedirect'), 'info');
    navigate('/', { replace: true });
  }, [isRestrictedInactive, navigate, showToast, t]);

  // Wait for Supabase initial fetch before deciding a project slug is unknown
  if (isLoading && !activeProject) {
    return (
      <main className="page-stage">
        <div className="bento-card auth-loading-card" role="status" aria-live="polite">
          <LoaderCircle
            size={20}
            strokeWidth={1.5}
            aria-hidden="true"
            className="auth-spinner"
          />
          <span className="font-mono-label">{t('dashboard.loadingData')}</span>
        </div>
      </main>
    );
  }

  // Suppress dashboard content while redirecting away from an inactive project
  if (isRestrictedInactive) {
    return null;
  }

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
                disabled={!canManageProjects}
                onChange={(nextStatus) => updateProjectStatus(activeProject.id, nextStatus)}
                onDelete={
                  canManageProjects
                    ? () => setIsDeleteProjectModalOpen(true)
                    : undefined
                }
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

          {canManageSessions ||
          canManageResponses ||
          canManageProjects ||
          canManageGraphs ||
          canSetDefaultLayout ||
          hasCustomLayout ? (
            <div className="session-toolbar-actions">
              <span
                className={`personal-view-pill font-mono-label ${
                  hasCustomLayout ? 'is-personal' : 'is-default'
                }`}
              >
                {hasCustomLayout ? (
                  <>
                    <User size={12} strokeWidth={1.5} aria-hidden="true" />
                    <span>{t('dashboard.personalViewBadge')}</span>
                  </>
                ) : (
                  <>
                    <Users size={12} strokeWidth={1.5} aria-hidden="true" />
                    <span>{t('dashboard.defaultViewBadge')}</span>
                  </>
                )}
              </span>

              {canManageSessions && (
                <>
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
                </>
              )}

              {canManageResponses && (
                <>
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
                    onClick={() => {
                      if (!activeSession) {
                        showToast(t('dashboard.selectSessionForCsv'), 'info');
                        return;
                      }
                      fileInputRef.current?.click();
                    }}
                  >
                    <Upload size={15} strokeWidth={1.5} aria-hidden="true" />
                    <span>{t('dashboard.uploadCsv')}</span>
                  </button>
                </>
              )}

              {canManageProjects && (
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => setIsColumnsModalOpen(true)}
                >
                  <SlidersHorizontal size={15} strokeWidth={1.5} aria-hidden="true" />
                  <span>{t('dashboard.columnsBtn')}</span>
                </button>
              )}

              {(hasCustomLayout || canManageGraphs) && (
                <button
                  type="button"
                  className="btn ghost"
                  disabled={!hasCustomLayout}
                  onClick={handleResetToDefaultLayout}
                >
                  <RotateCcw size={15} strokeWidth={1.5} aria-hidden="true" />
                  <span>{t('dashboard.resetToDefaultBtn')}</span>
                </button>
              )}

              {canSetDefaultLayout && (
                <button
                  type="button"
                  className="btn ghost toolbar-set-default-btn"
                  onClick={handleSetTeamDefaultLayout}
                >
                  <BookmarkCheck size={15} strokeWidth={1.5} aria-hidden="true" />
                  <span>{t('dashboard.setDefaultBtn')}</span>
                </button>
              )}
            </div>
          ) : (
            <span className="readonly-pill font-mono-label">
              <Eye size={13} strokeWidth={1.5} aria-hidden="true" />
              <span>{t('auth.readOnlyBadge')}</span>
            </span>
          )}
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

        {/* 3-Slot Customizable Summary KPI Strip (Personal Override or Team Default) */}
        <SummaryStrip
          project={activeProject}
          responses={filteredResponses}
          kpisOverride={effectiveKpis}
          canEdit={canManageGraphs}
          onSaveKpis={handleSavePersonalKpis}
        />

        {/* Customizable 12-column Dynamic Bento Chart.js Grid */}
        <ChartGrid
          graphs={effectiveGraphs}
          responses={filteredResponses}
          sessions={scopedSessions}
          columns={activeProject.config?.columns ?? []}
          isAdmin={canManageGraphs}
          onAddGraph={handleAddGraph}
          onUpdateGraph={handleUpdateGraph}
          onRemoveGraph={handleRemoveGraph}
        />

        {/* Dynamic Searchable Feedback Table */}
        <FeedbackTable
          project={activeProject}
          responses={filteredResponses}
          formatDateRange={formatDateRange}
        />
      </div>

      {/* Collapsible 60fps Organizer Prediction Sidebar (gated by `use_predictor`) */}
      {canUsePredictor && (
        <PredictionSidebar
          key={activeProject.id}
          isOpen={isSidebarOpen}
          onClose={onCloseSidebar}
          projectId={activeProject.id}
          projectTitle={projectCopy.title}
        />
      )}

      {/* Session Management Modals (gated by `manage_sessions`) */}
      {canManageSessions && (
        <>
          <AddSessionModal
            isOpen={isAddModalOpen}
            onClose={() => setIsAddModalOpen(false)}
            onAdd={handleAddSession}
            columns={activeProject.config?.columns ?? []}
            canAttachCsv={canManageResponses}
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
        </>
      )}

      {/* Post-Creation Column Schema Editor & Delete Project Modals (gated by `manage_projects`) */}
      {canManageProjects && (
        <>
          <ProjectColumnsModal
            key={isColumnsModalOpen ? `cols-open-${activeProject.id}` : 'cols-closed'}
            isOpen={isColumnsModalOpen}
            onClose={() => setIsColumnsModalOpen(false)}
            project={activeProject}
            graphs={activeGraphs}
            responses={responses}
            onSave={handleSaveProjectColumns}
          />

          <DeleteProjectModal
            key={
              isDeleteProjectModalOpen
                ? `del-proj-${activeProject.id}`
                : 'del-proj-closed'
            }
            isOpen={isDeleteProjectModalOpen}
            project={activeProject}
            sessionsCount={sessions.length}
            responsesCount={responses.length}
            onClose={() => setIsDeleteProjectModalOpen(false)}
            onConfirm={handleConfirmDeleteProject}
          />
        </>
      )}
    </main>
  );
}
