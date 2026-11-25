/**
 * csvLoader.js — PapaParse CSV Ingestion & Normalization Helper
 * Fetches `/dummy_data.csv` on application boot and exposes `parseCsvText(text)`
 * so custom CSV uploads in Step 3.2 reuse the exact same normalization and
 * project/session grouping pipeline.
 */

import Papa from 'papaparse';

/**
 * Normalizes a single raw CSV record into the standardized ESN Console shape
 * mirroring the future Supabase `sessions` + `responses` tables.
 */
function normalizeRow(raw, index) {
  const projectId = String(raw.project_id ?? '').trim();
  const sessionId = String(raw.session_id ?? '').trim();

  if (!projectId || !sessionId) {
    return null;
  }

  const parsedScore = Number(raw.score);
  const score = Number.isFinite(parsedScore) ? parsedScore : null;

  return {
    id: `${projectId}_${sessionId}_${index + 1}`,
    projectId,
    sessionId,
    sessionTitle: String(raw.session_title ?? sessionId).trim(),
    startDate: String(raw.start_date ?? '').trim(),
    endDate: String(raw.end_date ?? '').trim(),
    cat1: String(raw.cat1 ?? '').trim().toLowerCase(),
    cat2: String(raw.cat2 ?? '').trim().toLowerCase(),
    comfort: String(raw.comfort ?? '').trim().toLowerCase(),
    score,
    outcome: String(raw.outcome ?? '').trim().toLowerCase(),
    note1: String(raw.note1 ?? '').trim(),
    note2: String(raw.note2 ?? '').trim(),
  };
}

/**
 * Groups normalized response rows by `projectId` and `sessionId`, producing:
 * `{ [projectId]: { sessions: [{ id, title, startDate, endDate, responses }], responses } }`.
 */
export function groupRowsByProject(rows) {
  const grouped = {};

  for (const row of rows) {
    if (!grouped[row.projectId]) {
      grouped[row.projectId] = {
        sessionMap: new Map(),
        responses: [],
      };
    }

    const bucket = grouped[row.projectId];
    bucket.responses.push(row);

    if (!bucket.sessionMap.has(row.sessionId)) {
      bucket.sessionMap.set(row.sessionId, {
        id: row.sessionId,
        title: row.sessionTitle,
        startDate: row.startDate,
        endDate: row.endDate,
        responses: [],
      });
    }

    bucket.sessionMap.get(row.sessionId).responses.push(row);
  }

  // Convert internal Maps to chronologically ordered session arrays
  const byProject = {};
  for (const [projectId, bucket] of Object.entries(grouped)) {
    const sessions = Array.from(bucket.sessionMap.values()).sort((a, b) =>
      a.startDate.localeCompare(b.startDate)
    );
    byProject[projectId] = {
      sessions,
      responses: bucket.responses,
    };
  }

  return byProject;
}

/**
 * Parses raw CSV text with PapaParse (`header`, `dynamicTyping`, `skipEmptyLines`)
 * and returns normalized rows plus the grouped `byProject` structure.
 */
export function parseCsvText(csvText) {
  const result = Papa.parse(csvText, {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
  });

  const rows = (result.data ?? [])
    .map((raw, index) => normalizeRow(raw, index))
    .filter(Boolean);

  return {
    rows,
    byProject: groupRowsByProject(rows),
    errors: result.errors ?? [],
  };
}

/**
 * Fetches and parses the bundled `/dummy_data.csv` dataset from `frontend/public/`.
 */
export async function loadDummyCsv(url = '/dummy_data.csv') {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url} (HTTP ${response.status})`);
  }
  const csvText = await response.text();
  return parseCsvText(csvText);
}
