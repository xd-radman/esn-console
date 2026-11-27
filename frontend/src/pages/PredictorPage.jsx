/**
 * PredictorPage.jsx — Dedicated Schema-Driven Predictive Analytics Studio (`/project/:projectId/predictor`)
 * Replaces the legacy `PredictionSidebar` drawer with a full 12-column Swiss × Bento workspace:
 * - Enforces `use_retention_predictor` (redirecting unauthorized visitors to `/project/:projectId`)
 *   and `canViewInactiveProjects` (matching `ProjectDashboard.jsx`).
 * - Resolves the active project's predictor schema via `getProjectModelSchema(project)` and
 *   renders a clean Swiss empty state when no model is configured.
 * - Left Panel (5 cols): Dynamic schema-driven form (`number` slider + input, `select`,
 *   `boolean` segmented toggle), "Prefill from Session Average" baseline selector backed by
 *   real Supabase responses, and primary Run Prediction button with loading state.
 * - Right Panel (7 cols): Verdict KPI tile (hidden until first run, persisting across edits),
 *   theme/palette-reactive Chart.js Horizontal Bar chart of `top_factors`, and a responsive
 *   Session Context comparison table contrasting tested numeric inputs against real averages.
 */

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { Bar } from 'react-chartjs-2';
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  Cpu,
  FlaskConical,
  Gauge,
  LoaderCircle,
  RefreshCw,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useData } from '../context/DataContext.jsx';
import { useLang } from '../context/LangContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { readChartTokens } from '../lib/chartUtils.js';
import { getProjectModelSchema, runPrediction } from '../lib/mlApi.js';

// Positive/negative boolean token sets used when inferring boolean field defaults from responses
const TRUTHY_TOKENS = new Set(['yes', 'true', '1', 'evet', 'y', 'always', 'likely']);
const FALSY_TOKENS = new Set(['no', 'false', '0', 'hayır', 'hayir', 'n', 'never', 'unlikely']);

/**
 * Formats a numeric value cleanly based on step precision without noisy trailing zeros.
 */
function formatNumericValue(value, step = 1) {
  const num = Number(value);
  if (!Number.isFinite(num)) {
    return '—';
  }
  const stepStr = String(step ?? 1);
  const decimals = stepStr.includes('.') ? stepStr.split('.')[1].length : 0;
  if (decimals === 0) {
    return String(Math.round(num));
  }
  return Number(num.toFixed(Math.min(decimals, 2))).toString();
}

/**
 * Rounds and clamps a numeric value to a field's `[min, max]` and `step` precision.
 */
function snapFieldNumber(value, field) {
  const min = Number.isFinite(Number(field?.min)) ? Number(field.min) : 0;
  const max = Number.isFinite(Number(field?.max)) ? Number(field.max) : 100;
  const step = Number(field?.step) > 0 ? Number(field.step) : 1;
  const clamped = Math.max(min, Math.min(max, Number(value)));
  const stepStr = String(step);
  const decimals = stepStr.includes('.') ? stepStr.split('.')[1].length : 0;
  const snapped = Math.round(clamped / step) * step;
  return Number(Math.max(min, Math.min(max, snapped)).toFixed(decimals));
}

/**
 * Builds the initial form input map from a predictor schema's field defaults.
 */
function buildInitialInputs(schema) {
  if (!schema || !Array.isArray(schema.fields)) {
    return {};
  }
  const initial = {};
  for (const field of schema.fields) {
    if (field.type === 'number') {
      const fallback = Number.isFinite(Number(field.defaultValue))
        ? Number(field.defaultValue)
        : Number(field.min ?? 0);
      initial[field.key] = fallback;
    } else if (field.type === 'boolean') {
      initial[field.key] = Boolean(field.defaultValue);
    } else if (field.type === 'select') {
      initial[field.key] =
        field.defaultValue !== undefined && field.defaultValue !== null
          ? String(field.defaultValue)
          : String(field.options?.[0]?.value ?? '');
    }
  }
  return initial;
}

/**
 * Extracts a raw cell value matching a schema field from a Supabase response row
 * by checking `extra_data`, top-level legacy response columns, and project column labels.
 */
function extractFieldValueFromResponse(row, field, projectColumns = []) {
  if (!row || !field) {
    return undefined;
  }

  const extra = row.extra_data && typeof row.extra_data === 'object' ? row.extra_data : {};
  const hint = String(field.sourceColumnHint || '').trim();
  const key = String(field.key || '').trim();

  // 1. Direct lookup in `extra_data` by sourceColumnHint or field key
  if (hint && extra[hint] !== undefined && extra[hint] !== null && extra[hint] !== '') {
    return extra[hint];
  }
  if (key && extra[key] !== undefined && extra[key] !== null && extra[key] !== '') {
    return extra[key];
  }

  // 2. Direct lookup on top-level legacy Supabase columns (`score`, `comfort`, `cat1`, `cat2`, `outcome`)
  if (hint && row[hint] !== undefined && row[hint] !== null && row[hint] !== '') {
    return row[hint];
  }
  if (key && row[key] !== undefined && row[key] !== null && row[key] !== '') {
    return row[key];
  }

  // 3. Case-insensitive / substring match across dynamic `extra_data` keys & project schema columns
  const needle = (hint || key).toLowerCase();
  if (!needle) {
    return undefined;
  }

  for (const col of projectColumns) {
    if (!col?.key) {
      continue;
    }
    const colKeyLower = String(col.key).toLowerCase();
    const colLabelLower = String(col.label || '').toLowerCase();
    if (
      colKeyLower === needle ||
      colKeyLower.includes(needle) ||
      colLabelLower.includes(needle)
    ) {
      const candidate = extra[col.key];
      if (candidate !== undefined && candidate !== null && candidate !== '') {
        return candidate;
      }
    }
  }

  return undefined;
}

/**
 * Computes baseline averages (for numeric fields), mode categories (for select fields),
 * and majority booleans (for boolean fields) from a scoped list of Supabase responses.
 */
function computeSessionBaseline(schema, scopedResponses = [], projectColumns = []) {
  const baseline = {};
  if (!schema || !Array.isArray(schema.fields) || scopedResponses.length === 0) {
    return baseline;
  }

  for (const field of schema.fields) {
    const rawValues = [];
    for (const row of scopedResponses) {
      const val = extractFieldValueFromResponse(row, field, projectColumns);
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        rawValues.push(val);
      }
    }

    if (rawValues.length === 0) {
      continue;
    }

    if (field.type === 'number') {
      const nums = rawValues
        .map((v) => Number(String(v).trim()))
        .filter((n) => Number.isFinite(n));
      if (nums.length > 0) {
        const mean = nums.reduce((sum, n) => sum + n, 0) / nums.length;
        baseline[field.key] = {
          type: 'number',
          rawMean: mean,
          value: snapFieldNumber(mean, field),
          sampleCount: nums.length,
        };
      }
    } else if (field.type === 'select') {
      const optionValues = new Map(
        (field.options ?? []).map((opt) => [String(opt.value).toLowerCase(), String(opt.value)])
      );
      const counts = new Map();
      for (const raw of rawValues) {
        const normalized = String(raw).trim().toLowerCase();
        const matchedOption = optionValues.get(normalized);
        if (matchedOption !== undefined) {
          counts.set(matchedOption, (counts.get(matchedOption) || 0) + 1);
        }
      }
      if (counts.size > 0) {
        const [topValue, topCount] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
        baseline[field.key] = {
          type: 'select',
          value: topValue,
          sampleCount: topCount,
        };
      }
    } else if (field.type === 'boolean') {
      let trueVotes = 0;
      let falseVotes = 0;
      for (const raw of rawValues) {
        if (typeof raw === 'boolean') {
          if (raw) trueVotes += 1;
          else falseVotes += 1;
        } else {
          const token = String(raw).trim().toLowerCase();
          if (TRUTHY_TOKENS.has(token)) {
            trueVotes += 1;
          } else if (FALSY_TOKENS.has(token)) {
            falseVotes += 1;
          }
        }
      }
      const totalVotes = trueVotes + falseVotes;
      if (totalVotes > 0) {
        baseline[field.key] = {
          type: 'boolean',
          value: trueVotes >= falseVotes,
          sampleCount: totalVotes,
        };
      }
    }
  }

  return baseline;
}

/**
 * Accessible native range slider + synchronized numeric input component.
 * Syncs `--attr-min`, `--attr-max`, and `--control-value` imperatively via ref so
 * WebKit/Blink active track fill works smoothly with zero inline JSX `style` objects.
 */
function SchemaNumberControl({ field, value, label, onChange }) {
  const inputId = useId();
  const rangeId = useId();
  const sliderRef = useRef(null);

  const min = Number.isFinite(Number(field.min)) ? Number(field.min) : 0;
  const max = Number.isFinite(Number(field.max)) ? Number(field.max) : 100;
  const step = Number(field.step) > 0 ? Number(field.step) : 1;
  const safeNum = Number.isFinite(Number(value)) ? Number(value) : min;

  // Keep CSS custom properties synchronized for cross-browser active track fill
  useEffect(() => {
    const el = sliderRef.current;
    if (!el) {
      return;
    }
    el.style.setProperty('--attr-min', String(min));
    el.style.setProperty('--attr-max', String(max));
    el.style.setProperty('--control-value', String(safeNum));
  }, [min, max, safeNum]);

  const handleRangeChange = (event) => {
    const next = Number(event.target.value);
    if (Number.isFinite(next)) {
      onChange(field.key, next);
    }
  };

  const handleNumberChange = (event) => {
    const raw = event.target.value;
    if (raw === '') {
      onChange(field.key, '');
      return;
    }
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) {
      onChange(field.key, parsed);
    }
  };

  const handleNumberBlur = () => {
    if (value === '' || !Number.isFinite(Number(value))) {
      onChange(field.key, field.defaultValue ?? min);
      return;
    }
    onChange(field.key, snapFieldNumber(value, field));
  };

  return (
    <div className="form-field predictor-field">
      <div className="form-label-row">
        <label htmlFor={inputId} className="form-label">
          {label}
        </label>
        <span className="font-mono-label predictor-range-bounds tabular-nums">
          {formatNumericValue(min, step)}–{formatNumericValue(max, step)}
        </span>
      </div>

      <div className="predictor-number-row">
        <input
          ref={sliderRef}
          id={rangeId}
          name={`${field.key}_range`}
          type="range"
          min={min}
          max={max}
          step={step}
          value={Math.max(min, Math.min(max, safeNum))}
          aria-label={label}
          aria-valuetext={formatNumericValue(safeNum, step)}
          className="predictor-range-slider"
          onChange={handleRangeChange}
        />

        <input
          id={inputId}
          name={field.key}
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          className="form-input predictor-number-input tabular-nums"
          onChange={handleNumberChange}
          onBlur={handleNumberBlur}
        />
      </div>
    </div>
  );
}

/**
 * Horizontal Bar Chart visualizing `top_factors` (-1..+1 impact) via Chart.js.
 * Reads live CSS custom properties from `tokens.css` and automatically updates
 * when Light/Dark theme or user color palette changes in `ThemeContext`.
 */
function KeyDriversChart({ factors = [], lang, theme, paletteSignature, t }) {
  const chartConfig = useMemo(() => {
    const tokens = readChartTokens();
    const labels = factors.map((item) =>
      lang === 'tr' ? item.labelTr || item.labelEn : item.labelEn || item.labelTr
    );
    const values = factors.map((item) => Number(item.impact) || 0);
    const barColors = values.map((val) =>
      val >= 0 ? tokens.green : tokens.magenta
    );

    const data = {
      labels,
      datasets: [
        {
          label: t('predictor.impactAxisLabel'),
          data: values,
          backgroundColor: barColors,
          borderColor: barColors,
          borderWidth: 1,
          borderRadius: 5,
          barPercentage: 0.64,
          categoryPercentage: 0.78,
        },
      ],
    };

    const options = {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 280,
      },
      scales: {
        x: {
          min: -1,
          max: 1,
          grid: {
            color: (ctx) =>
              ctx.tick?.value === 0 ? tokens.tick : tokens.grid,
            lineWidth: (ctx) => (ctx.tick?.value === 0 ? 1.25 : 1),
          },
          border: {
            display: false,
          },
          ticks: {
            color: tokens.tick,
            font: {
              family: tokens.fontMono,
              size: 11,
            },
            stepSize: 0.5,
            callback: (val) => {
              const n = Number(val);
              if (n > 0) return `+${n.toFixed(1)}`;
              if (n < 0) return n.toFixed(1);
              return '0';
            },
          },
        },
        y: {
          grid: {
            display: false,
          },
          border: {
            display: false,
          },
          ticks: {
            color: tokens.tick,
            font: {
              family: tokens.fontSans,
              size: 12,
              weight: 500,
            },
          },
        },
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          backgroundColor: tokens.tooltipBg,
          titleColor: tokens.tooltipText,
          bodyColor: tokens.tooltipText,
          borderColor: tokens.tooltipBorder,
          borderWidth: 1,
          padding: 10,
          cornerRadius: 7,
          displayColors: true,
          callbacks: {
            label: (ctx) => {
              const raw = Number(ctx.parsed?.x ?? 0);
              const signed = raw > 0 ? `+${raw.toFixed(2)}` : raw.toFixed(2);
              const dir =
                raw >= 0
                  ? t('predictor.positiveDriver')
                  : t('predictor.negativeDriver');
              return `${dir}: ${signed}`;
            },
          },
        },
      },
    };

    return { data, options };
    // `theme` and `paletteSignature` intentionally trigger re-reading live CSS tokens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [factors, lang, theme, paletteSignature, t]);

  return (
    <div className="predictor-drivers-canvas">
      <Bar
        key={`${theme}-${paletteSignature}-${lang}`}
        data={chartConfig.data}
        options={chartConfig.options}
      />
    </div>
  );
}

export default function PredictorPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { lang, t } = useLang();
  const { theme, palette } = useTheme();
  const {
    hasPermission,
    canViewInactiveProjects,
    loading: authLoading,
  } = useAuth();
  const { projects, responsesByProject, isLoading } = useData();
  const { showToast } = useToast();

  const canUsePredictor = hasPermission('use_retention_predictor');
  const paletteSignature = palette?.colors?.join(',') ?? '';

  // Stable IDs for accessible labels, regions, and table captions
  const prefillSelectId = useId();
  const formHeadingId = useId();
  const contextTableCaptionId = useId();

  // Resolve active project, response bucket, columns, and model schema
  const activeProject = useMemo(
    () => projects.find((project) => project.id === projectId) ?? null,
    [projects, projectId]
  );

  const projectData = responsesByProject[projectId] ?? { sessions: [], responses: [] };
  const { sessions, responses } = projectData;
  const projectColumns = useMemo(
    () => activeProject?.config?.columns ?? [],
    [activeProject]
  );
  const projectCopy = activeProject ? activeProject[lang] ?? activeProject.en : null;

  const schema = useMemo(
    () => getProjectModelSchema(activeProject),
    [activeProject]
  );

  // Scoped session selector (`"all"` or a specific `session.id`) for prefill & context table
  const [selectedSessionId, setSelectedSessionId] = useState('all');

  // Form inputs, last tested snapshot, prediction output, and async running state
  const [inputs, setInputs] = useState(() => buildInitialInputs(schema));
  const [testedInputs, setTestedInputs] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [prefillNotice, setPrefillNotice] = useState(null);

  // Track active project + model key to cleanly reset form/prediction when switching projects
  const activeSchemaKey = `${activeProject?.id ?? ''}::${schema?.modelKey ?? 'none'}`;
  const lastSchemaKeyRef = useRef(activeSchemaKey);

  useEffect(() => {
    if (lastSchemaKeyRef.current !== activeSchemaKey) {
      lastSchemaKeyRef.current = activeSchemaKey;
      setInputs(buildInitialInputs(schema));
      setTestedInputs(null);
      setPrediction(null);
      setSelectedSessionId('all');
      setPrefillNotice(null);
    }
  }, [activeSchemaKey, schema]);

  // Fall back to `"all"` if the chosen session ID does not belong to the active project
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

  const scopedResponses = useMemo(() => {
    if (effectiveSessionId === 'all') {
      return responses;
    }
    return activeSession?.responses ?? [];
  }, [effectiveSessionId, responses, activeSession]);

  // Compute live real-data baseline for the active session scope
  const sessionBaseline = useMemo(
    () => computeSessionBaseline(schema, scopedResponses, projectColumns),
    [schema, scopedResponses, projectColumns]
  );

  // Determine whether the user edited any input since the last prediction run
  const isStale = useMemo(() => {
    if (!prediction || !testedInputs || !schema) {
      return false;
    }
    return schema.fields.some((field) => inputs[field.key] !== testedInputs[field.key]);
  }, [prediction, testedInputs, inputs, schema]);

  // Synchronize browser tab title with the active project and Predictor view
  useEffect(() => {
    const label = projectCopy?.title ?? projectId ?? '';
    document.title = t('predictor.pageTitle', { id: label });
  }, [projectCopy, projectId, t]);

  // Enforce the same `canViewInactiveProjects` guard used on `ProjectDashboard.jsx`
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

  // Update a single controlled input field without clearing an existing prediction
  const handleFieldChange = useCallback((fieldKey, nextValue) => {
    setInputs((prev) => ({
      ...prev,
      [fieldKey]: nextValue,
    }));
  }, []);

  // Apply real Supabase averages/modes from a given session scope into the form
  const applyBaselineForScope = useCallback(
    (scopeSessionId) => {
      if (!schema) {
        return;
      }
      const targetSession =
        scopeSessionId === 'all'
          ? null
          : sessions.find((s) => s.id === scopeSessionId) ?? null;
      const targetResponses =
        scopeSessionId === 'all' ? responses : targetSession?.responses ?? [];

      const computed = computeSessionBaseline(
        schema,
        targetResponses,
        projectColumns
      );
      const matchedKeys = Object.keys(computed);

      if (matchedKeys.length === 0) {
        setPrefillNotice({
          kind: 'empty',
          count: 0,
          responsesCount: targetResponses.length,
        });
        return;
      }

      setInputs((prev) => {
        const next = { ...prev };
        for (const key of matchedKeys) {
          next[key] = computed[key].value;
        }
        return next;
      });
      setPrefillNotice({
        kind: 'applied',
        count: matchedKeys.length,
        responsesCount: targetResponses.length,
      });
    },
    [schema, sessions, responses, projectColumns]
  );

  // Changing the "Prefill from Session Average" dropdown switches context & prefills in one click
  const handlePrefillSessionChange = (event) => {
    const nextScope = event.target.value;
    setSelectedSessionId(nextScope);
    applyBaselineForScope(nextScope);
  };

  // Run prediction via `mlApi.js` and store both result and the exact tested scenario snapshot
  const handleRunPrediction = async (event) => {
    event.preventDefault();
    if (!schema || isRunning) {
      return;
    }

    // Normalize numeric fields cleanly before sending to the predictor
    const sanitizedInputs = {};
    for (const field of schema.fields) {
      if (field.type === 'number') {
        const raw = inputs[field.key];
        sanitizedInputs[field.key] =
          raw === '' || !Number.isFinite(Number(raw))
            ? Number(field.defaultValue ?? field.min ?? 0)
            : snapFieldNumber(raw, field);
      } else if (field.type === 'boolean') {
        sanitizedInputs[field.key] = Boolean(inputs[field.key]);
      } else {
        sanitizedInputs[field.key] = String(
          inputs[field.key] ?? field.defaultValue ?? ''
        );
      }
    }

    setInputs(sanitizedInputs);
    setIsRunning(true);

    try {
      const result = await runPrediction(schema.modelKey, sanitizedInputs, schema);
      setPrediction(result);
      setTestedInputs(sanitizedInputs);
    } finally {
      setIsRunning(false);
    }
  };

  // Redirect users without `use_retention_predictor` back to the Analytics dashboard
  if (!authLoading && !canUsePredictor) {
    return (
      <Navigate
        to={`/project/${encodeURIComponent(projectId ?? '')}`}
        replace
      />
    );
  }

  // Wait for initial Supabase fetch before evaluating project existence
  if (authLoading || (isLoading && !activeProject)) {
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

  // Suppress content while redirecting away from an inactive project
  if (isRestrictedInactive) {
    return null;
  }

  // Unknown `:projectId` fallback card
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

  const analyticsPath = `/project/${encodeURIComponent(activeProject.id)}`;

  // Empty State when no predictive model is configured for this project
  if (!schema) {
    return (
      <main className="dashboard-main predictor-main">
        <section className="dashboard-header hairline-bottom">
          <div className="dashboard-header-inner">
            <div className="dashboard-header-copy">
              <div className="dashboard-header-tags">
                <span className="mono-tag">{activeProject.code}</span>
                <span className="font-mono-label dashboard-kicker">
                  {projectCopy.category}
                </span>
              </div>
              <h1 className="font-editorial dashboard-title">{projectCopy.title}</h1>
            </div>
          </div>
        </section>

        <div className="dashboard-content">
          <article className="bento-card predictor-empty-card">
            <div className="predictor-empty-icon" aria-hidden="true">
              <Cpu size={24} strokeWidth={1.5} />
            </div>
            <span className="mono-tag">{t('predictor.kicker')}</span>
            <h2 className="font-editorial predictor-empty-title">
              {t('predictor.emptyTitle')}
            </h2>
            <p className="predictor-empty-subtitle">
              {t('predictor.emptySubtitle')}
            </p>
            <Link to={analyticsPath} className="btn primary">
              <BarChart3 size={15} strokeWidth={1.5} aria-hidden="true" />
              <span>{t('predictor.backToAnalytics')}</span>
            </Link>
          </article>
        </div>
      </main>
    );
  }

  const modelTitle = lang === 'tr' ? schema.titleTr : schema.titleEn;
  const modelDescription = lang === 'tr' ? schema.descriptionTr : schema.descriptionEn;
  const numericFields = schema.fields.filter((field) => field.type === 'number');
  const activeScopeLabel =
    effectiveSessionId === 'all'
      ? t('predictor.allSessionsShort')
      : activeSession?.shortTitle || activeSession?.title || t('predictor.allSessionsShort');

  // Map API verdict values to visual tones and iconography
  const verdictTone =
    prediction?.verdict === 'likely_return'
      ? 'positive'
      : prediction?.verdict === 'at_risk'
        ? 'danger'
        : 'neutral';

  return (
    <main className="dashboard-main predictor-main">
      {/* Predictor Page Header: Project title, model version badge & DEMO MODEL pill */}
      <section className="dashboard-header hairline-bottom">
        <div className="dashboard-header-inner predictor-header-row">
          <div className="dashboard-header-copy">
            <div className="dashboard-header-tags">
              <span className="mono-tag">{activeProject.code}</span>
              <span className="mono-tag predictor-version-tag">
                <Cpu size={12} strokeWidth={1.5} aria-hidden="true" />
                <span>{schema.version}</span>
              </span>
              {schema.isMock && (
                <span className="predictor-demo-pill font-mono-label">
                  <FlaskConical size={12} strokeWidth={1.5} aria-hidden="true" />
                  <span>{t('predictor.demoModelBadge')}</span>
                </span>
              )}
            </div>

            <div className="dashboard-title-row">
              <h1 className="font-editorial dashboard-title">{projectCopy.title}</h1>
            </div>

            <p className="dashboard-subtitle">
              <strong className="predictor-model-name">{modelTitle}</strong>
              {modelDescription ? ` — ${modelDescription}` : ''}
            </p>
          </div>
        </div>
      </section>

      {/* 12-Column Swiss × Bento Predictor Studio Grid */}
      <div className="dashboard-content">
        <div className="predictor-grid">
          {/* Left Panel (5 cols on desktop, 12 on mobile): Scenario & Input Form */}
          <section
            className="bento-card predictor-form-panel"
            aria-labelledby={formHeadingId}
          >
            <header className="predictor-panel-header hairline-bottom">
              <div className="predictor-panel-heading">
                <span className="font-mono-label predictor-panel-kicker">
                  {t('predictor.scenarioKicker')}
                </span>
                <h2 id={formHeadingId} className="font-editorial predictor-panel-title">
                  {t('predictor.scenarioTitle')}
                </h2>
              </div>
            </header>

            {/* Prefill from Session Average Bar */}
            <div className="predictor-prefill-box">
              <div className="form-label-row">
                <label htmlFor={prefillSelectId} className="form-label">
                  {t('predictor.prefillLabel')}
                </label>
                <span className="font-mono-label predictor-prefill-count tabular-nums">
                  {t('predictor.responsesSampled', { count: scopedResponses.length })}
                </span>
              </div>

              <div className="predictor-prefill-controls">
                <div className="form-select-wrap predictor-prefill-select-wrap">
                  <select
                    id={prefillSelectId}
                    name="prefill_session"
                    className="form-select predictor-prefill-select"
                    value={effectiveSessionId}
                    onChange={handlePrefillSessionChange}
                  >
                    <option value="all">
                      {t('dashboard.allSessions')} ({responses.length})
                    </option>
                    {sessions.map((session) => (
                      <option key={session.id} value={session.id}>
                        {session.title} ({session.responses.length})
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={15}
                    strokeWidth={1.5}
                    aria-hidden="true"
                    className="form-select-chevron"
                  />
                </div>

                <button
                  type="button"
                  className="btn predictor-prefill-btn"
                  disabled={scopedResponses.length === 0}
                  onClick={() => applyBaselineForScope(effectiveSessionId)}
                >
                  <RefreshCw size={14} strokeWidth={1.5} aria-hidden="true" />
                  <span>{t('predictor.applyBaselineBtn')}</span>
                </button>
              </div>

              {prefillNotice && (
                <p
                  className="predictor-prefill-status"
                  role="status"
                  aria-live="polite"
                >
                  {prefillNotice.kind === 'applied'
                    ? t('predictor.prefillApplied', {
                        fields: prefillNotice.count,
                        responses: prefillNotice.responsesCount,
                      })
                    : t('predictor.prefillNoMatch')}
                </p>
              )}
            </div>

            {/* Dynamic Schema-Driven Form */}
            <form
              className="predictor-form"
              aria-labelledby={formHeadingId}
              onSubmit={handleRunPrediction}
            >
              {schema.fields.map((field) => {
                const fieldLabel = lang === 'tr' ? field.labelTr : field.labelEn;

                if (field.type === 'number') {
                  return (
                    <SchemaNumberControl
                      key={field.key}
                      field={field}
                      value={inputs[field.key] ?? field.defaultValue ?? field.min ?? 0}
                      label={fieldLabel}
                      onChange={handleFieldChange}
                    />
                  );
                }

                if (field.type === 'select') {
                  const selectId = `predictor-field-${field.key}`;
                  return (
                    <div key={field.key} className="form-field predictor-field">
                      <label htmlFor={selectId} className="form-label">
                        {fieldLabel}
                      </label>
                      <div className="form-select-wrap">
                        <select
                          id={selectId}
                          name={field.key}
                          className="form-select"
                          value={String(inputs[field.key] ?? field.defaultValue ?? '')}
                          onChange={(event) =>
                            handleFieldChange(field.key, event.target.value)
                          }
                        >
                          {(field.options ?? []).map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {lang === 'tr' ? opt.labelTr : opt.labelEn}
                            </option>
                          ))}
                        </select>
                        <ChevronDown
                          size={15}
                          strokeWidth={1.5}
                          aria-hidden="true"
                          className="form-select-chevron"
                        />
                      </div>
                    </div>
                  );
                }

                // Boolean segmented toggle (`Yes | No` / `Evet | Hayır`)
                const boolVal = Boolean(inputs[field.key]);
                return (
                  <fieldset key={field.key} className="form-fieldset predictor-field">
                    <legend className="form-label">{fieldLabel}</legend>
                    <div
                      className="predictor-bool-toggle"
                      role="group"
                      aria-label={fieldLabel}
                    >
                      <button
                        type="button"
                        aria-pressed={boolVal}
                        onClick={() => handleFieldChange(field.key, true)}
                      >
                        {t('charts.values.yes')}
                      </button>
                      <button
                        type="button"
                        aria-pressed={!boolVal}
                        onClick={() => handleFieldChange(field.key, false)}
                      >
                        {t('charts.values.no')}
                      </button>
                    </div>
                  </fieldset>
                );
              })}

              <div className="predictor-submit-wrap hairline-top">
                <button
                  type="submit"
                  className="btn primary predictor-submit-btn"
                  disabled={isRunning}
                >
                  {isRunning ? (
                    <LoaderCircle
                      size={16}
                      strokeWidth={1.5}
                      aria-hidden="true"
                      className="spin-icon"
                    />
                  ) : (
                    <Sparkles size={16} strokeWidth={1.5} aria-hidden="true" />
                  )}
                  <span>
                    {isRunning
                      ? t('predictor.runningBtn')
                      : t('predictor.runBtn')}
                  </span>
                </button>
              </div>
            </form>
          </section>

          {/* Right Panel (7 cols on desktop, 12 on mobile): Verdict & Visual Insights */}
          <section
            className="predictor-insights-panel"
            aria-label={t('predictor.insightsRegionLabel')}
            aria-live="polite"
          >
            {!prediction ? (
              <article className="bento-card predictor-prompt-card">
                <div className="predictor-prompt-icon" aria-hidden="true">
                  <SlidersHorizontal size={22} strokeWidth={1.5} />
                </div>
                <span className="mono-tag">{t('predictor.readyKicker')}</span>
                <h2 className="font-editorial predictor-prompt-title">
                  {t('predictor.promptTitle')}
                </h2>
                <p className="predictor-prompt-subtitle">
                  {t('predictor.promptSubtitle')}
                </p>
              </article>
            ) : (
              <>
                {/* 1. Verdict KPI Tile */}
                <article
                  className={`bento-card predictor-verdict-tile tone-${verdictTone}`}
                >
                  <div className="predictor-verdict-top">
                    <div className="predictor-verdict-copy">
                      <div className="predictor-verdict-badges">
                        <span className="font-mono-label predictor-verdict-kicker">
                          {t('predictor.verdictLabel')}
                        </span>
                        <span className="mono-tag predictor-version-tag">
                          {prediction.model_version}
                        </span>
                        {prediction.isMock && (
                          <span className="predictor-demo-pill font-mono-label">
                            {t('predictor.demoModelBadge')}
                          </span>
                        )}
                      </div>

                      <h2 className="font-editorial predictor-verdict-headline">
                        {verdictTone === 'positive' ? (
                          <CheckCircle2 size={24} strokeWidth={1.5} aria-hidden="true" />
                        ) : verdictTone === 'danger' ? (
                          <AlertTriangle size={24} strokeWidth={1.5} aria-hidden="true" />
                        ) : (
                          <Gauge size={24} strokeWidth={1.5} aria-hidden="true" />
                        )}
                        <span>{t(`predictor.verdicts.${prediction.verdict}`)}</span>
                      </h2>

                      <p className="predictor-verdict-summary">
                        {t(`predictor.verdictDescriptions.${prediction.verdict}`)}
                      </p>
                    </div>

                    <div className="predictor-verdict-metric">
                      <span className="font-mono-label predictor-verdict-kicker">
                        {t('predictor.confidenceLabel')}
                      </span>
                      <span className="font-editorial predictor-verdict-pct tabular-nums">
                        {prediction.probability}%
                      </span>
                    </div>
                  </div>

                  {isStale && (
                    <p className="predictor-stale-note font-mono-label hairline-top">
                      {t('predictor.inputsModifiedHint')}
                    </p>
                  )}
                </article>

                {/* 2. Key Drivers Chart (Chart.js Horizontal Bar) */}
                <article className="bento-card predictor-drivers-tile">
                  <header className="predictor-tile-header">
                    <div className="predictor-panel-heading">
                      <span className="font-mono-label predictor-panel-kicker">
                        {t('predictor.driversKicker')}
                      </span>
                      <h3 className="font-editorial predictor-tile-title">
                        {t('predictor.driversTitle')}
                      </h3>
                    </div>

                    <div className="predictor-driver-legend">
                      <span className="predictor-legend-chip is-positive font-mono-label">
                        <span className="predictor-legend-dot" aria-hidden="true" />
                        <span>{t('predictor.positiveDriver')}</span>
                      </span>
                      <span className="predictor-legend-chip is-negative font-mono-label">
                        <span className="predictor-legend-dot" aria-hidden="true" />
                        <span>{t('predictor.negativeDriver')}</span>
                      </span>
                    </div>
                  </header>

                  <KeyDriversChart
                    factors={prediction.top_factors ?? []}
                    lang={lang}
                    theme={theme}
                    paletteSignature={paletteSignature}
                    t={t}
                  />
                </article>

                {/* 3. Session Context Tile: Tested Scenario vs. Real Supabase Averages */}
                <article className="bento-card predictor-context-tile">
                  <header className="predictor-tile-header">
                    <div className="predictor-panel-heading">
                      <span className="font-mono-label predictor-panel-kicker">
                        {t('predictor.contextKicker')}
                      </span>
                      <h3 className="font-editorial predictor-tile-title">
                        {t('predictor.contextTitle')}
                      </h3>
                    </div>

                    <span className="mono-tag predictor-scope-tag">
                      {activeScopeLabel} · {scopedResponses.length}
                    </span>
                  </header>

                  {numericFields.length === 0 ? (
                    <p className="predictor-context-empty">
                      {t('predictor.contextNoNumeric')}
                    </p>
                  ) : (
                    <div
                      className="predictor-context-table-wrap"
                      tabIndex={0}
                      role="region"
                      aria-labelledby={contextTableCaptionId}
                    >
                      <table className="predictor-context-table">
                        <caption id={contextTableCaptionId} className="visually-hidden">
                          {t('predictor.contextTableCaption')}
                        </caption>
                        <thead>
                          <tr>
                            <th scope="col">{t('predictor.contextColMetric')}</th>
                            <th scope="col" className="is-numeric">
                              {t('predictor.contextColScenario')}
                            </th>
                            <th scope="col" className="is-numeric">
                              {t('predictor.contextColBaseline')}
                            </th>
                            <th scope="col" className="is-numeric">
                              {t('predictor.contextColDelta')}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {numericFields.map((field) => {
                            const fieldLabel =
                              lang === 'tr' ? field.labelTr : field.labelEn;
                            const testedVal = Number(
                              testedInputs?.[field.key] ?? inputs[field.key]
                            );
                            const baselineEntry = sessionBaseline[field.key];
                            const hasBaseline =
                              baselineEntry &&
                              Number.isFinite(baselineEntry.rawMean);
                            const delta =
                              hasBaseline && Number.isFinite(testedVal)
                                ? testedVal - baselineEntry.rawMean
                                : null;
                            const deltaRounded =
                              delta !== null ? Number(delta.toFixed(2)) : null;
                            const deltaTone =
                              deltaRounded === null || Math.abs(deltaRounded) < 0.01
                                ? 'is-flat'
                                : deltaRounded > 0
                                  ? 'is-up'
                                  : 'is-down';

                            return (
                              <tr key={field.key}>
                                <th scope="row">{fieldLabel}</th>
                                <td className="is-numeric tabular-nums">
                                  {formatNumericValue(testedVal, field.step)}
                                </td>
                                <td className="is-numeric tabular-nums">
                                  {hasBaseline
                                    ? formatNumericValue(
                                        baselineEntry.rawMean,
                                        field.step < 1 ? field.step : 0.1
                                      )
                                    : '—'}
                                </td>
                                <td className="is-numeric tabular-nums">
                                  {deltaRounded === null ? (
                                    <span className="predictor-delta-chip is-flat">
                                      —
                                    </span>
                                  ) : (
                                    <span className={`predictor-delta-chip ${deltaTone}`}>
                                      {deltaRounded > 0 ? '+' : ''}
                                      {formatNumericValue(
                                        deltaRounded,
                                        field.step < 1 ? field.step : 0.1
                                      )}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </article>
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
