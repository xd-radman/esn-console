/**
 * mlApi.js — Schema-Driven Retention Predictor Contract & Mock Inference Engine
 * Centralizes per-project ML schema resolution (`getProjectModelSchema`) and
 * prediction execution (`runPrediction`) so `PredictorPage.jsx` stays decoupled
 * from the underlying inference engine and ready for a drop-in FastAPI swap in
 * Phase 6.2 (`VITE_ML_API_URL`).
 */

// Slugs and project codes recognized as the primary Speaking Club demo project
const SPEAKING_CLUB_SLUGS = new Set(['speaking-club', 'speaking_club']);
const SPEAKING_CLUB_CODES = new Set(['esn-sc-01']);

// Realistic schema-driven demo model for Speaking Club (exercising number, select, and boolean fields)
const SPEAKING_CLUB_DEMO_SCHEMA = {
  modelKey: 'speaking_club_retention_v1',
  version: 'v1.0.0-mock',
  isMock: true,
  titleEn: 'Speaking Club Retention Model',
  titleTr: 'Konuşma Kulübü Bağlılık Modeli',
  descriptionEn:
    'Estimates repeat participant attendance from session satisfaction, social comfort, participant mix, table activity focus, and icebreaker structure.',
  descriptionTr:
    'Oturum memnuniyeti, sosyal konfor, katılımcı dengesi, masa etkinlik odağı ve buz kırıcı yapısına göre tekrar katılım olasılığını tahmin eder.',
  fields: [
    {
      key: 'satisfaction_score',
      labelEn: 'Expected Satisfaction Score (1–5)',
      labelTr: 'Beklenen Memnuniyet Puanı (1–5)',
      type: 'number',
      min: 1,
      max: 5,
      step: 0.1,
      defaultValue: 4.3,
      sourceColumnHint: 'score',
    },
    {
      key: 'expected_group_size',
      labelEn: 'Expected Attendance (Group Size)',
      labelTr: 'Beklenen Katılımcı Sayısı (Grup Boyutu)',
      type: 'number',
      min: 6,
      max: 120,
      step: 1,
      defaultValue: 28,
      sourceColumnHint: 'group_size',
    },
    {
      key: 'comfort_level',
      labelEn: 'Social Comfort Level',
      labelTr: 'Sosyal Konfor Düzeyi',
      type: 'select',
      options: [
        {
          value: 'high',
          labelEn: 'High — Welcoming & Guided',
          labelTr: 'Yüksek — Samimi ve Yönlendirmeli',
        },
        {
          value: 'medium',
          labelEn: 'Medium — Casual Drop-In',
          labelTr: 'Orta — Serbest Katılım',
        },
        {
          value: 'low',
          labelEn: 'Low — Crowded / Unstructured',
          labelTr: 'Düşük — Kalabalık / Plansız',
        },
      ],
      defaultValue: 'high',
      sourceColumnHint: 'comfort',
    },
    {
      key: 'participant_mix',
      labelEn: 'Participant Group Balance',
      labelTr: 'Katılımcı Grup Dengesi',
      type: 'select',
      options: [
        {
          value: 'both',
          labelEn: 'Balanced Erasmus + Local',
          labelTr: 'Dengeli Erasmus + Yerel',
        },
        {
          value: 'erasmus',
          labelEn: 'Mostly Incoming Erasmus',
          labelTr: 'Ağırlıklı Erasmus Öğrencileri',
        },
        {
          value: 'local',
          labelEn: 'Mostly Local Volunteers',
          labelTr: 'Ağırlıklı Yerel Gönüllüler',
        },
      ],
      defaultValue: 'both',
      sourceColumnHint: 'cat1',
    },
    {
      key: 'activity_focus',
      labelEn: 'Primary Table Focus',
      labelTr: 'Ana Masa Etkinlik Odağı',
      type: 'select',
      options: [
        {
          value: 'mix',
          labelEn: 'Speed-Friending & Mixed Prompts',
          labelTr: 'Hızlı Tanışma ve Karma Sorular',
        },
        {
          value: 'social',
          labelEn: 'Open Social Conversation',
          labelTr: 'Açık Sosyal Sohbet',
        },
        {
          value: 'culture',
          labelEn: 'Cultural Exchange & Trivia',
          labelTr: 'Kültürel Değişim ve Bilgi Yarışması',
        },
        {
          value: 'language',
          labelEn: 'Dedicated Language Practice',
          labelTr: 'Odaklı Dil Pratiği',
        },
      ],
      defaultValue: 'mix',
      sourceColumnHint: 'cat2',
    },
    {
      key: 'guided_icebreakers',
      labelEn: 'Guided Prompt Cards & Table Rotation',
      labelTr: 'Yönlendirmeli Soru Kartları ve Masa Rotasyonu',
      type: 'boolean',
      defaultValue: true,
      sourceColumnHint: 'outcome',
    },
  ],
};

/**
 * Normalizes a custom `project.config.predictor` object so missing optional
 * properties fall back to clean defaults without crashing the UI.
 */
function normalizePredictorSchema(rawPredictor, projectSlug = 'custom') {
  const fields = Array.isArray(rawPredictor.fields) ? rawPredictor.fields : [];
  return {
    modelKey: rawPredictor.modelKey || `${projectSlug}_predictor`,
    version: rawPredictor.version || 'v1.0.0',
    isMock: rawPredictor.isMock ?? true,
    titleEn: rawPredictor.titleEn || rawPredictor.title || 'Retention Predictor',
    titleTr: rawPredictor.titleTr || rawPredictor.title || 'Bağlılık Tahminleyicisi',
    descriptionEn: rawPredictor.descriptionEn || rawPredictor.description || '',
    descriptionTr: rawPredictor.descriptionTr || rawPredictor.description || '',
    fields: fields.map((field) => ({
      key: String(field.key || '').trim(),
      labelEn: field.labelEn || field.label || field.key,
      labelTr: field.labelTr || field.label || field.key,
      type:
        field.type === 'select' || field.type === 'boolean'
          ? field.type
          : 'number',
      min: field.min ?? 0,
      max: field.max ?? 100,
      step: field.step ?? 1,
      options: Array.isArray(field.options)
        ? field.options.map((opt) =>
            typeof opt === 'object' && opt !== null
              ? {
                  value: String(opt.value ?? ''),
                  labelEn: opt.labelEn ?? opt.label ?? String(opt.value ?? ''),
                  labelTr: opt.labelTr ?? opt.label ?? String(opt.value ?? ''),
                }
              : {
                  value: String(opt),
                  labelEn: String(opt),
                  labelTr: String(opt),
                }
          )
        : [],
      defaultValue: field.defaultValue,
      sourceColumnHint: field.sourceColumnHint || field.key,
    })),
  };
}

/**
 * Resolves the active predictor schema for a given project:
 * 1. Returns `project.config.predictor` if explicitly configured on the project.
 * 2. Otherwise returns the demo Speaking Club schema ONLY when `project` matches
 *    Speaking Club (`speaking-club` / `speaking_club` / `ESN-SC-01`), returning
 *    `null` for all other projects so their empty state can be verified cleanly.
 */
export function getProjectModelSchema(project) {
  if (!project || typeof project !== 'object') {
    return null;
  }

  const configured = project?.config?.predictor;
  if (
    configured &&
    typeof configured === 'object' &&
    Array.isArray(configured.fields) &&
    configured.fields.length > 0
  ) {
    return normalizePredictorSchema(configured, project.slug || project.id);
  }

  const slugCandidate = String(project.slug || project.id || '')
    .trim()
    .toLowerCase();
  const codeCandidate = String(project.code || '')
    .trim()
    .toLowerCase();

  if (
    SPEAKING_CLUB_SLUGS.has(slugCandidate) ||
    SPEAKING_CLUB_CODES.has(codeCandidate)
  ) {
    return SPEAKING_CLUB_DEMO_SCHEMA;
  }

  return null;
}

/**
 * Clamps a number strictly into `[min, max]`.
 */
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Computes deterministic feature impacts (`-1..+1`) for the Speaking Club demo
 * schema or any generic custom `project.config.predictor` schema.
 */
function evaluateMockContributions(inputs = {}, schema = null) {
  const fields = Array.isArray(schema?.fields) ? schema.fields : [];
  const fieldMap = new Map(fields.map((field) => [field.key, field]));
  const contributions = [];

  // Dedicated domain-calibrated weights for the Speaking Club demo schema
  if (schema?.modelKey === 'speaking_club_retention_v1') {
    // 1. Satisfaction score (1..5 centered around 3.4)
    const rawScore = Number(inputs.satisfaction_score);
    const score = Number.isFinite(rawScore) ? clamp(rawScore, 1, 5) : 4.2;
    const scoreImpact = clamp((score - 3.4) / 1.6, -0.95, 0.95);
    contributions.push({
      key: 'satisfaction_score',
      labelEn: 'Session Satisfaction Score',
      labelTr: 'Oturum Memnuniyet Puanı',
      impact: Number(scoreImpact.toFixed(2)),
    });

    // 2. Social comfort level
    const comfort = String(inputs.comfort_level ?? 'high').toLowerCase();
    const comfortImpact =
      comfort === 'high' ? 0.62 : comfort === 'medium' ? 0.08 : -0.74;
    contributions.push({
      key: 'comfort_level',
      labelEn: 'Social Comfort Environment',
      labelTr: 'Sosyal Konfor Ortamı',
      impact: comfortImpact,
    });

    // 3. Participant mix balance
    const mix = String(inputs.participant_mix ?? 'both').toLowerCase();
    const mixImpact = mix === 'both' ? 0.48 : mix === 'erasmus' ? -0.16 : -0.24;
    contributions.push({
      key: 'participant_mix',
      labelEn: 'Erasmus & Local Mix Balance',
      labelTr: 'Erasmus ve Yerel Katılımcı Dengesi',
      impact: mixImpact,
    });

    // 4. Expected group size (sweet spot 18..38)
    const rawSize = Number(inputs.expected_group_size);
    const size = Number.isFinite(rawSize) ? clamp(rawSize, 6, 120) : 28;
    let sizeImpact;
    if (size >= 18 && size <= 38) {
      sizeImpact = 0.36;
    } else if (size > 38 && size <= 55) {
      sizeImpact = -0.14;
    } else if (size > 55) {
      sizeImpact = clamp(-0.28 - (size - 55) / 95, -0.72, -0.28);
    } else if (size < 12) {
      sizeImpact = -0.22;
    } else {
      sizeImpact = 0.14;
    }
    contributions.push({
      key: 'expected_group_size',
      labelEn: 'Expected Attendance Size',
      labelTr: 'Beklenen Grup Boyutu',
      impact: Number(sizeImpact.toFixed(2)),
    });

    // 5. Guided icebreakers boolean
    const guided = Boolean(inputs.guided_icebreakers);
    contributions.push({
      key: 'guided_icebreakers',
      labelEn: 'Guided Prompt Cards & Rotation',
      labelTr: 'Yönlendirmeli Kartlar ve Rotasyon',
      impact: guided ? 0.41 : -0.32,
    });

    // 6. Primary table activity focus
    const focus = String(inputs.activity_focus ?? 'mix').toLowerCase();
    const focusImpact =
      focus === 'mix'
        ? 0.29
        : focus === 'culture'
          ? 0.22
          : focus === 'social'
            ? 0.15
            : -0.09;
    contributions.push({
      key: 'activity_focus',
      labelEn: 'Table Activity Structure',
      labelTr: 'Masa Etkinlik Yapısı',
      impact: focusImpact,
    });

    return contributions;
  }

  // Generic deterministic fallback for custom `project.config.predictor` schemas
  for (const field of fields) {
    const val = inputs[field.key];
    const meta = fieldMap.get(field.key) || field;
    let impact = 0;

    if (meta.type === 'number') {
      const min = Number.isFinite(Number(meta.min)) ? Number(meta.min) : 0;
      const max = Number.isFinite(Number(meta.max)) ? Number(meta.max) : 100;
      const span = max - min || 1;
      const num = Number.isFinite(Number(val)) ? Number(val) : (min + max) / 2;
      const normalized = (num - min) / span;
      impact = clamp((normalized - 0.5) * 1.4, -0.85, 0.85);
    } else if (meta.type === 'boolean') {
      impact = val ? 0.42 : -0.34;
    } else if (meta.type === 'select') {
      const opts = meta.options ?? [];
      const idx = opts.findIndex((opt) => String(opt.value) === String(val));
      if (idx === 0) {
        impact = 0.46;
      } else if (idx === opts.length - 1 && opts.length > 1) {
        impact = -0.44;
      } else {
        impact = 0.12;
      }
    }

    contributions.push({
      key: meta.key,
      labelEn: meta.labelEn || meta.key,
      labelTr: meta.labelTr || meta.key,
      impact: Number(impact.toFixed(2)),
    });
  }

  return contributions;
}

/**
 * Runs a scenario prediction against the specified model key and input payload.
 * Returns `{ verdict, probability, model_version, isMock, top_factors }`.
 */
export async function runPrediction(modelKey, inputs = {}, schema = null) {
  // TODO (Phase 6.2): Swap to fetch(`${import.meta.env.VITE_ML_API_URL}/predict`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ model_key: modelKey, inputs }),
  // }) once the FastAPI microservice in `ml-api/` is deployed.

  // Simulate a brief network round-trip (~450ms) to exercise loading states cleanly
  await new Promise((resolve) => setTimeout(resolve, 450));

  const allContributions = evaluateMockContributions(inputs, schema);

  // Convert signed feature impacts into a realistic bounded probability (12..97%)
  const totalSignal = allContributions.reduce(
    (sum, item) => sum + item.impact * 19.5,
    54
  );
  const probability = Math.round(clamp(totalSignal, 12, 97));

  let verdict = 'neutral';
  if (probability >= 68) {
    verdict = 'likely_return';
  } else if (probability < 46) {
    verdict = 'at_risk';
  }

  // Rank top contributing factors by absolute impact magnitude
  const top_factors = [...allContributions]
    .sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact))
    .slice(0, 5);

  return {
    verdict,
    probability,
    model_version: schema?.version || (modelKey ? `${modelKey}@mock` : 'v1.0.0-mock'),
    isMock: true,
    top_factors,
  };
}
