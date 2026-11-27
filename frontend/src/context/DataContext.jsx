/**
 * DataContext.jsx — Supabase PostgreSQL Data, Bulk CSV Import & Graph Provider
 * Hydrates `projects`, `sessions`, `responses`, and `project_graphs` from
 * Supabase once authenticated (auto-seeding initial projects & dummy CSV data
 * when `public.projects` is empty and the signed-in user is an Admin).
 * Wires every project, session, response, CSV import, and Bento graph action
 * to real Supabase queries with optimistic/refreshed state updates and a
 * dismissible error toast state (`actionError`).
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { supabase } from '../lib/supabase.js';
import { INITIAL_PROJECTS } from '../lib/initialProjects.js';
import { parseCsvText } from '../lib/csvLoader.js';
import { deriveShortTitle, seedInitialDataIfEmpty } from '../lib/supabaseSeed.js';
import { useAuth } from './AuthContext.jsx';

const DataContext = createContext(null);

const EMPTY_PROJECT_DATA = { sessions: [], responses: [] };

const INITIAL_BY_SLUG = new Map(
  INITIAL_PROJECTS.map((project) => [project.id, project])
);

const FALLBACK_DEFAULT_GRAPHS = [
  { metricKey: 'score', chartStyle: 'bar', colSpan: 6, customTitle: '' },
  { metricKey: 'outcome', chartStyle: 'donut', colSpan: 6, customTitle: '' },
];

/**
 * Classifies a Supabase error so the UI can show a localized RLS permission
 * message or a general write failure message.
 */
function buildErrorDescriptor(error) {
  const code = error?.code ?? '';
  const message = error?.message ?? '';
  const isPermission =
    code === '42501' ||
    /row-level security|permission denied|not authorized/i.test(message);

  return {
    id: `err_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    kind: isPermission ? 'permission' : 'write',
    detail: message,
  };
}

/**
 * Normalizes a Supabase `public.projects` row into the UI project shape.
 * Uses `slug` as the URL-friendly `id` while preserving the PostgreSQL UUID in `dbId`.
 */
function mapProjectRow(row) {
  const slug = row.slug || row.id;
  const seedMatch = INITIAL_BY_SLUG.get(slug);
  const cfg = row.config ?? {};

  const enCopy = cfg.en ?? seedMatch?.en ?? {
    title: slug,
    subtitle: '',
    category: 'ESN Project',
  };
  const trCopy = cfg.tr ?? seedMatch?.tr ?? enCopy;
  const defaultGraphs =
    Array.isArray(cfg.defaultGraphs) && cfg.defaultGraphs.length > 0
      ? cfg.defaultGraphs
      : seedMatch?.defaultGraphs ?? FALLBACK_DEFAULT_GRAPHS;

  return {
    id: slug,
    dbId: row.id,
    slug,
    code: row.code || 'ESN-PR-01',
    status: row.status === 'inactive' ? 'inactive' : 'active',
    iconKey: row.icon_key || 'messages-square',
    en: enCopy,
    tr: trCopy,
    defaultGraphs,
  };
}

/**
 * Normalizes a Supabase `public.project_graphs` row into the Bento ChartTile shape.
 */
function mapGraphRow(row) {
  return {
    id: row.id,
    metricKey: row.metric_key,
    chartStyle: row.chart_style,
    colSpan: Number(row.col_span) || 6,
    customTitle: row.custom_title || '',
    sortOrder: Number(row.sort_order) || 0,
  };
}

/**
 * Normalizes a Supabase `public.responses` row and attaches session metadata.
 */
function mapResponseRow(row, projectSlug, sessionLookup) {
  const session = sessionLookup?.get(row.session_id);
  const numericScore = row.score === null || row.score === undefined ? null : Number(row.score);
  return {
    id: row.id,
    projectId: projectSlug,
    sessionId: row.session_id,
    sessionTitle: session?.title ?? '',
    startDate: session?.startDate ?? '',
    endDate: session?.endDate ?? '',
    cat1: row.cat1 || '',
    cat2: row.cat2 || '',
    comfort: row.comfort || '',
    score: Number.isFinite(numericScore) ? numericScore : null,
    outcome: row.outcome || '',
    note1: row.note1 || '',
    note2: row.note2 || '',
  };
}

/**
 * Fetches all 4 core tables from Supabase and shapes them into lookup maps
 * keyed by project slug (`id`) for `LandingPage`, `Header`, and `ProjectDashboard`.
 */
async function fetchAllWorkspaceTables() {
  const [projectsRes, sessionsRes, responsesRes, graphsRes] = await Promise.all([
    supabase.from('projects').select('*').order('created_at', { ascending: true }),
    supabase.from('sessions').select('*').order('start_date', { ascending: true }),
    supabase.from('responses').select('*').order('created_at', { ascending: true }),
    supabase.from('project_graphs').select('*').order('sort_order', { ascending: true }),
  ]);

  if (projectsRes.error) {
    throw projectsRes.error;
  }
  if (sessionsRes.error) {
    throw sessionsRes.error;
  }
  if (responsesRes.error) {
    throw responsesRes.error;
  }
  if (graphsRes.error) {
    throw graphsRes.error;
  }

  const mappedProjects = (projectsRes.data ?? []).map(mapProjectRow);
  const uuidToSlug = new Map(mappedProjects.map((project) => [project.dbId, project.id]));

  // Initialize empty buckets for every project so projects with 0 sessions still resolve cleanly
  const responsesByProject = {};
  const graphsByProject = {};
  const sessionLookupByProject = {};

  for (const project of mappedProjects) {
    responsesByProject[project.id] = { sessions: [], responses: [] };
    graphsByProject[project.id] = [];
    sessionLookupByProject[project.id] = new Map();
  }

  // Group sessions by project slug
  for (const row of sessionsRes.data ?? []) {
    const projectSlug = uuidToSlug.get(row.project_id);
    if (!projectSlug) {
      continue;
    }
    const mappedSession = {
      id: row.id,
      projectId: projectSlug,
      title: row.title,
      shortTitle: row.short_title || deriveShortTitle(row.title),
      startDate: row.start_date || '',
      endDate: row.end_date || '',
      responses: [],
    };
    responsesByProject[projectSlug].sessions.push(mappedSession);
    sessionLookupByProject[projectSlug].set(mappedSession.id, mappedSession);
  }

  // Attach responses to both project-level list and their parent session
  for (const row of responsesRes.data ?? []) {
    const projectSlug = uuidToSlug.get(row.project_id);
    if (!projectSlug) {
      continue;
    }
    const sessionMap = sessionLookupByProject[projectSlug];
    const mappedResponse = mapResponseRow(row, projectSlug, sessionMap);
    responsesByProject[projectSlug].responses.push(mappedResponse);
    const parentSession = sessionMap.get(mappedResponse.sessionId);
    if (parentSession) {
      parentSession.responses.push(mappedResponse);
    }
  }

  // Sort each project's sessions chronologically by startDate
  for (const bucket of Object.values(responsesByProject)) {
    bucket.sessions.sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''));
  }

  // Group Bento graph tiles by project slug
  for (const row of graphsRes.data ?? []) {
    const projectSlug = uuidToSlug.get(row.project_id);
    if (!projectSlug) {
      continue;
    }
    graphsByProject[projectSlug].push(mapGraphRow(row));
  }

  return {
    projects: mappedProjects,
    responsesByProject,
    graphsByProject,
  };
}

export function DataProvider({ children }) {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const userId = user?.id ?? null;

  // Core workspace collections backed by Supabase PostgreSQL, tagged by `userId`
  const [workspace, setWorkspace] = useState({
    userId: null,
    projects: [],
    responsesByProject: {},
    graphsByProject: {},
  });

  // Seeding, fetch error, and dismissible write-error toast states
  const [isSeeding, setIsSeeding] = useState(false);
  const [loadErrorState, setLoadErrorState] = useState({ userId: null, message: null });
  const [actionError, setActionError] = useState(null);

  const isCurrentWorkspace = Boolean(userId) && isAdmin && workspace.userId === userId;
  const baseProjects = useMemo(
    () => (isCurrentWorkspace ? workspace.projects : []),
    [isCurrentWorkspace, workspace.projects]
  );
  const responsesByProject = useMemo(
    () => (isCurrentWorkspace ? workspace.responsesByProject : {}),
    [isCurrentWorkspace, workspace.responsesByProject]
  );
  const graphsByProject = useMemo(
    () => (isCurrentWorkspace ? workspace.graphsByProject : {}),
    [isCurrentWorkspace, workspace.graphsByProject]
  );
  const loadError =
    userId && isAdmin && loadErrorState.userId === userId
      ? loadErrorState.message
      : null;
  const isLoading =
    !authLoading &&
    Boolean(userId) &&
    isAdmin &&
    Boolean(supabase) &&
    !isCurrentWorkspace &&
    !loadError;

  const setBaseProjects = useCallback((updater) => {
    setWorkspace((prev) => ({
      ...prev,
      projects: typeof updater === 'function' ? updater(prev.projects) : updater,
    }));
  }, []);

  const setResponsesByProject = useCallback((updater) => {
    setWorkspace((prev) => ({
      ...prev,
      responsesByProject:
        typeof updater === 'function' ? updater(prev.responsesByProject) : updater,
    }));
  }, []);

  const setGraphsByProject = useCallback((updater) => {
    setWorkspace((prev) => ({
      ...prev,
      graphsByProject:
        typeof updater === 'function' ? updater(prev.graphsByProject) : updater,
    }));
  }, []);

  const dismissActionError = useCallback(() => {
    setActionError(null);
  }, []);

  const reportWriteError = useCallback((error) => {
    console.warn('[ESN Console] Supabase write failed:', error);
    setActionError(buildErrorDescriptor(error));
  }, []);

  // Resolve a project object by either its URL slug (`id`) or PostgreSQL UUID (`dbId`)
  const resolveProject = useCallback(
    (projectKey) =>
      baseProjects.find(
        (project) => project.id === projectKey || project.dbId === projectKey
      ) ?? null,
    [baseProjects]
  );

  // Hydrate all tables from Supabase only for authenticated Admins (skip locked-out members)
  useEffect(() => {
    if (authLoading || !userId || !isAdmin || !supabase) {
      return undefined;
    }

    let isCancelled = false;

    async function loadWorkspace() {
      try {
        let snapshot = await fetchAllWorkspaceTables();

        // Idempotently seed initial projects, default graphs, and dummy CSV if Admin hits an empty DB
        if (snapshot.projects.length === 0 && isAdmin) {
          if (!isCancelled) {
            setIsSeeding(true);
          }
          const seedResult = await seedInitialDataIfEmpty();
          if (seedResult.seeded) {
            snapshot = await fetchAllWorkspaceTables();
          }
        }

        if (!isCancelled) {
          setLoadErrorState({ userId, message: null });
          setWorkspace({
            userId,
            projects: snapshot.projects,
            responsesByProject: snapshot.responsesByProject,
            graphsByProject: snapshot.graphsByProject,
          });
        }
      } catch (error) {
        if (!isCancelled) {
          console.warn('[ESN Console] Failed to load Supabase workspace:', error);
          setLoadErrorState({
            userId,
            message:
              error instanceof Error ? error.message : 'Failed to load workspace data',
          });
        }
      } finally {
        if (!isCancelled) {
          setIsSeeding(false);
        }
      }
    }

    loadWorkspace();

    return () => {
      isCancelled = true;
    };
  }, [authLoading, userId, isAdmin]);

  // Derive live `sessionsCount` and `responsesCount` for every project card
  const projects = useMemo(
    () =>
      baseProjects.map((project) => {
        const data = responsesByProject[project.id];
        return {
          ...project,
          sessionsCount: data ? data.sessions.length : 0,
          responsesCount: data ? data.responses.length : 0,
        };
      }),
    [baseProjects, responsesByProject]
  );

  // Create a new project in `public.projects` and persist its cloned `project_graphs`
  const addProject = useCallback(
    async (newProject) => {
      if (!supabase) {
        return null;
      }

      const defaultGraphs = structuredClone(
        newProject.defaultGraphs ?? FALLBACK_DEFAULT_GRAPHS
      );

      const { data: insertedProject, error: projectError } = await supabase
        .from('projects')
        .insert({
          code: newProject.code,
          slug: newProject.id,
          status: newProject.status || 'active',
          icon_key: newProject.iconKey || 'messages-square',
          config: {
            en: newProject.en,
            tr: newProject.tr,
            defaultGraphs,
          },
        })
        .select('*')
        .single();

      if (projectError) {
        reportWriteError(projectError);
        return null;
      }

      const mappedProject = mapProjectRow(insertedProject);

      // Insert cloned default graph tiles linked to the new project's UUID
      let insertedGraphs = [];
      if (defaultGraphs.length > 0) {
        const graphPayloads = defaultGraphs.map((graph, index) => ({
          project_id: mappedProject.dbId,
          metric_key: graph.metricKey,
          chart_style: graph.chartStyle,
          col_span: Number(graph.colSpan) || 6,
          custom_title: graph.customTitle?.trim() || '',
          sort_order: index,
        }));

        const { data: graphRows, error: graphError } = await supabase
          .from('project_graphs')
          .insert(graphPayloads)
          .select('*')
          .order('sort_order', { ascending: true });

        if (graphError) {
          reportWriteError(graphError);
        } else {
          insertedGraphs = (graphRows ?? []).map(mapGraphRow);
        }
      }

      setBaseProjects((prev) => [...prev, mappedProject]);
      setResponsesByProject((prev) => ({
        ...prev,
        [mappedProject.id]: { sessions: [], responses: [] },
      }));
      setGraphsByProject((prev) => ({
        ...prev,
        [mappedProject.id]: insertedGraphs,
      }));

      return mappedProject;
    },
    [reportWriteError, setBaseProjects, setResponsesByProject, setGraphsByProject]
  );

  // Optimistically toggle `'active' | 'inactive'` status and persist to `public.projects`
  const updateProjectStatus = useCallback(
    async (projectId, nextStatus) => {
      const target = resolveProject(projectId);
      if (!supabase || !target) {
        return false;
      }

      const previousStatus = target.status;
      setBaseProjects((prev) =>
        prev.map((project) =>
          project.id === target.id ? { ...project, status: nextStatus } : project
        )
      );

      const { error } = await supabase
        .from('projects')
        .update({ status: nextStatus })
        .eq('id', target.dbId);

      if (error) {
        // Roll back optimistic status change when RLS or network rejects the update
        setBaseProjects((prev) =>
          prev.map((project) =>
            project.id === target.id ? { ...project, status: previousStatus } : project
          )
        );
        reportWriteError(error);
        return false;
      }

      return true;
    },
    [resolveProject, reportWriteError, setBaseProjects]
  );

  // Insert a new session into `public.sessions` and return its generated UUID
  const addSession = useCallback(
    async (projectId, sessionData) => {
      const target = resolveProject(projectId);
      if (!supabase || !target) {
        return null;
      }

      const { data: inserted, error } = await supabase
        .from('sessions')
        .insert({
          project_id: target.dbId,
          title: sessionData.title,
          short_title: deriveShortTitle(sessionData.title),
          start_date: sessionData.startDate || null,
          end_date: sessionData.endDate || null,
        })
        .select('*')
        .single();

      if (error) {
        reportWriteError(error);
        return null;
      }

      const nextSession = {
        id: inserted.id,
        projectId: target.id,
        title: inserted.title,
        shortTitle: inserted.short_title || deriveShortTitle(inserted.title),
        startDate: inserted.start_date || '',
        endDate: inserted.end_date || '',
        responses: [],
      };

      setResponsesByProject((prev) => {
        const current = prev[target.id] ?? EMPTY_PROJECT_DATA;
        const nextSessions = [...current.sessions, nextSession].sort((a, b) =>
          (a.startDate || '').localeCompare(b.startDate || '')
        );
        return {
          ...prev,
          [target.id]: {
            ...current,
            sessions: nextSessions,
          },
        };
      });

      return nextSession.id;
    },
    [resolveProject, reportWriteError, setResponsesByProject]
  );

  // Delete a session from `public.sessions` (DB cascade removes linked responses)
  const deleteSession = useCallback(
    async (projectIdOrSessionId, maybeSessionId) => {
      if (!supabase) {
        return false;
      }

      const targetSessionId = maybeSessionId ?? projectIdOrSessionId;
      const explicitProject = maybeSessionId
        ? resolveProject(projectIdOrSessionId)
        : null;

      const { error } = await supabase
        .from('sessions')
        .delete()
        .eq('id', targetSessionId);

      if (error) {
        reportWriteError(error);
        return false;
      }

      setResponsesByProject((prev) => {
        const next = { ...prev };
        const keysToUpdate = explicitProject
          ? [explicitProject.id]
          : Object.keys(prev);

        for (const key of keysToUpdate) {
          const current = prev[key];
          if (!current) {
            continue;
          }
          if (current.sessions.some((session) => session.id === targetSessionId)) {
            next[key] = {
              sessions: current.sessions.filter(
                (session) => session.id !== targetSessionId
              ),
              responses: current.responses.filter(
                (row) => row.sessionId !== targetSessionId
              ),
            };
          }
        }
        return next;
      });

      return true;
    },
    [resolveProject, reportWriteError, setResponsesByProject]
  );

  // Insert a single response row into `public.responses` and append to local state
  const addResponse = useCallback(
    async (projectId, sessionId, responseData) => {
      const target = resolveProject(projectId);
      if (!supabase || !target) {
        return null;
      }

      const { data: inserted, error } = await supabase
        .from('responses')
        .insert({
          project_id: target.dbId,
          session_id: sessionId,
          cat1: responseData.cat1 || '',
          cat2: responseData.cat2 || '',
          comfort: responseData.comfort || '',
          score: responseData.score ?? null,
          outcome: responseData.outcome || '',
          note1: responseData.note1 || '',
          note2: responseData.note2 || '',
          extra_data: responseData.extraData ?? {},
        })
        .select('*')
        .single();

      if (error) {
        reportWriteError(error);
        return null;
      }

      setResponsesByProject((prev) => {
        const current = prev[target.id] ?? EMPTY_PROJECT_DATA;
        const sessionMap = new Map(
          current.sessions.map((session) => [session.id, session])
        );
        const mappedRow = mapResponseRow(inserted, target.id, sessionMap);

        const nextSessions = current.sessions.map((session) =>
          session.id === sessionId
            ? { ...session, responses: [...session.responses, mappedRow] }
            : session
        );

        return {
          ...prev,
          [target.id]: {
            sessions: nextSessions,
            responses: [...current.responses, mappedRow],
          },
        };
      });

      return inserted;
    },
    [resolveProject, reportWriteError, setResponsesByProject]
  );

  // Bulk-import a parsed CSV file into the active project's `sessions` & `responses`
  const importCsvToProject = useCallback(
    async (projectId, csvText) => {
      const target = resolveProject(projectId);
      if (!supabase || !target) {
        throw new Error('Project not found');
      }

      const parsed = parseCsvText(csvText);
      if (parsed.rows.length === 0) {
        return { importedCount: 0, newSessionsCount: 0 };
      }

      // Prefer rows tagged for this project slug; otherwise import all parsed rows into this project
      const matchingRows = parsed.rows.filter((row) => row.projectId === target.id);
      const rowsToImport = matchingRows.length > 0 ? matchingRows : parsed.rows;

      const existingSessions = responsesByProject[target.id]?.sessions ?? [];
      const existingByKey = new Map();
      for (const session of existingSessions) {
        const key = `${session.title.trim().toLowerCase()}|${session.startDate || ''}`;
        existingByKey.set(key, session);
      }

      // Deduplicate sessions required by the uploaded CSV
      const csvSessionMap = new Map();
      for (const row of rowsToImport) {
        if (!csvSessionMap.has(row.sessionId)) {
          csvSessionMap.set(row.sessionId, {
            csvId: row.sessionId,
            title: row.sessionTitle || row.sessionId,
            startDate: row.startDate || '',
            endDate: row.endDate || '',
          });
        }
      }

      const csvSessionToDbSession = new Map();
      const sessionsToInsert = [];

      for (const csvSession of csvSessionMap.values()) {
        const key = `${csvSession.title.trim().toLowerCase()}|${csvSession.startDate || ''}`;
        const existing = existingByKey.get(key);
        if (existing) {
          csvSessionToDbSession.set(csvSession.csvId, existing);
        } else {
          sessionsToInsert.push(csvSession);
        }
      }

      // Create any missing sessions in `public.sessions`
      const newlyCreatedSessions = [];
      if (sessionsToInsert.length > 0) {
        const sessionPayloads = sessionsToInsert.map((session) => ({
          project_id: target.dbId,
          title: session.title,
          short_title: deriveShortTitle(session.title),
          start_date: session.startDate || null,
          end_date: session.endDate || null,
        }));

        const { data: insertedSessions, error: sessionsError } = await supabase
          .from('sessions')
          .insert(sessionPayloads)
          .select('*');

        if (sessionsError) {
          reportWriteError(sessionsError);
          throw sessionsError;
        }

        sessionsToInsert.forEach((csvSession, idx) => {
          const inserted = insertedSessions?.[idx];
          if (!inserted) {
            return;
          }
          const mappedSession = {
            id: inserted.id,
            projectId: target.id,
            title: inserted.title,
            shortTitle: inserted.short_title || deriveShortTitle(inserted.title),
            startDate: inserted.start_date || '',
            endDate: inserted.end_date || '',
            responses: [],
          };
          newlyCreatedSessions.push(mappedSession);
          csvSessionToDbSession.set(csvSession.csvId, mappedSession);
        });
      }

      // Bulk-insert all response rows into `public.responses`
      const responsePayloads = rowsToImport
        .map((row) => {
          const dbSession = csvSessionToDbSession.get(row.sessionId);
          if (!dbSession) {
            return null;
          }
          return {
            project_id: target.dbId,
            session_id: dbSession.id,
            cat1: row.cat1 || '',
            cat2: row.cat2 || '',
            comfort: row.comfort || '',
            score: row.score ?? null,
            outcome: row.outcome || '',
            note1: row.note1 || '',
            note2: row.note2 || '',
            extra_data: {},
          };
        })
        .filter(Boolean);

      const { data: insertedResponses, error: responsesError } = await supabase
        .from('responses')
        .insert(responsePayloads)
        .select('*');

      if (responsesError) {
        reportWriteError(responsesError);
        throw responsesError;
      }

      // Merge newly created sessions and responses into live DataContext state
      setResponsesByProject((prev) => {
        const current = prev[target.id] ?? EMPTY_PROJECT_DATA;
        const mergedSessions = [
          ...current.sessions.map((session) => ({
            ...session,
            responses: [...session.responses],
          })),
          ...newlyCreatedSessions.map((session) => ({
            ...session,
            responses: [],
          })),
        ];

        const sessionMap = new Map(
          mergedSessions.map((session) => [session.id, session])
        );

        const mappedNewResponses = (insertedResponses ?? []).map((row) =>
          mapResponseRow(row, target.id, sessionMap)
        );

        for (const mappedRow of mappedNewResponses) {
          const parent = sessionMap.get(mappedRow.sessionId);
          if (parent) {
            parent.responses.push(mappedRow);
          }
        }

        mergedSessions.sort((a, b) =>
          (a.startDate || '').localeCompare(b.startDate || '')
        );

        return {
          ...prev,
          [target.id]: {
            sessions: mergedSessions,
            responses: [...current.responses, ...mappedNewResponses],
          },
        };
      });

      return {
        importedCount: insertedResponses?.length ?? 0,
        newSessionsCount: newlyCreatedSessions.length,
      };
    },
    [resolveProject, responsesByProject, reportWriteError, setResponsesByProject]
  );

  // Append a custom Bento graph tile to `public.project_graphs`
  const addGraph = useCallback(
    async (projectId, graphConfig) => {
      const target = resolveProject(projectId);
      if (!supabase || !target) {
        return null;
      }

      const currentGraphs = graphsByProject[target.id] ?? [];
      const nextSortOrder =
        currentGraphs.length > 0
          ? Math.max(...currentGraphs.map((item) => item.sortOrder ?? 0)) + 1
          : 0;

      const { data: inserted, error } = await supabase
        .from('project_graphs')
        .insert({
          project_id: target.dbId,
          metric_key: graphConfig.metricKey,
          chart_style: graphConfig.chartStyle,
          col_span: Number(graphConfig.colSpan) || 6,
          custom_title: graphConfig.customTitle?.trim() || '',
          sort_order: nextSortOrder,
        })
        .select('*')
        .single();

      if (error) {
        reportWriteError(error);
        return null;
      }

      const mappedGraph = mapGraphRow(inserted);
      setGraphsByProject((prev) => ({
        ...prev,
        [target.id]: [...(prev[target.id] ?? []), mappedGraph],
      }));

      return mappedGraph;
    },
    [resolveProject, graphsByProject, reportWriteError, setGraphsByProject]
  );

  // Remove a single Bento graph tile from `public.project_graphs`
  const removeGraph = useCallback(
    async (projectIdOrGraphId, maybeGraphId) => {
      if (!supabase) {
        return false;
      }

      const targetGraphId = maybeGraphId ?? projectIdOrGraphId;
      const explicitProject = maybeGraphId
        ? resolveProject(projectIdOrGraphId)
        : null;

      const { error } = await supabase
        .from('project_graphs')
        .delete()
        .eq('id', targetGraphId);

      if (error) {
        reportWriteError(error);
        return false;
      }

      setGraphsByProject((prev) => {
        const next = { ...prev };
        const keysToUpdate = explicitProject
          ? [explicitProject.id]
          : Object.keys(prev);

        for (const key of keysToUpdate) {
          const list = prev[key] ?? [];
          if (list.some((graph) => graph.id === targetGraphId)) {
            next[key] = list.filter((graph) => graph.id !== targetGraphId);
          }
        }
        return next;
      });

      return true;
    },
    [resolveProject, reportWriteError, setGraphsByProject]
  );

  // Delete all `project_graphs` rows for a project and re-insert its `defaultGraphs`
  const resetGraphs = useCallback(
    async (projectId) => {
      const target = resolveProject(projectId);
      if (!supabase || !target) {
        return false;
      }

      const { error: deleteError } = await supabase
        .from('project_graphs')
        .delete()
        .eq('project_id', target.dbId);

      if (deleteError) {
        reportWriteError(deleteError);
        return false;
      }

      const defaults = target.defaultGraphs ?? FALLBACK_DEFAULT_GRAPHS;
      if (defaults.length === 0) {
        setGraphsByProject((prev) => ({ ...prev, [target.id]: [] }));
        return true;
      }

      const graphPayloads = defaults.map((graph, index) => ({
        project_id: target.dbId,
        metric_key: graph.metricKey,
        chart_style: graph.chartStyle,
        col_span: Number(graph.colSpan) || 6,
        custom_title: graph.customTitle?.trim() || '',
        sort_order: index,
      }));

      const { data: insertedRows, error: insertError } = await supabase
        .from('project_graphs')
        .insert(graphPayloads)
        .select('*')
        .order('sort_order', { ascending: true });

      if (insertError) {
        reportWriteError(insertError);
        return false;
      }

      setGraphsByProject((prev) => ({
        ...prev,
        [target.id]: (insertedRows ?? []).map(mapGraphRow),
      }));

      return true;
    },
    [resolveProject, reportWriteError, setGraphsByProject]
  );

  const value = useMemo(
    () => ({
      projects,
      responsesByProject,
      graphsByProject,
      isLoading,
      isSeeding,
      loadError,
      actionError,
      dismissActionError,
      addProject,
      updateProjectStatus,
      addSession,
      deleteSession,
      addResponse,
      importCsvToProject,
      addGraph,
      removeGraph,
      resetGraphs,
    }),
    [
      projects,
      responsesByProject,
      graphsByProject,
      isLoading,
      isSeeding,
      loadError,
      actionError,
      dismissActionError,
      addProject,
      updateProjectStatus,
      addSession,
      deleteSession,
      addResponse,
      importCsvToProject,
      addGraph,
      removeGraph,
      resetGraphs,
    ]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

/**
 * Custom hook returning Supabase-backed workspace state, loading/error states,
 * and CRUD / bulk CSV import actions.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) {
    throw new Error('useData must be used within a DataProvider');
  }
  return ctx;
}
