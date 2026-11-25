/**
 * DataContext.jsx — Shared Application Data & CSV State Provider
 * Centralizes `projects`, `responsesByProject`, and CSV loading state so
 * `LandingPage`, `Header` (Project Switcher), and `ProjectDashboard` stay
 * 100% synchronized. Automatically derives `sessionsCount` and `responsesCount`
 * on each project card from the active parsed dataset.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { INITIAL_PROJECTS } from '../lib/initialProjects.js';
import { loadDummyCsv, parseCsvText } from '../lib/csvLoader.js';

const DataContext = createContext(null);

const EMPTY_PROJECT_DATA = { sessions: [], responses: [] };

/**
 * Wraps the app with synchronized project metadata, parsed CSV sessions/responses,
 * and CRUD helpers that mirror the future Phase 4 Supabase operations.
 */
export function DataProvider({ children }) {
  // Base project definitions (status, localized copy, icon, default graph config)
  const [baseProjects, setBaseProjects] = useState(INITIAL_PROJECTS);

  // Parsed sessions & responses keyed by `project.id`
  const [responsesByProject, setResponsesByProject] = useState({});

  // Bootstrapping flags for initial `/dummy_data.csv` fetch
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // Load `/dummy_data.csv` once on mount with cancellation guard
  useEffect(() => {
    let isCancelled = false;

    async function bootstrapCsv() {
      try {
        setIsLoading(true);
        setLoadError(null);
        const { byProject } = await loadDummyCsv('/dummy_data.csv');
        if (!isCancelled) {
          setResponsesByProject(byProject);
        }
      } catch (error) {
        if (!isCancelled) {
          setLoadError(error instanceof Error ? error.message : 'Failed to load CSV data');
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    bootstrapCsv();

    return () => {
      isCancelled = true;
    };
  }, []);

  // Derive live `sessionsCount` and `responsesCount` for every project from `responsesByProject`
  const projects = useMemo(
    () =>
      baseProjects.map((project) => {
        const data = responsesByProject[project.id];
        if (!data) {
          return {
            ...project,
            sessionsCount: 0,
            responsesCount: 0,
          };
        }
        return {
          ...project,
          sessionsCount: data.sessions.length,
          responsesCount: data.responses.length,
        };
      }),
    [baseProjects, responsesByProject]
  );

  // Append a newly created (or deep-cloned) project and ensure it has a data bucket
  const addProject = useCallback((newProject) => {
    setBaseProjects((prev) => [...prev, newProject]);
    setResponsesByProject((prev) => {
      if (prev[newProject.id]) {
        return prev;
      }
      return {
        ...prev,
        [newProject.id]: { sessions: [], responses: [] },
      };
    });
  }, []);

  // Synchronize `'active' | 'inactive'` status across LandingPage and ProjectDashboard
  const updateProjectStatus = useCallback((projectId, nextStatus) => {
    setBaseProjects((prev) =>
      prev.map((project) =>
        project.id === projectId ? { ...project, status: nextStatus } : project
      )
    );
  }, []);

  // Add a new session (`{ id?, title, startDate, endDate }`) and return its unique ID
  const addSession = useCallback((projectId, session) => {
    const sessionId =
      session.id ||
      `sess_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

    setResponsesByProject((prev) => {
      const current = prev[projectId] ?? EMPTY_PROJECT_DATA;
      const nextSession = {
        id: sessionId,
        title: session.title,
        startDate: session.startDate,
        endDate: session.endDate,
        responses: [],
      };
      const nextSessions = [...current.sessions, nextSession].sort((a, b) =>
        a.startDate.localeCompare(b.startDate)
      );
      return {
        ...prev,
        [projectId]: {
          ...current,
          sessions: nextSessions,
        },
      };
    });

    return sessionId;
  }, []);

  // Delete a session and cascade-remove its associated response rows
  const deleteSession = useCallback((projectId, sessionId) => {
    setResponsesByProject((prev) => {
      const current = prev[projectId];
      if (!current) {
        return prev;
      }
      return {
        ...prev,
        [projectId]: {
          sessions: current.sessions.filter((session) => session.id !== sessionId),
          responses: current.responses.filter((row) => row.sessionId !== sessionId),
        },
      };
    });
  }, []);

  // Append a single response row to both the target session and the project totals
  const addResponse = useCallback((projectId, sessionId, responseRow) => {
    setResponsesByProject((prev) => {
      const current = prev[projectId] ?? EMPTY_PROJECT_DATA;
      const nextSessions = current.sessions.map((session) =>
        session.id === sessionId
          ? { ...session, responses: [...session.responses, responseRow] }
          : session
      );
      return {
        ...prev,
        [projectId]: {
          sessions: nextSessions,
          responses: [...current.responses, responseRow],
        },
      };
    });
  }, []);

  // Replace the in-memory dataset with a freshly uploaded custom CSV string
  const replaceCsvData = useCallback((csvText) => {
    const parsed = parseCsvText(csvText);
    setResponsesByProject(parsed.byProject);
    setLoadError(null);
    return parsed;
  }, []);

  const value = useMemo(
    () => ({
      projects,
      responsesByProject,
      isLoading,
      loadError,
      addProject,
      updateProjectStatus,
      addSession,
      deleteSession,
      addResponse,
      replaceCsvData,
    }),
    [
      projects,
      responsesByProject,
      isLoading,
      loadError,
      addProject,
      updateProjectStatus,
      addSession,
      deleteSession,
      addResponse,
      replaceCsvData,
    ]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

/**
 * Custom hook returning shared project/CSV state and CRUD actions.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) {
    throw new Error('useData must be used within a DataProvider');
  }
  return ctx;
}
