/**
 * csvSchema.js — Per-Project Dynamic CSV Schema Inference, Validation & Normalization
 * Pure, framework-agnostic helpers powering Phase 5.5's flexible per-project
 * `projects.config.columns` blueprint and `responses.extra_data` JSONB storage.
 * Supports four column types: `category`, `number`, `text`, and `ignore`.
 */

// Turkish diacritic map applied before ASCII key slugification
const TR_CHAR_MAP = {
  ç: 'c',
  Ç: 'c',
  ğ: 'g',
  Ğ: 'g',
  ı: 'i',
  İ: 'i',
  ö: 'o',
  Ö: 'o',
  ş: 's',
  Ş: 's',
  ü: 'u',
  Ü: 'u',
};

// Metadata header keywords automatically flagged as `type: 'ignore'`
const IGNORED_HEADER_PATTERNS = [
  /^timestamp$/i,
  /^zaman\s*damgas[ıi]$/i,
  /^e-?mail(\s+address)?$/i,
  /^e-?posta(\s+adresi)?$/i,
  /^submitted\s*at$/i,
  /^submission\s*(id|time|date)$/i,
  /^response\s*id$/i,
  /^respondent\s*id$/i,
  /^created\s*at$/i,
  /^updated\s*at$/i,
];

/**
 * Checks whether a raw cell value is empty (`null`, `undefined`, or blank whitespace).
 */
function isEmptyCell(value) {
  return value === null || value === undefined || String(value).trim() === '';
}

/**
 * Checks whether a non-empty raw cell value parses cleanly as a finite number.
 */
function isNumericCell(value) {
  if (typeof value === 'number') {
    return Number.isFinite(value);
  }
  const trimmed = String(value).trim();
  if (!trimmed) {
    return false;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed);
}

/**
 * Normalizes a header label for case-insensitive trimmed comparison.
 */
function normalizeHeaderName(label) {
  return String(label ?? '').trim().toLowerCase();
}

/**
 * Returns `true` when a CSV column header represents obvious form metadata
 * (e.g., Timestamp, Email, Submitted At) that should default to `ignore`.
 */
function isIgnoredMetadataHeader(header) {
  const clean = String(header ?? '').trim();
  if (!clean) {
    return true;
  }
  return IGNORED_HEADER_PATTERNS.some((pattern) => pattern.test(clean));
}

/**
 * Converts a raw column header into a safe, lowercase snake_case key and
 * appends `_2`, `_3`, etc. if a collision exists in `existingKeys`.
 */
export function slugifyColumnKey(label, existingKeys = []) {
  const base = String(label ?? '')
    .replace(/[çÇğĞıİöÖşŞüÜ]/g, (ch) => TR_CHAR_MAP[ch] ?? ch)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  const cleanBase = base || 'column';
  const taken =
    existingKeys instanceof Set ? existingKeys : new Set(existingKeys ?? []);

  if (!taken.has(cleanBase)) {
    return cleanBase;
  }

  let suffix = 2;
  while (taken.has(`${cleanBase}_${suffix}`)) {
    suffix += 1;
  }
  return `${cleanBase}_${suffix}`;
}

/**
 * Inspects CSV headers and up to 20 sample rows to infer an ordered array of
 * `{ key, label, type }` column definitions (`ignore`, `number`, `category`, `text`).
 */
export function inferColumnsFromCSV(headers = [], sampleRows = []) {
  const rowsToInspect = Array.isArray(sampleRows) ? sampleRows.slice(0, 20) : [];
  const usedKeys = new Set();

  return (headers ?? [])
    .map((rawHeader) => String(rawHeader ?? '').trim())
    .filter(Boolean)
    .map((label) => {
      const key = slugifyColumnKey(label, usedKeys);
      usedKeys.add(key);

      // 1. Flag obvious metadata headers as `ignore`
      if (isIgnoredMetadataHeader(label)) {
        return { key, label, type: 'ignore' };
      }

      // Collect non-empty sample values for this column
      const nonEmptyValues = [];
      for (const row of rowsToInspect) {
        if (!row || typeof row !== 'object') {
          continue;
        }
        const value = row[label];
        if (!isEmptyCell(value)) {
          nonEmptyValues.push(value);
        }
      }

      if (nonEmptyValues.length === 0) {
        return { key, label, type: 'text' };
      }

      // 2. Numeric heuristic: >80% of non-empty values parse as finite numbers
      const numericCount = nonEmptyValues.filter(isNumericCell).length;
      if (numericCount / nonEmptyValues.length > 0.8) {
        return { key, label, type: 'number' };
      }

      // 3. Category heuristic: short labels with low cardinality or repeating discrete values
      const stringValues = nonEmptyValues.map((val) => String(val).trim());
      const uniqueValues = new Set(stringValues.map((val) => val.toLowerCase()));
      const avgLength =
        stringValues.reduce((sum, val) => sum + val.length, 0) /
        stringValues.length;

      const isShortAndLowCardinality = uniqueValues.size < 12 && avgLength < 35;
      const isShortAndRepeating =
        avgLength < 35 &&
        stringValues.length >= 2 &&
        uniqueValues.size <= Math.ceil(stringValues.length * 0.75);

      if (isShortAndLowCardinality || isShortAndRepeating) {
        return { key, label, type: 'category' };
      }

      // 4. Default to open-ended `text`
      return { key, label, type: 'text' };
    });
}

/**
 * Returns only project-wide active columns (`type !== 'ignore'` and `enabled !== false`).
 * Central gate used across CSV validation, row normalization, KPIs, charts, and the data table.
 */
export function getActiveColumns(columns = []) {
  return (columns ?? []).filter(
    (col) => col && col.key && col.type !== 'ignore' && col.enabled !== false
  );
}

/**
 * Validates uploaded CSV headers against a project's saved `config.columns`.
 * Checks that every active (non-`ignore`, enabled) column's `label` exists in `csvHeaders`
 * using case-insensitive trimmed matching, and reports missing & extra headers.
 */
export function validateCSVHeadersAgainstSchema(csvHeaders = [], projectColumns = []) {
  const normalizedCsvSet = new Set(
    (csvHeaders ?? []).map(normalizeHeaderName).filter(Boolean)
  );
  const allSchemaLabels = new Set(
    (projectColumns ?? []).map((col) => normalizeHeaderName(col.label)).filter(Boolean)
  );

  const missingColumns = [];
  for (const col of getActiveColumns(projectColumns)) {
    const normalizedLabel = normalizeHeaderName(col.label);
    if (normalizedLabel && !normalizedCsvSet.has(normalizedLabel)) {
      missingColumns.push(col.label);
    }
  }

  const extraColumns = [];
  for (const rawHeader of csvHeaders ?? []) {
    const trimmed = String(rawHeader ?? '').trim();
    const normalized = normalizeHeaderName(trimmed);
    if (normalized && !allSchemaLabels.has(normalized)) {
      extraColumns.push(trimmed);
    }
  }

  return {
    valid: missingColumns.length === 0,
    missingColumns,
    extraColumns,
  };
}

/**
 * Maps a raw PapaParse row into a clean `extra_data` JSONB object keyed by
 * each active (non-`ignore`) column's `key`, casting `number` fields with
 * `Number(...)` (or `null` when empty/invalid) and trimming string fields.
 */
export function normalizeRowToSchema(rawRow, projectColumns = []) {
  const source = rawRow && typeof rawRow === 'object' ? rawRow : {};

  // Build a case-insensitive trimmed lookup of raw CSV row keys -> values
  const normalizedRowLookup = new Map();
  for (const [rawKey, rawVal] of Object.entries(source)) {
    const normKey = normalizeHeaderName(rawKey);
    if (normKey && !normalizedRowLookup.has(normKey)) {
      normalizedRowLookup.set(normKey, rawVal);
    }
  }

  const extraData = {};

  for (const col of getActiveColumns(projectColumns)) {
    const labelMatch = normalizedRowLookup.get(normalizeHeaderName(col.label));
    const rawValue =
      labelMatch !== undefined
        ? labelMatch
        : normalizedRowLookup.get(normalizeHeaderName(col.key));

    if (col.type === 'number') {
      if (isEmptyCell(rawValue)) {
        extraData[col.key] = null;
      } else {
        const numeric = Number(String(rawValue).trim());
        extraData[col.key] = Number.isFinite(numeric) ? numeric : null;
      }
    } else {
      extraData[col.key] = isEmptyCell(rawValue) ? '' : String(rawValue).trim();
    }
  }

  return extraData;
}

/**
 * Formats a computed KPI numeric value cleanly (integers without decimals,
 * fractional values rounded to 1–2 decimal places without trailing zeros).
 */
function formatKpiNumber(num) {
  if (!Number.isFinite(num)) {
    return '—';
  }
  if (Number.isInteger(num)) {
    return String(num);
  }
  return Number(num.toFixed(2)).toString();
}

/**
 * Generates up to 3 sensible default KPI configs when a project does not yet
 * have a saved `config.kpis` array.
 */
export function buildDefaultProjectKpis(columns = [], defaultTotalLabel = 'Total Responses') {
  const activeCols = getActiveColumns(columns);
  const firstNumber = activeCols.find((col) => col.type === 'number');
  const firstCategory = activeCols.find((col) => col.type === 'category');

  const defaults = [
    {
      id: 'default_total',
      title: defaultTotalLabel,
      icon: 'users',
      columnKey: '__all__',
      operation: 'total_count',
      targetValue: '',
    },
  ];

  if (firstNumber) {
    defaults.push({
      id: `default_num_${firstNumber.key}`,
      title: firstNumber.label,
      icon: 'hash',
      columnKey: firstNumber.key,
      operation: 'avg',
      targetValue: '',
    });
  }

  if (firstCategory) {
    defaults.push({
      id: `default_cat_${firstCategory.key}`,
      title: firstCategory.label,
      icon: 'tag',
      columnKey: firstCategory.key,
      operation: 'top_value',
      targetValue: '',
    });
  }

  return defaults.slice(0, 3);
}

/**
 * Pure KPI computation engine supporting `total_count`, `non_empty_count`,
 * numeric statistics (`avg`, `median`, `std`, `min`, `max`, `sum`), and
 * category/text aggregations (`top_value`, `unique_count`, `value_pct`).
 * Returns `{ displayValue, subtext }`.
 */
export function computeKpiValue(kpiConfig, responses = [], columns = []) {
  const list = Array.isArray(responses) ? responses : [];
  if (!kpiConfig || !kpiConfig.operation) {
    return { displayValue: '—', subtext: '' };
  }

  const { columnKey, operation, targetValue } = kpiConfig;

  // 1. Total row count (ignores `columnKey`)
  if (operation === 'total_count') {
    return { displayValue: String(list.length), subtext: '' };
  }

  if (!columnKey || columnKey === '__all__') {
    return { displayValue: '—', subtext: '' };
  }

  // Exclude columns that are ignored or disabled in the project schema
  const activeCols = getActiveColumns(columns);
  const colInSchema = (columns ?? []).find((item) => item?.key === columnKey);
  if (colInSchema && !activeCols.some((item) => item.key === columnKey)) {
    return { displayValue: '—', subtext: '' };
  }

  // 2. Non-empty count across any column type
  if (operation === 'non_empty_count') {
    const count = list.filter((row) => !isEmptyCell(row?.extra_data?.[columnKey])).length;
    return { displayValue: String(count), subtext: '' };
  }

  // 3. Numeric operations (`avg`, `median`, `std`, `min`, `max`, `sum`)
  if (
    operation === 'avg' ||
    operation === 'median' ||
    operation === 'std' ||
    operation === 'min' ||
    operation === 'max' ||
    operation === 'sum'
  ) {
    const nums = [];
    for (const row of list) {
      const raw = row?.extra_data?.[columnKey];
      if (!isEmptyCell(raw) && isNumericCell(raw)) {
        nums.push(typeof raw === 'number' ? raw : Number(String(raw).trim()));
      }
    }

    if (nums.length === 0) {
      return { displayValue: '—', subtext: '' };
    }

    if (operation === 'avg') {
      const mean = nums.reduce((sum, val) => sum + val, 0) / nums.length;
      return { displayValue: formatKpiNumber(mean), subtext: 'avg' };
    }

    if (operation === 'median') {
      const sorted = [...nums].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      const median =
        sorted.length % 2 === 1
          ? sorted[mid]
          : (sorted[mid - 1] + sorted[mid]) / 2;
      return { displayValue: formatKpiNumber(median), subtext: 'median' };
    }

    if (operation === 'std') {
      if (nums.length < 2) {
        return { displayValue: '0', subtext: 'std dev' };
      }
      const mean = nums.reduce((sum, val) => sum + val, 0) / nums.length;
      const variance =
        nums.reduce((sum, val) => sum + (val - mean) ** 2, 0) / (nums.length - 1);
      return { displayValue: formatKpiNumber(Math.sqrt(variance)), subtext: 'std dev' };
    }

    if (operation === 'min') {
      return { displayValue: formatKpiNumber(Math.min(...nums)), subtext: 'min' };
    }

    if (operation === 'max') {
      return { displayValue: formatKpiNumber(Math.max(...nums)), subtext: 'max' };
    }

    const totalSum = nums.reduce((sum, val) => sum + val, 0);
    return { displayValue: formatKpiNumber(totalSum), subtext: 'sum' };
  }

  // 4. Category / Text operations (`top_value`, `unique_count`, `value_pct`)
  const nonEmptyStrings = [];
  for (const row of list) {
    const raw = row?.extra_data?.[columnKey];
    if (!isEmptyCell(raw)) {
      nonEmptyStrings.push(String(raw).trim());
    }
  }

  if (nonEmptyStrings.length === 0) {
    return { displayValue: '—', subtext: '' };
  }

  if (operation === 'unique_count') {
    const distinct = new Set(nonEmptyStrings.map((val) => val.toLowerCase()));
    return { displayValue: String(distinct.size), subtext: 'unique' };
  }

  if (operation === 'value_pct') {
    const needle = String(targetValue ?? '').trim();
    if (!needle) {
      return { displayValue: '—', subtext: '' };
    }
    const normNeedle = needle.toLowerCase();
    const matchCount = nonEmptyStrings.filter(
      (val) => val.toLowerCase() === normNeedle
    ).length;
    const pct = Math.round((matchCount / nonEmptyStrings.length) * 100);
    return { displayValue: `${pct}%`, subtext: needle };
  }

  if (operation === 'top_value') {
    const counts = new Map();
    const displayByNorm = new Map();
    for (const val of nonEmptyStrings) {
      const norm = val.toLowerCase();
      if (!displayByNorm.has(norm)) {
        displayByNorm.set(norm, val);
      }
      counts.set(norm, (counts.get(norm) ?? 0) + 1);
    }
    const [topNorm, topCount] = Array.from(counts.entries()).sort(
      (a, b) => b[1] - a[1]
    )[0];
    const pct = Math.round((topCount / nonEmptyStrings.length) * 100);
    return {
      displayValue: displayByNorm.get(topNorm) ?? topNorm,
      subtext: `${pct}%`,
    };
  }

  return { displayValue: '—', subtext: '' };
}

/**
 * Normalizes a graph's `config` object with clean fallback to legacy `metricKey`
 * so older graphs render identically alongside new 1-column / 2-column configs.
 */
export function resolveGraphConfig(graph, columns = []) {
  const chartStyle = graph?.chartStyle ?? graph?.chart_style ?? 'bar';
  const legacyMetricKey = graph?.metricKey ?? graph?.metric_key ?? '';
  const rawCfg = graph?.config && typeof graph.config === 'object' ? graph.config : null;

  if (rawCfg && rawCfg.xAxisKey) {
    const yAxisKey = rawCfg.yAxisKey || '__count__';
    const aggregation =
      yAxisKey === '__count__' ? 'count' : rawCfg.aggregation || 'avg';
    const secondaryYAxisKey = rawCfg.secondaryYAxisKey || '__count__';
    const secondaryAggregation =
      secondaryYAxisKey === '__count__'
        ? 'count'
        : rawCfg.secondaryAggregation || 'avg';
    const defaultMax = chartStyle === 'donut' ? 8 : 0;
    const maxGroups =
      rawCfg.maxGroups !== undefined && rawCfg.maxGroups !== null
        ? Number(rawCfg.maxGroups)
        : defaultMax;

    return {
      xAxisKey: rawCfg.xAxisKey,
      yAxisKey,
      aggregation,
      secondaryYAxisKey,
      secondaryAggregation,
      maxGroups: Number.isFinite(maxGroups) ? maxGroups : defaultMax,
    };
  }

  // Legacy fallback for pre-5.5.4 graphs without `config`
  const matchedCol = (columns ?? []).find((col) => col?.key === legacyMetricKey);
  const isTrendStyle = chartStyle === 'line' || chartStyle === 'dualAxis';

  if (isTrendStyle && matchedCol?.type === 'number') {
    return {
      xAxisKey: '__session__',
      yAxisKey: legacyMetricKey,
      aggregation: 'avg',
      secondaryYAxisKey: '__count__',
      secondaryAggregation: 'count',
      maxGroups: 0,
    };
  }

  return {
    xAxisKey: legacyMetricKey || '__session__',
    yAxisKey: '__count__',
    aggregation: 'count',
    secondaryYAxisKey: '__count__',
    secondaryAggregation: 'count',
    maxGroups: chartStyle === 'donut' ? 8 : 0,
  };
}

/**
 * Computes a single numeric statistic (`count`, `avg`, `sum`, `median`, `std`,
 * `min`, `max`) over a bucket of response rows for `yAxisKey`.
 */
function computeBucketStat(rows, yAxisKey, aggregation) {
  if (!yAxisKey || yAxisKey === '__count__' || aggregation === 'count') {
    return rows.length;
  }

  const nums = [];
  for (const row of rows) {
    const raw = row?.extra_data?.[yAxisKey];
    if (!isEmptyCell(raw) && isNumericCell(raw)) {
      nums.push(typeof raw === 'number' ? raw : Number(String(raw).trim()));
    }
  }

  if (nums.length === 0) {
    return 0;
  }

  if (aggregation === 'sum') {
    const total = nums.reduce((acc, v) => acc + v, 0);
    return Math.round(total * 100) / 100;
  }

  if (aggregation === 'median') {
    const sorted = [...nums].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const med =
      sorted.length % 2 === 1
        ? sorted[mid]
        : (sorted[mid - 1] + sorted[mid]) / 2;
    return Math.round(med * 100) / 100;
  }

  if (aggregation === 'std') {
    if (nums.length < 2) {
      return 0;
    }
    const mean = nums.reduce((acc, v) => acc + v, 0) / nums.length;
    const variance =
      nums.reduce((acc, v) => acc + (v - mean) ** 2, 0) / (nums.length - 1);
    return Math.round(Math.sqrt(variance) * 100) / 100;
  }

  if (aggregation === 'min') {
    return Math.min(...nums);
  }

  if (aggregation === 'max') {
    return Math.max(...nums);
  }

  // Default: arithmetic mean (`avg`)
  const mean = nums.reduce((acc, v) => acc + v, 0) / nums.length;
  return Math.round(mean * 100) / 100;
}

/**
 * Builds a clean series label for a Y-axis key + aggregation pair.
 */
function buildSeriesLabel(yAxisKey, aggregation, columns) {
  if (!yAxisKey || yAxisKey === '__count__' || aggregation === 'count') {
    return 'Responses';
  }
  const col = (columns ?? []).find((item) => item?.key === yAxisKey);
  const colName = col?.label || yAxisKey;
  const aggPrefixMap = {
    avg: 'Avg',
    sum: 'Sum',
    median: 'Median',
    std: 'Std Dev',
    min: 'Min',
    max: 'Max',
  };
  const prefix = aggPrefixMap[aggregation] || 'Avg';
  return `${prefix} ${colName}`;
}

/**
 * Universal Chart Aggregation Engine supporting 1-column distributions and
 * 2-column statistical aggregations across sessions or any active column.
 * Returns `{ labels, primaryData, primaryLabel, secondaryData, secondaryLabel,
 * totalResponses, config }`.
 */
export function computeChartDataset(
  graph,
  responses = [],
  sessions = [],
  columns = []
) {
  const activeCols = getActiveColumns(columns);
  const chartStyle = graph?.chartStyle ?? graph?.chart_style ?? 'bar';
  const config = resolveGraphConfig(graph, activeCols);
  const {
    xAxisKey,
    yAxisKey,
    aggregation,
    secondaryYAxisKey,
    secondaryAggregation,
    maxGroups,
  } = config;

  // Exclude disabled/ignored columns cleanly when a project schema is present
  const hasSchema = Array.isArray(columns) && columns.length > 0;
  const activeKeySet = new Set(activeCols.map((col) => col.key));
  const isXDisabled =
    hasSchema && xAxisKey !== '__session__' && !activeKeySet.has(xAxisKey);
  const isYDisabled =
    hasSchema && yAxisKey !== '__count__' && !activeKeySet.has(yAxisKey);

  if (isXDisabled || isYDisabled) {
    return {
      labels: [],
      primaryData: [],
      primaryLabel: '',
      secondaryData: [],
      secondaryLabel: '',
      totalResponses: 0,
      config,
    };
  }

  const list = Array.isArray(responses) ? responses : [];
  let groups;

  if (xAxisKey === '__session__') {
    // Group chronologically by session using short titles
    const targetSessions =
      Array.isArray(sessions) && sessions.length > 0
        ? sessions
        : Array.from(
            list
              .reduce((map, row) => {
                const sid = row.sessionId || 'default';
                if (!map.has(sid)) {
                  map.set(sid, {
                    id: sid,
                    shortTitle: row.sessionTitle || sid,
                    title: row.sessionTitle || sid,
                    responses: [],
                  });
                }
                map.get(sid).responses.push(row);
                return map;
              }, new Map())
              .values()
          );

    groups = targetSessions.map((session) => {
      const rawTitle = session.shortTitle || session.title || session.id;
      const label =
        rawTitle.length > 24 ? `${rawTitle.slice(0, 23)}…` : rawTitle;
      return {
        key: session.id,
        label,
        rows: Array.isArray(session.responses) ? session.responses : [],
      };
    });
  } else {
    // Group by `extra_data[xAxisKey]`
    const xCol = activeCols.find((item) => item.key === xAxisKey);
    const bucketMap = new Map();

    for (const row of list) {
      const raw = row?.extra_data?.[xAxisKey];
      if (isEmptyCell(raw)) {
        continue;
      }
      const trimmed = String(raw).trim();
      const normKey =
        xCol?.type === 'number' && isNumericCell(raw)
          ? String(Number(trimmed))
          : trimmed.toLowerCase();

      if (!bucketMap.has(normKey)) {
        bucketMap.set(normKey, {
          key: normKey,
          numericKey:
            xCol?.type === 'number' && isNumericCell(raw)
              ? Number(trimmed)
              : null,
          label: trimmed,
          rows: [],
        });
      }
      bucketMap.get(normKey).rows.push(row);
    }

    groups = Array.from(bucketMap.values());

    // Sort numeric X-axes ascending; sort categorical/text X-axes by volume descending
    if (xCol?.type === 'number') {
      groups.sort((a, b) => (a.numericKey ?? 0) - (b.numericKey ?? 0));
    } else {
      groups.sort((a, b) => b.rows.length - a.rows.length);
    }

    // Cap high-cardinality groups into Top N + "Other" when `maxGroups > 0`
    if (maxGroups > 0 && groups.length > maxGroups) {
      const topGroups = groups.slice(0, maxGroups);
      const restRows = groups.slice(maxGroups).flatMap((g) => g.rows);
      groups = [
        ...topGroups,
        {
          key: '__other__',
          label: 'Other',
          rows: restRows,
        },
      ];
    }
  }

  const labels = groups.map((g) => g.label);
  const primaryData = groups.map((g) =>
    computeBucketStat(g.rows, yAxisKey, aggregation)
  );
  const primaryLabel = buildSeriesLabel(yAxisKey, aggregation, columns);

  const isDualAxis = chartStyle === 'dualAxis';
  const secondaryData = isDualAxis
    ? groups.map((g) =>
        computeBucketStat(g.rows, secondaryYAxisKey, secondaryAggregation)
      )
    : [];
  const secondaryLabel = isDualAxis
    ? buildSeriesLabel(secondaryYAxisKey, secondaryAggregation, columns)
    : '';

  const totalResponses = groups.reduce((sum, g) => sum + g.rows.length, 0);

  return {
    labels,
    primaryData,
    primaryLabel,
    secondaryData,
    secondaryLabel,
    totalResponses,
    config,
  };
}

/**
 * Validates proposed schema edits (`oldColumns` -> `newColumns`) against
 * existing `projectGraphs`, `projectResponses`, and `projectKpis`, returning
 * `{ errors, warnings }`:
 * - `errors`: blocking issues (empty labels, duplicate labels, zero active columns).
 * - `warnings`: non-blocking impacts (removing a column referenced by a chart or
 *   KPI box, or re-typing a column to `number` when stored `extra_data` has non-numeric values).
 */
export function validateSchemaChanges(
  oldColumns = [],
  newColumns = [],
  projectGraphs = [],
  projectResponses = [],
  projectKpis = []
) {
  const errors = [];
  const warnings = [];

  const nextCols = Array.isArray(newColumns) ? newColumns : [];
  const prevCols = Array.isArray(oldColumns) ? oldColumns : [];

  // 1. Check for empty or duplicate column labels (case-insensitive)
  const seenLabels = new Map();
  let activeCount = 0;

  for (const col of nextCols) {
    const trimmedLabel = String(col?.label ?? '').trim();
    if (!trimmedLabel) {
      errors.push({
        code: 'empty_label',
        columnKey: col?.key ?? '',
        message: 'Every column must have a non-empty label.',
      });
    } else {
      const normalized = trimmedLabel.toLowerCase();
      if (seenLabels.has(normalized)) {
        errors.push({
          code: 'duplicate_label',
          columnKey: col?.key ?? '',
          columnLabel: trimmedLabel,
          message: `Duplicate column label "${trimmedLabel}".`,
        });
      } else {
        seenLabels.set(normalized, col?.key ?? '');
      }
    }

    if (col?.type && col.type !== 'ignore' && col.enabled !== false) {
      activeCount += 1;
    }
  }

  if (activeCount === 0) {
    errors.push({
      code: 'no_active_columns',
      message: 'At least one enabled, non-ignored column is required.',
    });
  }

  // 2. Warn when removing, ignoring, or disabling a column used by any chart or KPI
  const activeNewKeys = new Set(getActiveColumns(nextCols).map((col) => col.key));
  const graphMetricKeys = new Set();
  for (const graph of projectGraphs ?? []) {
    const candidates = [
      graph?.metric_key,
      graph?.metricKey,
      graph?.config?.xAxisKey,
      graph?.config?.yAxisKey,
      graph?.config?.secondaryYAxisKey,
    ];
    for (const key of candidates) {
      if (key && key !== '__session__' && key !== '__count__') {
        graphMetricKeys.add(key);
      }
    }
  }
  const kpiColumnKeys = new Set(
    (projectKpis ?? [])
      .map((kpi) => kpi?.columnKey)
      .filter((key) => key && key !== '__all__')
  );

  for (const oldCol of prevCols) {
    if (!oldCol?.key) {
      continue;
    }
    const wasRemovedOrIgnored = !activeNewKeys.has(oldCol.key);
    if (wasRemovedOrIgnored && graphMetricKeys.has(oldCol.key)) {
      warnings.push({
        code: 'column_used_in_graph',
        columnKey: oldCol.key,
        columnLabel: oldCol.label,
        message: `Column "${oldCol.label}" is currently used in one or more charts.`,
      });
    }
    if (wasRemovedOrIgnored && kpiColumnKeys.has(oldCol.key)) {
      warnings.push({
        code: 'column_used_in_kpi',
        columnKey: oldCol.key,
        columnLabel: oldCol.label,
        message: `Column "${oldCol.label}" is currently used in one or more KPI boxes.`,
      });
    }
  }

  // 3. Warn when changing an existing column's type to `number` if non-numeric values exist
  const prevByKey = new Map(prevCols.map((col) => [col.key, col]));

  for (const nextCol of nextCols) {
    if (!nextCol?.key || nextCol.type !== 'number' || nextCol.enabled === false) {
      continue;
    }
    const prevCol = prevByKey.get(nextCol.key);
    if (!prevCol || prevCol.type === 'number') {
      continue;
    }

    const hasNonNumericData = (projectResponses ?? []).some((row) => {
      const val = row?.extra_data?.[nextCol.key];
      return !isEmptyCell(val) && !isNumericCell(val);
    });

    if (hasNonNumericData) {
      warnings.push({
        code: 'non_numeric_existing_data',
        columnKey: nextCol.key,
        columnLabel: nextCol.label,
        message: `Column "${nextCol.label}" contains existing non-numeric responses that will be ignored in numeric calculations.`,
      });
    }
  }

  return { errors, warnings };
}
