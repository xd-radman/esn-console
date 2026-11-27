/**
 * supabaseSeed.js — Idempotent Initial Supabase Database Seeder
 * When an authenticated Admin signs in and `public.projects` has 0 rows,
 * seeds the 4 initial ESN projects (`speaking-club`, `istanbul-cultural-trip`,
 * `buddy-system`, `welcome-week`), their `defaultGraphs` into `project_graphs`,
 * and the parsed `/dummy_data.csv` records into `sessions` and `responses`.
 * Uses an in-flight singleton promise so React StrictMode double-mounts never
 * trigger duplicate inserts.
 */

import { supabase } from './supabase.js';
import { INITIAL_PROJECTS } from './initialProjects.js';
import { loadDummyCsv } from './csvLoader.js';

// Shared in-flight guard preventing concurrent duplicate seed runs
let activeSeedPromise = null;

/**
 * Derives a compact `short_title` from a full session title (e.g., "Week 1").
 */
export function deriveShortTitle(title) {
  const clean = String(title ?? '').trim();
  if (!clean) {
    return 'Session';
  }
  const beforeDash = clean.split(/[—–-]/)[0]?.trim();
  const candidate = beforeDash && beforeDash.length >= 2 ? beforeDash : clean;
  return candidate.slice(0, 48);
}

/**
 * Internal seeding workflow executed once when `public.projects` is empty.
 */
async function runSeed() {
  if (!supabase) {
    return { seeded: false };
  }

  // Idempotency check: skip seeding if any project already exists in PostgreSQL
  const { count, error: countError } = await supabase
    .from('projects')
    .select('id', { count: 'exact', head: true });

  if (countError) {
    throw countError;
  }

  if ((count ?? 0) > 0) {
    return { seeded: false };
  }

  // 1. Insert the 4 initial ESN projects with localized metadata & defaultGraphs in `config`
  const projectPayloads = INITIAL_PROJECTS.map((project) => ({
    code: project.code,
    slug: project.id,
    status: project.status,
    icon_key: project.iconKey,
    config: {
      en: project.en,
      tr: project.tr,
      defaultGraphs: project.defaultGraphs,
    },
  }));

  const { data: insertedProjects, error: projectsError } = await supabase
    .from('projects')
    .insert(projectPayloads)
    .select('id, slug');

  if (projectsError) {
    throw projectsError;
  }

  const slugToUuid = new Map(
    (insertedProjects ?? []).map((row) => [row.slug, row.id])
  );

  // 2. Insert each project's default Bento graph tiles into `public.project_graphs`
  const graphPayloads = [];
  for (const project of INITIAL_PROJECTS) {
    const projectUuid = slugToUuid.get(project.id);
    if (!projectUuid) {
      continue;
    }
    (project.defaultGraphs ?? []).forEach((graph, index) => {
      graphPayloads.push({
        project_id: projectUuid,
        metric_key: graph.metricKey,
        chart_style: graph.chartStyle,
        col_span: Number(graph.colSpan) || 6,
        custom_title: graph.customTitle?.trim() || '',
        sort_order: index,
      });
    });
  }

  if (graphPayloads.length > 0) {
    const { error: graphsError } = await supabase
      .from('project_graphs')
      .insert(graphPayloads);
    if (graphsError) {
      throw graphsError;
    }
  }

  // 3. Parse bundled `/dummy_data.csv` and insert `sessions` + `responses`
  const { byProject } = await loadDummyCsv('/dummy_data.csv');

  for (const [projectSlug, bucket] of Object.entries(byProject)) {
    const projectUuid = slugToUuid.get(projectSlug);
    if (!projectUuid || bucket.sessions.length === 0) {
      continue;
    }

    const sessionPayloads = bucket.sessions.map((session) => ({
      project_id: projectUuid,
      title: session.title,
      short_title: deriveShortTitle(session.title),
      start_date: session.startDate || null,
      end_date: session.endDate || null,
    }));

    const { data: insertedSessions, error: sessionsError } = await supabase
      .from('sessions')
      .insert(sessionPayloads)
      .select('id');

    if (sessionsError) {
      throw sessionsError;
    }

    // Pair each CSV session ID with its newly created PostgreSQL UUID
    const csvSessionToUuid = new Map();
    bucket.sessions.forEach((session, idx) => {
      const inserted = insertedSessions?.[idx];
      if (inserted?.id) {
        csvSessionToUuid.set(session.id, inserted.id);
      }
    });

    const responsePayloads = bucket.responses
      .map((row) => {
        const sessionUuid = csvSessionToUuid.get(row.sessionId);
        if (!sessionUuid) {
          return null;
        }
        return {
          project_id: projectUuid,
          session_id: sessionUuid,
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

    if (responsePayloads.length > 0) {
      const { error: responsesError } = await supabase
        .from('responses')
        .insert(responsePayloads);
      if (responsesError) {
        throw responsesError;
      }
    }
  }

  return { seeded: true };
}

/**
 * Idempotently seeds initial projects, default graphs, sessions, and responses
 * when `public.projects` is empty. Safe to invoke multiple times.
 */
export function seedInitialDataIfEmpty() {
  if (!activeSeedPromise) {
    activeSeedPromise = runSeed().finally(() => {
      activeSeedPromise = null;
    });
  }
  return activeSeedPromise;
}
